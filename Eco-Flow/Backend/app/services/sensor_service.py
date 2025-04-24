from datetime import datetime, timedelta
import random
from app.models.sensor import SensorReading

# Simulación de almacenamiento de sensores para MVP
# En una implementación real, esto se almacenaría en PostgreSQL o Firebase
sensor_data_store = {}

def process_sensor_data(data):
    """
    Procesa los datos recibidos de sensores IoT.
    
    Args:
        data: Diccionario con sensor_id y readings
        
    Returns:
        Resultado del procesamiento
    """
    sensor_id = data['sensor_id']
    readings = data['readings']
    
    # Inicializar almacenamiento para este sensor si no existe
    if sensor_id not in sensor_data_store:
        sensor_data_store[sensor_id] = []
    
    processed_readings = []
    
    for reading in readings:
        # Validar lectura
        if 'value' not in reading:
            continue
            
        # Crear objeto de lectura
        sensor_reading = SensorReading(
            sensor_id=sensor_id,
            value=reading['value'],
            timestamp=reading.get('timestamp', datetime.now().isoformat()),
            location=reading.get('location'),
            type=reading.get('type', 'generic')
        )
        
        # Guardar en almacenamiento temporal
        sensor_data_store[sensor_id].append(sensor_reading.to_dict())
        processed_readings.append(sensor_reading.to_dict())
    
    # Limitar tamaño del almacenamiento (solo para MVP)
    if len(sensor_data_store[sensor_id]) > 1000:
        sensor_data_store[sensor_id] = sensor_data_store[sensor_id][-1000:]
    
    return {
        'processed_count': len(processed_readings),
        'readings': processed_readings
    }

def get_sensor_history(sensor_id, start_date=None, end_date=None):
    """
    Obtiene el historial de lecturas de un sensor.
    
    Args:
        sensor_id: ID del sensor
        start_date: Fecha de inicio (formato ISO)
        end_date: Fecha de fin (formato ISO)
        
    Returns:
        Lista de lecturas del sensor
    """
    # Verificar si existen datos para este sensor
    if sensor_id not in sensor_data_store:
        # Para MVP, generar datos aleatorios si no hay datos reales
        return generate_mock_sensor_data(sensor_id, start_date, end_date)
    
    # Filtrar por fechas si es necesario
    readings = sensor_data_store[sensor_id]
    
    if start_date:
        readings = [r for r in readings if r['timestamp'] >= start_date]
    
    if end_date:
        readings = [r for r in readings if r['timestamp'] <= end_date]
    
    return readings

def generate_mock_sensor_data(sensor_id, start_date=None, end_date=None):
    """
    Genera datos simulados para un sensor (solo para MVP).
    """
    if not start_date:
        start_date = (datetime.now() - timedelta(days=7)).isoformat()
    
    if not end_date:
        end_date = datetime.now().isoformat()
    
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Generar puntos cada hora
    current = start
    mock_data = []
    
    while current <= end:
        # Valores aleatorios según tipo de sensor (ejemplo)
        value = None
        if 'traffic' in sensor_id:
            value = random.randint(0, 100)  # densidad de tráfico (0-100%)
        elif 'pollution' in sensor_id:
            value = random.uniform(0, 50)  # PM2.5 (0-50 µg/m³)
        elif 'noise' in sensor_id:
            value = random.uniform(40, 90)  # nivel de ruido (40-90 dB)
        else:
            value = random.uniform(0, 100)  # valor genérico
        
        reading = SensorReading(
            sensor_id=sensor_id,
            value=value,
            timestamp=current.isoformat(),
            location={
                'lat': 19.432608 + random.uniform(-0.01, 0.01),  # Ejemplo: CDMX
                'lon': -99.133209 + random.uniform(-0.01, 0.01)
            },
            type=sensor_id.split('_')[0] if '_' in sensor_id else 'generic'
        )
        
        mock_data.append(reading.to_dict())
        current += timedelta(hours=1)
    
    return mock_data