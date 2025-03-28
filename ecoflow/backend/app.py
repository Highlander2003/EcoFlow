# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from algorithms.genetic_algorithm import RouteOptimizer
from algorithms.graph_routes import CityGraph
from data_processing.iot_processor import IoTProcessor
import paho.mqtt.client as mqtt
import networkx as nx
import osmnx as ox
import threading
import time
import random

# Inicialización de la aplicación Flask
app = Flask(__name__)
CORS(app)  # Habilitar CORS para todas las rutas

# Simulador de tráfico en tiempo real
def traffic_simulator():
    """Actualiza periódicamente los niveles de congestión"""
    while True:
        try:
            # Actualizar un 10% aleatorio de las aristas
            edges = list(cali_graph.graph.edges(keys=True))
            sample_size = max(1, len(edges) // 10)
            traffic_update = {
                edge: random.uniform(0, 0.9) 
                for edge in random.sample(edges, sample_size)
            }
            
            cali_graph.update_traffic(traffic_update)
            print(f"🛣️ Tráfico actualizado en {sample_size} vías")
            
        except Exception as e:
            print(f"⚠️ Error en simulador de tráfico: {str(e)}")
        
        time.sleep(300)  # Actualizar cada 5 minutos

# Después de inicializar el grafo
iot_processor = IoTProcessor(cali_graph)
iot_processor.connect()
iot_processor.start_processing()

# Iniciar hilo para simulación de tráfico
traffic_thread = threading.Thread(target=traffic_simulator)
traffic_thread.daemon = True
traffic_thread.start()

# Endpoints de la API
@app.route('/health', methods=['GET'])
def health_check():
    """Verificar estado del servicio"""
    return jsonify({
        "status": "OK",
        "nodes": len(cali_graph.graph.nodes),
        "edges": len(cali_graph.graph.edges)
    })

@app.route('/optimize', methods=['POST'])
def optimize_route():
    """Endpoint principal para optimización de rutas"""
    try:
        data = request.json
        
        # Validación básica de entrada
        required_fields = ['start', 'end']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Faltan campos requeridos"}), 400
        
        # Configurar optimizador
        optimizer = RouteOptimizer(
            graph=cali_graph.graph,
            traffic_data=cali_graph.traffic_data,
            co2_factors={
                'bus': 0.12,      # Autobús diésel
                'electric_bus': 0.05,
                'car': 0.18
            }
        )
        
        # Ejecutar optimización
        best_route = optimizer.optimize(
            start=data['start'],
            end=data['end']
        )
        
        # Obtener metadatos detallados
        metadata = cali_graph.get_route_metadata(best_route['nodes'])
        
        return jsonify({
            "status": "success",
            "route": best_route['nodes'],
            "metrics": metadata
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/map_data', methods=['GET'])
def get_map_data():
    """Obtener datos para visualización del mapa"""
    try:
        # Limitar datos para mejor rendimiento
        nodes = [
            {
                "id": node,
                "lat": cali_graph.graph.nodes[node]['y'],
                "lon": cali_graph.graph.nodes[node]['x']
            }
            for node in list(cali_graph.graph.nodes())[:1000]
        ]
        
        edges = [
            {
                "from": u,
                "to": v,
                "congestion": cali_graph.traffic_data.get((u, v, 0), {}).get('congestion', 0)
            }
            for u, v, _ in list(cali_graph.graph.edges(keys=True))[:1000]
        ]
        
        return jsonify({
            "status": "success",
            "nodes": nodes,
            "edges": edges
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)