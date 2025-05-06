import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_httpauth import HTTPBasicAuth
from flask_cors import CORS # Added for Cross-Origin Resource Sharing
from .config import Config
from .models import db  # Import db instance from models

auth = HTTPBasicAuth()

def create_app(config_class=Config):
    # Define the static folder relative to the instance path
    static_folder_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'main', 'resources', 'static'))
    app = Flask(__name__, static_folder=static_folder_path, static_url_path='')
    app.config.from_object(config_class)

    # Initialize CORS after configuring the app
    # Allow all origins for development, enable credentials for session cookies
    CORS(app, supports_credentials=True, origins="*")

    # Handle Cloudflare headers to get real client IP
    if app.config.get('CLOUDFLARE_ENABLED', False):
        from flask import request
        
        @app.before_request
        def get_real_ip():
            if 'CF-Connecting-IP' in request.headers:
                request.remote_addr = request.headers.get('CF-Connecting-IP')

    db.init_app(app)

    # Import and register blueprints
    from .routes.chat_controller import chat_bp
    from .routes.memory_fact_controller import memory_bp
    from .routes.training_instruction_controller import instruction_bp
    from .routes.auth_controller import auth_bp # Added auth blueprint

    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(memory_bp, url_prefix='/api/memory')
    app.register_blueprint(instruction_bp, url_prefix='/api/instructions')
    app.register_blueprint(auth_bp, url_prefix='/api/auth') # Added auth blueprint registration

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        # Initialize default settings if not present
        from .models import AppSettings
        default_model = AppSettings.query.filter_by(setting_key='default_model').first()
        if not default_model:
            setting = AppSettings(setting_key='default_model', setting_value='openai/gpt-3.5-turbo')
            db.session.add(setting)
            db.session.commit()

    # Route for serving index.html at the root
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')

    # Explicit routes for extensionless HTML files
    @app.route('/training')
    def serve_training():
        return send_from_directory(app.static_folder, 'training.html')

    @app.route('/api_key')
    def serve_api_key_setup():
        # Assuming /api_key should serve api_key_setup.html based on context
        return send_from_directory(app.static_folder, 'api_key_setup.html')

    @app.route('/admin')
    def serve_admin():
        return send_from_directory(app.static_folder, 'admin.html')

    # Route for serving other static files (must come AFTER specific routes)
    @app.route('/<path:path>')
    def serve_static_files(path):
        # Attempt to serve the path directly
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        # If not found, try appending .html
        html_path = path + '.html'
        if os.path.exists(os.path.join(app.static_folder, html_path)):
            return send_from_directory(app.static_folder, html_path)
        # If neither exists, Flask will return 404 automatically
        # For explicit 404, uncomment below:
        # from flask import abort
        # abort(404)
        # However, letting send_from_directory handle the final 404 is cleaner
        return send_from_directory(app.static_folder, path) # Will 404 if path doesn't exist

    return app

# Define user verification callback for HTTPBasicAuth
@auth.verify_password
def verify_password(username, password):
    if username == Config.ADMIN_USERNAME and password == Config.ADMIN_PASSWORD:
        return username
    return None
