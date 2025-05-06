#!/bin/bash

echo "Starting Snapback Luo Python backend..."

# Define the python backend directory relative to this script
PYTHON_DIR="$(dirname "$0")/python_backend"

# Activate the virtual environment (path relative to script location)
VENV_ACTIVATE="$PYTHON_DIR/venv/bin/activate"
if [ -f "$VENV_ACTIVATE" ]; then
  echo "Activating virtual environment from $VENV_ACTIVATE..."
  source "$VENV_ACTIVATE"
else
  echo "ERROR: Virtual environment not found at $VENV_ACTIVATE"
  exit 1
fi

# Set Flask app environment variable
export FLASK_APP=run.py

# Check if OPENROUTER_API_KEY is set (optional check, Flask will error if not set and needed)
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "WARNING: OPENROUTER_API_KEY environment variable is not set."
  echo "         The application might fail if it requires the key."
fi

echo "Running Gunicorn server (Press CTRL+C to quit)..."
# Run with Gunicorn WSGI server from the project root directory (snapback-luo)
# --pythonpath: Add the directory containing the 'python_backend' package to Python's path
# -w 4: Use 4 worker processes (adjust based on server resources)
# -b 0.0.0.0:5000: Bind to all interfaces on port 5000
# -t 90: Increase worker timeout to 90 seconds (default is 30)
# python_backend.run:app: Load the 'app' variable from the 'run.py' module inside the 'python_backend' package
# $(dirname "$0") should resolve to ./snapback-luo when run from /home/opc
gunicorn --pythonpath "$(dirname "$0")" -w 4 -b 0.0.0.0:5000 -t 90 python_backend.run:app

# Deactivate virtual environment upon exit (optional, usually happens automatically)
# deactivate