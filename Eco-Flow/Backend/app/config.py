import os 
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'development-key'
    POSTGRES_URI = os.environ.get('POSTGRES_URI') or 'postgresql://localhost/ecoflow'
    # Configuración para OpenStreetMap
    OSM_BASE_URL = 'https://nominatim.openstreetmap.org'
    # Configuración para MQTT
    MQTT_BROKER = os.environ.get('MQTT_BROKER') or 'localhost'
    MQTT_PORT = int(os.environ.get('MQTT_PORT') or 1883)
    # Límites de uso para APIs
    REQUEST_RATE_LIMIT = 1  # segundos entre peticiones para APIs externas