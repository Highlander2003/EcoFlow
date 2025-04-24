from flask import Blueprint, request, jsonify
from app.services.route_optimizer import optimize_route
from app.services.map_service import get_coordinates, calculate_route

route_blueprint = Blueprint('routes', __name__)

@route_blueprint.route('/optimize', methods=['POST'])
def optimize():
    data = request.get_json()
    
    if not data or 'waypoints' not in data:
        return jsonify({'error': 'Se requieren waypoints para optimizar la ruta'}), 400
    
    try:
        waypoints = data['waypoints']
        vehicle_type = data.get('vehicle_type', 'car')
        optimization_criteria = data.get('optimization_criteria', 'distance')
        
        optimized_route = optimize_route(waypoints, vehicle_type, optimization_criteria)
        
        return jsonify({
            'success': True,
            'route': optimized_route
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@route_blueprint.route('/search', methods=['GET'])
def search_location():
    query = request.args.get('q')
    
    if not query:
        return jsonify({'error': 'Se requiere un término de búsqueda'}), 400
    
    try:
        coordinates = get_coordinates(query)
        return jsonify({
            'success': True,
            'places': coordinates
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@route_blueprint.route('/calculate', methods=['POST'])
def get_route():
    data = request.get_json()
    
    if not data or 'origin' not in data or 'destination' not in data:
        return jsonify({'error': 'Se requieren origen y destino'}), 400
    
    try:
        origin = data['origin']
        destination = data['destination']
        vehicle_type = data.get('vehicle_type', 'car')
        
        route = calculate_route(origin, destination, vehicle_type)
        
        return jsonify({
            'success': True,
            'route': route
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500