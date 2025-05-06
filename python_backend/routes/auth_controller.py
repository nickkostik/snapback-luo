from flask import Blueprint, jsonify
from .. import auth # Import auth instance from __init__

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/check', methods=['GET'])
@auth.login_required
def check_auth():
    """
    A simple protected endpoint to check if the user is authenticated.
    Returns 200 OK if authentication succeeds (via @auth.login_required).
    Flask-HTTPAuth handles the 401 response automatically if auth fails.
    """
    return jsonify({"status": "authenticated"}), 200