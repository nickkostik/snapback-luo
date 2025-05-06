from . import create_app # Use relative import for create_app from __init__.py
# Config might not be needed here if create_app uses default
# If Config is needed directly: from .config import Config

app = create_app()

if __name__ == '__main__':
    # Use the port defined in the config
    port = app.config.get('SERVER_PORT', 8000)
    # Run in debug mode for development (auto-reloads, provides debugger)
    # Set debug=False for production
    app.run(host='0.0.0.0', port=port, debug=True)