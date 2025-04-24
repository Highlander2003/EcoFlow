from datetime import datetime

class SensorReading:
    """
    Modelo para representar la lectura de un sensor en el sistema.
    """
    
    def __init__(self, sensor_id, value, timestamp=None, location=None, type='generic'):
        self.sensor_id = sensor_id
        self.value = value
        self.timestamp = timestamp or datetime.now().isoformat()
        self.location = location  # coordenadas [lat, lon]
        self.type = type  # ejemplo: 'traffic', 'pollution', 'noise'
    
    def to_dict(self):
        """Convierte el objeto a un diccionario para la API"""
        return {
            'sensor_id': self.sensor_id,
            'value': self.value,
            'timestamp': self.timestamp,
            'location': self.location,
            'type': self.type
        }