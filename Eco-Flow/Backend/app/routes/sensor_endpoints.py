from flask import Blueprint, request, jsonify
from app.services.sensor_service import process_sensor_data, get_sensor_history

sensor_blueprint = Blueprint('sensors', __name__)

@sensor_blueprint.route('/data', methods=['POST'])
def receive_sensor_data():
    data = request.get_json()
    
    if not data or 'sensor_id' not in data or 'readings' not in data:
        return jsonify({'error': 'Datos de sensor incorrectos o incompletos'}), 400
    
    try:
        result = process_sensor_data(data)
        return jsonify({
            'success': True,
            'processed': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensor_blueprint.route('/history/<sensor_id>', methods=['GET'])
def sensor_history(sensor_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        history = get_sensor_history(sensor_id, start_date, end_date)
        return jsonify({
            'success': True,
            'data': history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500