import random
import numpy as np
import networkx as nx
from deap import base, creator, tools, algorithms
from app.models.route import Route

# Configuración básica para el algoritmo genético
creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
creator.create("Individual", list, fitness=creator.FitnessMin)

def calculate_distance_matrix(waypoints):
    """
    Calcula la matriz de distancias entre puntos.
    Para una implementación real, esto usaría OpenStreetMap o Google Maps para calcular
    distancias reales considerando carreteras.
    """
    n = len(waypoints)
    distance_matrix = np.zeros((n, n))
    
    # Cálculo simplificado de distancia euclidiana
    for i in range(n):
        for j in range(n):
            if i != j:
                # En un caso real, aquí llamaríamos a una API para obtener distancias por carretera
                lat1, lon1 = waypoints[i]['lat'], waypoints[i]['lon']
                lat2, lon2 = waypoints[j]['lat'], waypoints[j]['lon']
                # Distancia euclidiana simplificada (para ejemplo)
                distance_matrix[i][j] = ((lat1 - lat2)**2 + (lon1 - lon2)**2)**0.5 * 111  # km aproximados
    
    return distance_matrix

def evaluate_route(individual, distance_matrix):
    """Evalúa la calidad de una ruta basada en la distancia total"""
    total_distance = 0
    for i in range(len(individual)):
        total_distance += distance_matrix[individual[i-1]][individual[i]]
    return (total_distance,)

def optimize_route(waypoints, vehicle_type='car', optimization_criteria='distance'):
    """
    Optimiza una ruta usando un algoritmo genético.
    
    Args:
        waypoints: Lista de puntos por los que debe pasar la ruta
        vehicle_type: Tipo de vehículo (car, bike, etc.)
        optimization_criteria: Criterio de optimización (distance, time, emissions)
        
    Returns:
        Ruta optimizada con detalles
    """
    # Para MVP, podemos usar una implementación simple
    if len(waypoints) <= 2:
        # No hay necesidad de optimizar para 0, 1 o 2 puntos
        route = Route(waypoints, vehicle_type)
        route.total_distance = 0 if len(waypoints) < 2 else 10  # Valor de ejemplo
        route.estimated_time = 0 if len(waypoints) < 2 else 20  # Valor de ejemplo
        return route.to_dict()
    
    # Crear matriz de distancias
    distance_matrix = calculate_distance_matrix(waypoints)
    
    # Configurar algoritmo genético
    toolbox = base.Toolbox()
    
    # Definir representación: permutación de índices
    toolbox.register("indices", random.sample, range(len(waypoints)), len(waypoints))
    toolbox.register("individual", tools.initIterate, creator.Individual, toolbox.indices)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    
    # Definir operadores genéticos
    toolbox.register("evaluate", evaluate_route, distance_matrix=distance_matrix)
    toolbox.register("mate", tools.cxOrdered)
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.05)
    toolbox.register("select", tools.selTournament, tournsize=3)
    
    # Crear población inicial
    pop = toolbox.population(n=50)
    
    # Ejecutar algoritmo
    algorithms.eaSimple(pop, toolbox, cxpb=0.7, mutpb=0.2, ngen=40, verbose=False)
    
    # Obtener mejor individuo
    best_ind = tools.selBest(pop, 1)[0]
    
    # Crear ruta optimizada
    route = Route(waypoints, vehicle_type)
    route.total_distance = best_ind.fitness.values[0]
    route.estimated_time = route.total_distance * 2  # Aproximación simple
    route.emissions = route.total_distance * 0.2  # Aproximación simple
    
    # Generar path completo
    optimized_waypoints = [waypoints[i] for i in best_ind]
    route.path = optimized_waypoints
    
    return route.to_dict()