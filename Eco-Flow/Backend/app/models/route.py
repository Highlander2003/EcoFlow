class Route:
    """
    Modelo para representar una ruta en el sistema.
    """
    
    def __init__(self, waypoints, vehicle_type='car'):
        self.waypoints = waypoints
        self.vehicle_type = vehicle_type
        self.total_distance = 0
        self.estimated_time = 0
        self.emissions = 0
        self.path = []
    
    def to_dict(self):
        """Convierte el objeto a un diccionario para la API"""
        return {
            'waypoints': self.waypoints,
            'vehicle_type': self.vehicle_type,
            'total_distance': self.total_distance,
            'estimated_time': self.estimated_time,
            'emissions': self.emissions,
            'path': self.path
        }