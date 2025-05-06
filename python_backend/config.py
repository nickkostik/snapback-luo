import os
from dotenv import load_dotenv

# Load environment variables from .env file located in the same directory
# This needs to happen BEFORE the Config class reads os.environ
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY') or 'you-should-really-change-this'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'snapback.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME') or 'admin'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'password'
    SERVER_PORT = int(os.environ.get('PORT', 8000))
    CLOUDFLARE_ENABLED = os.environ.get('CLOUDFLARE_ENABLED', 'True').lower() == 'true'
