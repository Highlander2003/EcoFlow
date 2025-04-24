from datetime import datetime
import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia entre dos puntos geográficos en kilómetros
    usando la fórmula de Haversine.
    """
    # Radio de la Tierra en kilómetros
    R = 6371.0
    
    # Convertir coordenadas de grados a radianes
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Diferencias en coordenadas
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # Fórmula de Haversine
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    # Distancia en kilómetros
    distance = R * c
    
    return distance

def format_datetime(dt_str):
    """
    Formatea una cadena de fecha ISO a un formato más legible.
    """
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime('%d/%m/%Y %H:%M:%S')
    except:
        return dt_str

def calculate_emissions(distance, vehicle_type):
    """
    Calcula las emisiones de CO2 en kg para una distancia y tipo de vehículo.
    """
    emissions_factor = {
        'car': 0.12,      # kg CO2/km (promedio)
        'bike': 0,        # kg CO2/km
        'walk': 0,        # kg CO2/km
        'bus': 0.08,      # kg CO2/km (por pasajero)
        'truck': 0.3,     # kg CO2/km
        'train': 0.04     # kg CO2/km (por pasajero)
    }
    
    factor = emissions_factor.get(vehicle_type, 0.12)
    return round(distance * factor, 2)