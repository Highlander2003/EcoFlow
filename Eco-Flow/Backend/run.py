from flask import Flask, request, jsonify
from flask_cors import CORS
import networkx as nx
import random
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)  # Esto es crucial

# Puedes acceder a las variables así:
port = int(os.getenv('FLASK_PORT', 5000))
emissions_per_km = {
    "car": float(os.getenv('EMISSIONS_CAR', 0.12)),
    "bike": float(os.getenv('EMISSIONS_BIKE', 0)),
    "walk": float(os.getenv('EMISSIONS_WALK', 0))
}

# Cargar datos de ejemplo de puntos de interés
with open('data/points_of_interest.json', 'r', encoding='utf-8') as f:
    points_of_interest = json.load(f)

# Definir emisiones por tipo de vehículo (kg CO2 por km)
emissions_per_km = {
    "car": 0.12,
    "bike": 0,
    "walk": 0
}

# Función para calcular distancias euclidianas
def calculate_distance(point1, point2):
    return ((point1["lat"] - point2["lat"])**2 + (point1["lon"] - point2["lon"])**2)**0.5 * 111.32  # Aproximación a km

# Ruta de búsqueda
@app.route('/api/routes/search', methods=['GET'])
def search_route():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify({"places": []})
    
    # Filtrar puntos de interés que coincidan con la consulta
    results = [
        place for place in points_of_interest 
        if query in place["name"].lower()
    ]
    
    return jsonify({"places": results[:10]})  # Limitar a 10 resultados

# Ruta para calcular ruta entre dos puntos
@app.route('/api/routes/calculate', methods=['POST'])
def calculate_route():
    data = request.json
    origin = data.get('origin')
    destination = data.get('destination')
    vehicle_type = data.get('vehicle_type', 'car')
    
    if not origin or not destination:
        return jsonify({"error": "Se requieren origen y destino"}), 400
    
    # Calcular distancia
    distance = calculate_distance(origin, destination)
    
    # Calcular duración (simulada)
    speeds = {"car": 50, "bike": 15, "walk": 5}  # km/h
    duration = (distance / speeds.get(vehicle_type, 40)) * 60  # Convertir a minutos
    
    # Calcular emisiones
    emissions = distance * emissions_per_km.get(vehicle_type, 0)
    
    # Generar una ruta simulada
    steps = 10
    path = []
    for i in range(steps + 1):
        ratio = i / steps
        path.append({
            "lat": origin["lat"] + (destination["lat"] - origin["lat"]) * ratio,
            "lon": origin["lon"] + (destination["lon"] - origin["lon"]) * ratio
        })
    
    result = {
        "route": {
            "origin": origin,
            "destination": destination,
            "distance": distance,
            "duration": duration,
            "emissions": emissions,
            "path": path
        }
    }
    
    return jsonify(result)

# Ruta para optimizar rutas con múltiples paradas
@app.route('/api/routes/optimize', methods=['POST'])
def optimize_route():
    data = request.json
    waypoints = data.get('waypoints', [])
    vehicle_type = data.get('vehicle_type', 'car')
    optimization_criteria = data.get('optimization_criteria', 'distance')
    
    if len(waypoints) < 3:
        return jsonify({"error": "Se requieren al menos 3 waypoints para optimizar"}), 400
    
    # Crear un grafo completo con distancias entre todos los puntos
    G = nx.complete_graph(len(waypoints))
    for i in range(len(waypoints)):
        for j in range(i+1, len(waypoints)):
            dist = calculate_distance(waypoints[i], waypoints[j])
            G[i][j]['weight'] = dist
    
    # Encontrar el recorrido óptimo (utilizamos TSP con el primer y último waypoint fijos)
    # Simplificado para este ejemplo
    path_indices = [0]  # Empezar con el primer waypoint
    remaining = list(range(1, len(waypoints) - 1))
    
    # Algoritmo greedy simple (para simulación)
    current = 0
    while remaining:
        next_idx = min(remaining, key=lambda x: G[current][x]['weight'])
        path_indices.append(next_idx)
        current = next_idx
        remaining.remove(next_idx)
    
    path_indices.append(len(waypoints) - 1)  # Terminar con el último waypoint
    
    # Calcular la ruta optimizada
    optimized_waypoints = [waypoints[i] for i in path_indices]
    
    # Calcular distancia y duración total
    total_distance = sum(calculate_distance(optimized_waypoints[i], optimized_waypoints[i+1]) 
                          for i in range(len(optimized_waypoints) - 1))
    
    # Calcular duración total
    speeds = {"car": 50, "bike": 15, "walk": 5}  # km/h
    total_duration = (total_distance / speeds.get(vehicle_type, 40)) * 60  # Convertir a minutos
    
    # Calcular emisiones
    total_emissions = total_distance * emissions_per_km.get(vehicle_type, 0)
    
    # Generar una ruta detallada entre todos los waypoints
    detailed_path = []
    for i in range(len(optimized_waypoints) - 1):
        origin = optimized_waypoints[i]
        destination = optimized_waypoints[i+1]
        steps = 5
        for j in range(steps + 1):
            if j == 0 and i > 0:  # Evitar duplicar puntos
                continue
            ratio = j / steps
            detailed_path.append({
                "lat": origin["lat"] + (destination["lat"] - origin["lat"]) * ratio,
                "lon": origin["lon"] + (destination["lon"] - origin["lon"]) * ratio
            })
    
    result = {
        "route": {
            "waypoints": optimized_waypoints,
            "total_distance": total_distance,
            "estimated_time": total_duration,
            "emissions": total_emissions,
            "path": detailed_path
        }
    }
    
    return jsonify(result)

