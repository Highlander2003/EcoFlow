# backend/data_processing/iot_processor.py
import paho.mqtt.client as mqtt
import json
import time
import logging
from datetime import datetime
from google.cloud import firestore

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IoTProcessor:
    def __init__(self, graph_manager):
        """
        Inicializa el procesador IoT
        :param graph_manager: Instancia de CityGraph para actualizar datos
        """
        self.graph_manager = graph_manager
        self.db = firestore.Client(project='ecoflow-cali')
        self.sensor_registry = {}
        
        # Configuración MQTT
        self.mqtt_client = mqtt.Client(client_id="ecoflow-iot-processor")
        self.mqtt_client.on_connect = self._on_mqtt_connect
        self.mqtt_client.on_message = self._on_mqtt_message
        
        self.mqtt_config = {
            'host': 'mqtt.ecoflow-cali.com',
            'port': 8883,
            'keepalive': 60,
            'topic': 'ecoflow/sensors/#',
            'username': 'iot-user',
            'password': 'secure-password-123'
        }

    def connect(self):
        """Conectar al broker MQTT con seguridad TLS"""
        self.mqtt_client.username_pw_set(
            self.mqtt_config['username'],
            self.mqtt_config['password']
        )
        self.mqtt_client.tls_set()
        self.mqtt_client.connect(
            self.mqtt_config['host'],
            self.mqtt_config['port'],
            self.mqtt_config['keepalive']
        )
        logger.info("Conectando al broker MQTT...")

    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """Callback para conexión MQTT"""
        if rc == 0:
            logger.info("Conexión MQTT establecida")
            client.subscribe(self.mqtt_config['topic'], qos=1)
        else:
            logger.error(f"Error de conexión MQTT: Código {rc}")

    def _on_mqtt_message(self, client, userdata, msg):
        """Procesa mensajes MQTT entrantes"""
        try:
            payload = json.loads(msg.payload.decode())
            logger.debug(f"Mensaje recibido: {msg.topic}")
            
            # Verificar formato del mensaje
            if self._validate_sensor_data(payload):
                self._process_sensor_data(payload)
                
        except json.JSONDecodeError:
            logger.error("Mensaje JSON inválido")
        except Exception as e:
            logger.error(f"Error procesando mensaje: {str(e)}")

    def _validate_sensor_data(self, data: dict) -> bool:
        """Valida la estructura de los datos del sensor"""
        required_fields = {
            'sensor_id': str,
            'timestamp': (int, float),
            'location': dict,
            'measurements': dict
        }
        
        for field, dtype in required_fields.items():
            if field not in data:
                logger.error(f"Campo faltante: {field}")
                return False
            if not isinstance(data[field], dtype):
                logger.error(f"Tipo incorrecto para {field}")
                return False
                
        return True

    def _process_sensor_data(self, data: dict):
        """Procesa y almacena datos de sensores"""
        sensor_id = data['sensor_id']
        
        # Actualizar registro de sensores
        self._update_sensor_registry(sensor_id, data)
        
        # Almacenar en Firestore
        self._store_in_firestore(data)
        
        # Actualizar modelo de tráfico
        self._update_traffic_model(data)

    def _update_sensor_registry(self, sensor_id: str, data: dict):
        """Mantiene un registro de estado de los sensores"""
        self.sensor_registry[sensor_id] = {
            'last_seen': datetime.utcnow(),
            'location': data['location'],
            'status': 'active'
        }

    def _store_in_firestore(self, data: dict):
        """Almacena datos en Firestore con estructura organizada"""
        doc_ref = self.db.collection('sensor_data').document(data['sensor_id'])
        
        sensor_data = {
            'timestamp': datetime.utcfromtimestamp(data['timestamp']),
            'location': firestore.GeoPoint(
                data['location']['lat'],
                data['location']['lon']
            ),
            'measurements': data['measurements']
        }
        
        # Actualización atómica
        doc_ref.set(sensor_data, merge=True)
        logger.info(f"Datos almacenados para sensor {data['sensor_id']}")

    def _update_traffic_model(self, data: dict):
        """Actualiza el modelo de tráfico con datos del sensor"""
        try:
            measurements = data['measurements']
            
            # Actualizar congestión basada en velocidad
            if 'speed' in measurements:
                edge = self._find_nearest_edge(data['location'])
                if edge:
                    congestion = self._calculate_congestion(
                        measurements['speed'],
                        edge['speed_limit']
                    )
                    self.graph_manager.update_traffic({
                        edge['edge']: congestion
                    })
                    
            # Actualizar calidad del aire
            if 'co2' in measurements:
                self._update_air_quality_map(
                    data['location'],
                    measurements['co2']
                )
                
        except Exception as e:
            logger.error(f"Error actualizando modelo: {str(e)}")

    def _find_nearest_edge(self, location: dict) -> Optional[dict]:
        """Encuentra la arista más cercana usando el grafo"""
        point = (location['lat'], location['lon'])
        
        try:
            edge = ox.distance.nearest_edges(
                self.graph_manager.graph,
                X=[point[1]],  # Longitud
                Y=[point[0]],  # Latitud
                return_dist=False
            )
            return {
                'edge': edge[0],
                'speed_limit': self.graph_manager.graph[edge[0][0]][edge[0][1]][0]['speed_kph']
            }
        except Exception as e:
            logger.warning(f"No se encontró arista cercana: {str(e)}")
            return None

    def _calculate_congestion(self, current_speed: float, speed_limit: float) -> float:
        """Calcula nivel de congestión (0-1)"""
        if speed_limit <= 0 or current_speed < 0:
            return 0.0
        return max(0.0, 1.0 - (current_speed / speed_limit))

    def _update_air_quality_map(self, location: dict, co2_level: float):
        """Actualiza el mapa de calidad del aire en Firestore"""
        doc_ref = self.db.collection('air_quality').document()
        doc_ref.set({
            'location': firestore.GeoPoint(location['lat'], location['lon']),
            'co2': co2_level,
            'timestamp': datetime.utcnow()
        })

    def start_processing(self):
        """Inicia el loop de procesamiento MQTT"""
        self.mqtt_client.loop_start()
        logger.info("Procesamiento IoT iniciado")

    def stop_processing(self):
        """Detiene el procesamiento y libera recursos"""
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()
        logger.info("Procesamiento IoT detenido")

# Uso en el sistema principal
if __name__ == "__main__":
    from graph_routes import CityGraph
    
    # Inicializar componentes
    cali_graph = CityGraph()
    cali_graph.initialize_graph()
    
    iot_processor = IoTProcessor(cali_graph)
    
    try:
        iot_processor.connect()
        iot_processor.start_processing()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        iot_processor.stop_processing()
    except Exception as e:
        logger.error(f"Error crítico: {str(e)}")
        iot_processor.stop_processing()