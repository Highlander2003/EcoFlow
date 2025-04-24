from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.routes.route_endpoints import route_blueprint
from app.routes.sensor_endpoints import sensor_blueprint

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Habilitar CORS
    CORS(app)
    
    # Registrar blueprints
    app.register_blueprint(route_blueprint, url_prefix='/api/routes')
    app.register_blueprint(sensor_blueprint, url_prefix='/api/sensors')
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'EcoFlow API running'}
    
    @app.route('/')
    def home():
        return {
            'name': 'EcoFlow API',
            'version': '1.0',
            'endpoints': {
                'health': '/api/health',
                'search_places': '/api/routes/search?q=<query>',
                'optimize_route': '/api/routes/optimize (POST)',
                'calculate_route': '/api/routes/calculate (POST)',
                'sensor_data': '/api/sensors/data (POST)',
                'sensor_history': '/api/sensors/history/<sensor_id>'
            }
        }
    
    return app