# Ruta para datos de sensores (simulado)
@app.route('/api/sensors/history/<sensor_id>', methods=['GET'])
def sensor_history(sensor_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Generar datos simulados
    data = []
    start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Generar 24 horas de datos para el día actual
    for hour in range(24):
        timestamp = start.replace(hour=hour).isoformat()
        value = random.randint(20, 85)  # Valor aleatorio de calidad del aire
        data.append({
            "timestamp": timestamp,
            "value": value,
            "unit": "µg/m³"
        })
    
    return jsonify({"data": data})

# Punto de entrada para ejecución directa
if __name__ == '__main__':
    # Crear carpeta de datos si no existe
    if not os.path.exists('data'):
        os.makedirs('data')
    
    # Si no existe el archivo de puntos de interés, generar datos de ejemplo
    if not os.path.exists('data/points_of_interest.json'):
        # Generar algunos puntos de interés de ejemplo (simulados para Bogotá)
        example_places = [
            {"name": "Plaza de Bolívar", "lat": 4.5981, "lon": -74.0758, "type": "landmark"},
            {"name": "Parque Simón Bolívar", "lat": 4.6582, "lon": -74.0942, "type": "park"},
            {"name": "Museo del Oro", "lat": 4.6018, "lon": -74.0705, "type": "museum"},
            {"name": "Biblioteca Luis Ángel Arango", "lat": 4.5985, "lon": -74.0742, "type": "library"},
            {"name": "Monserrate", "lat": 4.6057, "lon": -74.0565, "type": "landmark"},
            {"name": "Torre Colpatria", "lat": 4.6126, "lon": -74.0691, "type": "landmark"},
            {"name": "La Candelaria", "lat": 4.5964, "lon": -74.0741, "type": "neighborhood"},
            {"name": "Universidad Nacional", "lat": 4.6365, "lon": -74.0847, "type": "university"},
            {"name": "Jardín Botánico", "lat": 4.6669, "lon": -74.0994, "type": "park"},
            {"name": "Catedral Primada", "lat": 4.5986, "lon": -74.0758, "type": "religious"},
            {"name": "Estadio El Campín", "lat": 4.6470, "lon": -74.0779, "type": "stadium"},
            {"name": "Parque de la 93", "lat": 4.6769, "lon": -74.0480, "type": "park"},
            {"name": "Avenida Carrera Séptima", "lat": 4.6097, "lon": -74.0682, "type": "avenue"},
            {"name": "Zona T", "lat": 4.6679, "lon": -74.0548, "type": "neighborhood"},
            {"name": "Centro Andino", "lat": 4.6672, "lon": -74.0535, "type": "shopping"}
        ]
        
        with open('data/points_of_interest.json', 'w', encoding='utf-8') as f:
            json.dump(example_places, f, ensure_ascii=False, indent=2)
    
    # Iniciar la aplicación Flask
    app.run(host='0.0.0.0', debug=True)