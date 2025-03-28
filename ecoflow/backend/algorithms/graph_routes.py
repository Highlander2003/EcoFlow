# algorithms/graph_routes.py
import networkx as nx
import osmnx as ox
import heapq
import time
import random
from typing import Dict, List, Optional

class CityGraph:
    def __init__(self, city_name: str = "Cali, Colombia"):
        """
        Gestiona el grafo de la ciudad y operaciones relacionadas con rutas
        :param city_name: Nombre de la ciudad para cargar desde OpenStreetMap
        """
        self.city_name = city_name
        self.graph = nx.DiGraph()
        self.traffic_data: Dict[tuple, Dict] = {}
        self.coefficients = {
            'distance': 0.5,   # Peso para distancia
            'co2': 0.3,        # Peso para emisiones
            'time': 0.2        # Peso para tiempo
        }

    def initialize_graph(self, network_type: str = 'drive') -> None:
        """
        Carga el grafo de la ciudad desde OpenStreetMap
        :param network_type: Tipo de red ('drive', 'walk', 'bike')
        """
        try:
            self.graph = ox.graph_from_place(
                self.city_name, 
                network_type=network_type,
                simplify=True
            )
            self._add_speed_attributes()
            self._initialize_traffic_data()
            print(f"Grafo cargado: {len(self.graph.nodes)} nodos, {len(self.graph.edges)} aristas")
        except Exception as e:
            print(f"Error al cargar el grafo: {str(e)}")
            self.graph = nx.DiGraph()

    def _add_speed_attributes(self) -> None:
        """Agrega atributos de velocidad estimada a las aristas"""
        default_speed = {
            'residential': 30,   # km/h
            'primary': 50,
            'secondary': 40,
            'tertiary': 35
        }
        
        for u, v, data in self.graph.edges(data=True):
            road_type = data.get('highway', 'residential')
            if isinstance(road_type, list):
                road_type = road_type[0]
            data['speed_kph'] = default_speed.get(road_type, 30)

    def _initialize_traffic_data(self) -> None:
        """Inicializa datos de tráfico simulados"""
        for u, v, k in self.graph.edges(keys=True):
            self.traffic_data[(u, v, k)] = {
                'congestion': random.uniform(0, 0.3),  # Congestión inicial 0-30%
                'last_updated': time.time()
            }

    def update_traffic(self, updates: Dict[tuple, float]) -> None:
        """
        Actualiza los niveles de congestión de las aristas
        :param updates: Diccionario con {(u, v, key): congestion}
        """
        for edge, congestion in updates.items():
            if edge in self.traffic_data:
                self.traffic_data[edge]['congestion'] = max(0, min(1, congestion))
                self.traffic_data[edge]['last_updated'] = time.time()

    def calculate_edge_cost(self, u: int, v: int, vehicle_type: str = 'bus') -> float:
        """
        Calcula el costo compuesto de una arista
        :return: Costo normalizado combinando distancia, CO2 y tiempo
        """
        try:
            edge_data = self.graph[u][v][0]
            traffic = self.traffic_data.get((u, v, 0), {'congestion': 0})
            
            # Componentes individuales
            distance_km = edge_data['length'] / 1000
            speed = edge_data['speed_kph'] * (1 - traffic['congestion'])
            time_h = distance_km / speed if speed > 0 else 0
            co2_kg = distance_km * self._get_co2_factor(vehicle_type)
            
            # Normalización
            max_values = {
                'distance': 5,   # 5 km máximo por arista
                'time': 0.5,     # 0.5 horas (30 min)
                'co2': 2.0       # 2 kg CO2
            }
            
            # Cálculo de costo compuesto
            return (
                self.coefficients['distance'] * (distance_km / max_values['distance']) +
                self.coefficients['time'] * (time_h / max_values['time']) +
                self.coefficients['co2'] * (co2_kg / max_values['co2'])
            )
        except KeyError:
            return float('inf')

    def _get_co2_factor(self, vehicle_type: str) -> float:
        """Retorna factor de emisión de CO2 por tipo de vehículo (kg/km)"""
        factors = {
            'bus': 0.12,        # Diésel
            'electric_bus': 0.05,
            'bicycle': 0.0,
            'car': 0.18
        }
        return factors.get(vehicle_type, 0.12)

    def optimized_route(self, origin: int, destination: int, 
                       vehicle_type: str = 'bus') -> Optional[List[int]]:
        """
        Encuentra la ruta óptima usando algoritmo A* modificado
        :return: Lista de nodos representando la ruta
        """
        def heuristic(node: int) -> float:
            """Heurística basada en distancia euclidiana"""
            orig = (self.graph.nodes[node]['y'], self.graph.nodes[node]['x'])
            dest = (self.graph.nodes[destination]['y'], self.graph.nodes[destination]['x'])
            return ox.distance.great_circle_vec(*orig, *dest) / 1000  # km

        frontier = []
        heapq.heappush(frontier, (0, origin))
        came_from = {}
        cost_so_far = {origin: 0}
        
        while frontier:
            current_priority, current_node = heapq.heappop(frontier)

            if current_node == destination:
                break

            for neighbor in self.graph.neighbors(current_node):
                edge_cost = self.calculate_edge_cost(current_node, neighbor, vehicle_type)
                new_cost = cost_so_far[current_node] + edge_cost
                
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    priority = new_cost + heuristic(neighbor)
                    heapq.heappush(frontier, (priority, neighbor))
                    came_from[neighbor] = current_node

        return self._reconstruct_path(came_from, origin, destination)

    def _reconstruct_path(self, came_from: Dict[int, int], 
                         start: int, end: int) -> Optional[List[int]]:
        """Reconstruye la ruta desde el diccionario de nodos padres"""
        current = end
        path = []
        while current != start:
            path.append(current)
            current = came_from.get(current, None)
            if current is None:
                return None
        path.append(start)
        return path[::-1]

    def get_route_metrics(self, route: List[int], 
                         vehicle_type: str = 'bus') -> Dict[str, float]:
        """
        Calcula métricas detalladas para una ruta
        :return: Diccionario con distancia, tiempo y CO2
        """
        if not route or len(route) < 2:
            return {}
            
        total_distance = 0.0
        total_time = 0.0
        total_co2 = 0.0
        
        for i in range(len(route) - 1):
            u, v = route[i], route[i+1]
            edge_data = self.graph[u][v][0]
            traffic = self.traffic_data.get((u, v, 0), {'congestion': 0})
            
            distance_km = edge_data['length'] / 1000
            speed = edge_data['speed_kph'] * (1 - traffic['congestion'])
            time_h = distance_km / speed if speed > 0 else 0
            
            total_distance += distance_km
            total_time += time_h
            total_co2 += distance_km * self._get_co2_factor(vehicle_type)
        
        return {
            'distance_km': round(total_distance, 2),
            'time_min': round(total_time * 60, 1),
            'co2_kg': round(total_co2, 2),
            'nodes': route
        }

# Ejemplo de uso
if __name__ == "__main__":
    print("🚗 Probando grafo de Cali...")
    
    # Crear e inicializar grafo
    cali_graph = CityGraph()
    cali_graph.initialize_graph()
    
    # Obtener nodos de ejemplo
    nodes = list(cali_graph.graph.nodes())
    if len(nodes) < 2:
        print("Error: Grafo no contiene suficientes nodos")
    else:
        origin = nodes[100]
        destination = nodes[500]
        
        print(f"\n📍 Ruta desde nodo {origin} hasta {destination}")
        
        # Calcular ruta óptima
        route = cali_graph.optimized_route(origin, destination)
        if route:
            metrics = cali_graph.get_route_metrics(route)
            print(f"📏 Distancia: {metrics['distance_km']} km")
            print(f"⏱️ Tiempo: {metrics['time_min']} min")
            print(f"🌱 CO2: {metrics['co2_kg']} kg")
            print(f"🛣️ Nodos en la ruta: {len(route)}")
        else:
            print("No se encontró ruta válida")