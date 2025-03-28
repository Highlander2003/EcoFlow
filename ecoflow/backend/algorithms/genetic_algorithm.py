# algorithms/genetic_algorithm.py
import random
import numpy as np
from deap import base, creator, tools, algorithms
import networkx as nx

class RouteOptimizer:
    def __init__(self, city_graph, traffic_data, co2_factors):
        """
        Inicializa el optimizador de rutas
        :param city_graph: Grafo NetworkX de la ciudad
        :param traffic_data: Diccionario con datos de tráfico en tiempo real
        :param co2_factors: Factores de emisión por tipo de vehículo
        """
        self.graph = city_graph
        self.traffic_data = traffic_data
        self.co2_factors = co2_factors
        
        # Parámetros del algoritmo
        self.POP_SIZE = 80      # Tamaño de población
        self.GEN = 30           # Número de generaciones
        self.CXPB = 0.7         # Probabilidad de cruce
        self.MUTPB = 0.3        # Probabilidad de mutación

        # Configurar estructura genética
        self._setup_genetic_environment()

    def _setup_genetic_environment(self):
        """Configura el entorno genético usando DEAP"""
        creator.create("FitnessMulti", base.Fitness, weights=(-1.0, -1.0))  # Minimizar CO2 y tiempo
        creator.create("Individual", list, fitness=creator.FitnessMulti)

        self.toolbox = base.Toolbox()
        self.toolbox.register("individual", self._generate_valid_route)
        self.toolbox.register("population", tools.initRepeat, list, self.toolbox.individual)
        
        # Operadores genéticos
        self.toolbox.register("evaluate", self._evaluate_route)
        self.toolbox.register("mate", self._crossover)
        self.toolbox.register("mutate", self._mutate)
        self.toolbox.register("select", tools.selNSGA2)

    def optimize(self, start_node, end_node, vehicle_type='bus'):
        """
        Ejecuta la optimización de ruta
        :return: Mejor ruta encontrada con sus métricas
        """
        self.start = start_node
        self.end = end_node
        self.vehicle_type = vehicle_type
        
        population = self.toolbox.population(n=self.POP_SIZE)
        hall_of_fame = tools.HallOfFame(1)
        stats = self._setup_stats()

        population, logbook = algorithms.eaMuPlusLambda(
            population, self.toolbox,
            mu=self.POP_SIZE, lambda_=self.POP_SIZE,
            cxpb=self.CXPB, mutpb=self.MUTPB,
            ngen=self.GEN, stats=stats,
            halloffame=hall_of_fame, verbose=True
        )

        return self._format_result(hall_of_fame[0])

    def _evaluate_route(self, individual):
        """Función de evaluación multiobjetivo"""
        total_co2 = 0.0
        total_time = 0.0
        
        try:
            for i in range(len(individual)-1):
                u, v = individual[i], individual[i+1]
                edge_data = self.graph[u][v][0]
                
                # Calcular congestión actual
                congestion = self.traffic_data.get((u, v, 0), {}).get('congestion', 0)
                
                # Cálculo de CO2 (kg)
                distance_km = edge_data['length'] / 1000  # Convertir a km
                co2 = distance_km * self.co2_factors[self.vehicle_type] * (1 + congestion)
                
                # Cálculo de tiempo (minutos)
                speed = edge_data.get('speed_kph', 40) * (1 - congestion)
                time = (distance_km / speed) * 60 if speed > 0 else 0
                
                total_co2 += co2
                total_time += time
                
            return (total_co2, total_time)
        except (KeyError, nx.NetworkXNoPath):
            return (float('inf'), float('inf'))  # Penalizar rutas inválidas

    def _crossover(self, ind1, ind2):
        """Cruce OX adaptado para rutas urbanas"""
        valid_points = [i for i in range(1, min(len(ind1), len(ind2))-1)]
        
        if not valid_points:
            return ind1, ind2
            
        cx1, cx2 = sorted(random.sample(valid_points, 2))
        slice1, slice2 = ind1[cx1:cx2], ind2[cx1:cx2]
        
        # Reconstruir rutas manteniendo la validez
        ind1 = [n for n in ind1 if n not in slice2] + slice2
        ind2 = [n for n in ind2 if n not in slice1] + slice1
        
        return ind1, ind2

    def _mutate(self, individual):
        """Mutación inteligente basada en el grafo"""
        if random.random() < self.MUTPB:
            idx = random.randint(0, len(individual)-1)
            current_node = individual[idx]
            
            # Buscar alternativas de conexión
            neighbors = list(self.graph.neighbors(current_node))
            if neighbors:
                new_node = random.choice(neighbors)
                individual = individual[:idx] + [new_node] + individual[idx+1:]
                
        return individual,

    def _generate_valid_route(self):
        """Genera ruta inicial válida usando búsqueda aleatoria"""
        current = self.start
        route = [current]
        
        while current != self.end:
            neighbors = list(self.graph.neighbors(current))
            if not neighbors:
                break  # Evitar bucles infinitos
            current = random.choice(neighbors)
            route.append(current)
            if len(route) > 100:  # Prevenir rutas demasiado largas
                break
                
        return creator.Individual(route)

    def _setup_stats(self):
        """Configurar estadísticas de evolución"""
        stats = tools.Statistics(lambda ind: ind.fitness.values)
        stats.register("avg", np.mean)
        stats.register("min", np.min)
        stats.register("max", np.max)
        return stats

    def _format_result(self, individual):
        """Formatea la mejor ruta para respuesta API"""
        try:
            co2, time = self._evaluate_route(individual)
            return {
                "nodes": individual,
                "co2_kg": round(co2, 2),
                "time_min": round(time, 1),
                "distance_km": round(sum(
                    self.graph[u][v][0]['length']/1000 
                    for u,v in zip(individual, individual[1:])
                ), 2)
            }
        except:
            return {"error": "No se pudo generar ruta válida"}

# Ejemplo de uso para pruebas locales
if __name__ == "__main__":
    # Crear grafo de prueba
    G = nx.DiGraph()
    G.add_edges_from([
        (1, 2, {'length': 500, 'speed_kph': 40}),
        (2, 3, {'length': 1500, 'speed_kph': 30}),
        (3, 4, {'length': 800, 'speed_kph': 50}),
        (1, 4, {'length': 2000, 'speed_kph': 60})
    ])
    
    optimizer = RouteOptimizer(
        city_graph=G,
        traffic_data={(1,2,0): 0.3, (2,3,0): 0.7},
        co2_factors={'bus': 0.12}
    )
    
    result = optimizer.optimize(start_node=1, end_node=4)
    print("\n🔍 Resultado de optimización:")
    print(f"Ruta: {result['nodes']}")
    print(f"CO2: {result['co2_kg']} kg")
    print(f"Tiempo: {result['time_min']} min")
    print(f"Distancia: {result['distance_km']} km")