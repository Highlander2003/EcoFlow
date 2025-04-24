import requests
import time
from flask import current_app

def get_coordinates(query):
    """
    Obtiene coordenadas a partir de una consulta de texto utilizando OpenStreetMap Nominatim.
    
    Args:
        query: Texto de búsqueda (dirección, lugar, etc.)
        
    Returns:
        Lista de lugares con sus coordenadas
    """
    base_url = current_app.config['OSM_BASE_URL']
    
    # Añadir retraso para respetar la política de uso justo de Nominatim
    time.sleep(current_app.config.get('REQUEST_RATE_LIMIT', 1))
    
    params = {
        'q': query,
        'format': 'json',
        'limit': 5
    }
    
    response = requests.get(f"{base_url}/search", params=params, headers={
        'User-Agent': 'EcoFlow-App/1.0'
    })
    
    if response.status_code != 200:
        raise Exception(f"Error al consultar OpenStreetMap: {response.status_code}")
    
    results = response.json()
    
    places = []
    for place in results:
        places.append({
            'name': place.get('display_name', ''),
            'lat': float(place.get('lat', 0)),
            'lon': float(place.get('lon', 0)),
            'type': place.get('type', '')
        })
    
    return places

def calculate_route(origin, destination, vehicle_type='car'):
    """
    Calcula una ruta entre dos puntos usando OSRM (Open Source Routing Machine).
    
    Args:
        origin: Coordenadas de origen [lat, lon]
        destination: Coordenadas de destino [lat, lon]
        vehicle_type: Tipo de vehículo
        
    Returns:
        Detalles de la ruta
    """
    # En una implementación real, conectaríamos con un servicio OSRM
    # Ejemplo: http://router.project-osrm.org/route/v1/driving/13.388860,52.517037;13.397634,52.529407
    
    # Para MVP, devolvemos datos simulados
    
    # Para respetar la política de uso justo
    time.sleep(current_app.config.get('REQUEST_RATE_LIMIT', 1))
    
    # Cálculo simplificado de distancia entre puntos
    # En una implementación real, esto vendría de la API de enrutamiento
    o_lat, o_lon = origin['lat'], origin['lon']
    d_lat, d_lon = destination['lat'], destination['lon']
    
    # Distancia euclidiana aproximada en km
    distance = ((o_lat - d_lat)**2 + (o_lon - d_lon)**2)**0.5 * 111
    
    # Velocidad promedio según tipo de vehículo
    speeds = {
        'car': 50,      # km/h
        'bike': 15,     # km/h
        'walk': 5,      # km/h
        'bus': 30       # km/h
    }
    speed = speeds.get(vehicle_type, 40)
    
    # Tiempo estimado en minutos
    duration = (distance / speed) * 60
    
    # Emisiones de CO2 simuladas
    emissions = {
        'car': 120,     # g/km
        'bike': 0,      # g/km
        'walk': 0,      # g/km
        'bus': 80       # g/km
    }
    emission = emissions.get(vehicle_type, 100) * distance / 1000  # en kg
    
    # Generar algunos puntos intermedios para la ruta
    steps = 10
    path = []
    
    for i in range(steps + 1):
        path.append({
            'lat': o_lat + (d_lat - o_lat) * (i / steps),
            'lon': o_lon + (d_lon - o_lon) * (i / steps)
        })
    
    return {
        'distance': round(distance, 2),  # km
        'duration': round(duration, 2),  # minutos
        'emissions': round(emission, 2),  # kg CO2
        'path': path
    }