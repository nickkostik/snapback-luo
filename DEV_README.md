# Development Guide: Snapback Luo Python Backend

This guide provides instructions specifically for developers working on the Python Flask backend of the Snapback Luo project. It covers setup, running the application locally, understanding the code structure, and other development-specific details.

For a general project overview, user setup (including mandatory API key configuration for deployment), and feature explanations, please refer to the main [README.md](../README.md).

## Developer Setup

1.  **Python:** Ensure you have a compatible version of Python 3 installed.
2.  **Virtual Environment:** It is highly recommended to use a virtual environment to manage dependencies.
    ```bash
    # Navigate to the project root (snapback-luo)
    cd /path/to/snapback-luo

    # Create a virtual environment within the python_backend directory
    python3 -m venv python_backend/venv

    # Activate the virtual environment
    # On Linux/macOS:
    source python_backend/venv/bin/activate
    # On Windows:
    # python_backend\venv\Scripts\activate
    ```
3.  **Install Dependencies:** With the virtual environment activated, install the required packages:
    ```bash
    pip install -r python_backend/requirements.txt
    ```

## Environment Variables (`.env`)

The backend configuration is managed via environment variables loaded from a `.env` file located in the `python_backend/` directory. You **must** create this file for the application to run.

**Create `python_backend/.env` with the following variables:**

```dotenv
# Flask specific
FLASK_SECRET_KEY='your_strong_random_secret_key_here' # CHANGE THIS! Used for session security. Generate a strong random key.

# Database
DATABASE_URL='sqlite:///snapback.db' # Default: SQLite file in python_backend/. Can be changed to PostgreSQL, etc.

# Core Functionality
OPENROUTER_API_KEY='your_openrouter_api_key_here' # **REQUIRED** Your API key from OpenRouter.ai for chat functionality.

# Admin Authentication
ADMIN_USERNAME='admin' # Username for accessing admin/protected API routes.
ADMIN_PASSWORD='your_secure_admin_password' # CHANGE THIS! Password for the admin user.

# Server Configuration
PORT=8000 # Port the development server will run on.
CLOUDFLARE_ENABLED=false # Set to true if deploying behind Cloudflare Tunnel (affects request IP handling).
```

**Important Notes:**
*   Replace placeholder values (like secret keys and passwords) with your actual secure values.
*   The `OPENROUTER_API_KEY` is essential for the chat functionality to work. Obtain one from [OpenRouter.ai](https://openrouter.ai/).
*   Ensure the `.env` file is **never** committed to version control (it should be listed in `python_backend/.gitignore`).

## Running Locally for Development

1.  **Ensure `.env` is created and configured** in the `python_backend/` directory as described above.
2.  **Activate your virtual environment** (`source python_backend/venv/bin/activate`).
3.  **Run the development server:**
    ```bash
    # From the root snapback-luo directory
    python python_backend/run.py
    ```
    Alternatively, you can use the `flask` command (ensure `FLASK_APP` is set):
    ```bash
    # Set FLASK_APP environment variable (if not already set by your shell)
    export FLASK_APP=python_backend

    # Run the Flask development server
    flask run --host=0.0.0.0 --port=8000 # Or the port specified in .env
    ```
4.  **Access the application:** Open your browser and navigate to `http://0.0.0.0:<PORT>` (e.g., `http://0.0.0.0:8000` if using the default port).

**Note:** The Flask development server (`python run.py` or `flask run`) is suitable for development and debugging but **not recommended for production**. Use a production-grade WSGI server like Gunicorn for deployment (see Deployment section).

## Code Structure Overview

The Python backend code is organized within the `python_backend/` directory:

*   `__init__.py`: Contains the application factory (`create_app`) where the Flask app is initialized, extensions (like SQLAlchemy, CORS, HTTPAuth) are configured, and blueprints are registered.
*   `run.py`: Simple script acting as the entry point for running the Flask development server.
*   `config.py`: Defines the `Config` class responsible for loading environment variables from the `.env` file.
*   `models.py`: Defines the SQLAlchemy database models:
    *   `User`: For admin authentication.
    *   `MemoryFact`: Stores persona memory facts.
    *   `TrainingInstruction`: Stores persona training instructions.
    *   `ApiKey`: Stores API keys for external access (if implemented).
*   `routes/`: This directory contains Flask Blueprints, organizing API endpoints by functionality:
    *   `auth_controller.py`: Handles admin login (`/admin/login`) and potentially logout.
    *   `chat_controller.py`: Manages the main `/chat` endpoint, interacting with the OpenRouter API.
    *   `memory_fact_controller.py`: Provides CRUD API endpoints (`/api/memory`) for managing memory facts (requires admin authentication).
    *   `training_instruction_controller.py`: Provides CRUD API endpoints (`/api/training`) for managing training instructions (requires admin authentication).
    *   *(Potentially others like `api_key_controller.py`)*
*   `requirements.txt`: Lists Python package dependencies.
*   `.env`: (You create this) Stores environment variables.
*   `.gitignore`: Specifies files/directories to be ignored by Git.
*   `venv/`: (Created by you) Contains the Python virtual environment.

## Database

*   **ORM:** Uses Flask-SQLAlchemy.
*   **Models:** Defined in `python_backend/models.py`.
*   **Default Database:** A SQLite database file named `snapback.db` will be created within the `python_backend/` directory when the application first runs (based on the default `DATABASE_URL` in `.env`).
*   **Configuration:** The database connection string can be changed via the `DATABASE_URL` environment variable in `.env` to support other databases like PostgreSQL.
*   **Initialization/Migrations:** The application currently uses `db.create_all()` within the app context to create tables based on the models if they don't exist. For more complex schema changes or production environments, implementing database migrations using a tool like Flask-Migrate (Alembic) would be recommended. *(Currently, no migration tool seems to be configured).*

## API Details

*   **Authentication:** Routes under `/admin` and `/api` (excluding `/chat` and potentially `/api/keys/setup`) are protected using Basic Authentication via Flask-HTTPAuth. Credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) are configured in the `.env` file.
*   **Key Endpoints:**
    *   `/`: Serves the main static frontend (`index.html`).
    *   `/admin`: Serves the admin interface (`admin.html`).
    *   `/training`: Serves the training interface (`training.html`).
    *   `/api_key_setup`: Serves the API key setup page (`api_key_setup.html`).
    *   `/chat` (POST): Handles user chat messages.
    *   `/admin/login` (POST): Authenticates the admin user.
    *   `/api/memory` (GET, POST): List/Create memory facts.
    *   `/api/memory/<id>` (PUT, DELETE): Update/Delete specific memory facts.
    *   `/api/training` (GET, POST): List/Create training instructions.
    *   `/api/training/<id>` (PUT, DELETE): Update/Delete specific training instructions.
    *   *(Check controllers for exact routes and methods)*

## Testing

*(Currently, no automated tests seem to be included in the repository. Setting up a testing framework like `pytest` with fixtures for Flask applications is recommended for future development.)*

## Deployment

*   **Server:** Use a production-grade WSGI server like Gunicorn. Do **not** use the Flask development server in production.
*   **Example Gunicorn Command:**
    ```bash
    # Ensure gunicorn is installed (pip install gunicorn)
    # Run from the root snapback-luo directory
    gunicorn --workers 4 --bind 0.0.0.0:<PORT> 'python_backend:create_app()'
    ```
    Replace `<PORT>` with the desired production port. Adjust the number of workers (`-w 4`) based on your server resources.
*   **Environment Variables:** Ensure the `.env` file (or equivalent environment variables set directly on the server) is present and correctly configured in the production environment. **Pay special attention to `FLASK_SECRET_KEY` and database credentials.**
*   **Cloudflare:** If deploying behind Cloudflare Tunnel, set `CLOUDFLARE_ENABLED=true` in your production `.env` file so the application correctly identifies the client's IP address.

## Troubleshooting Common Issues

*   **`ModuleNotFoundError`:** Ensure your virtual environment is activated and dependencies are installed (`pip install -r python_backend/requirements.txt`).
*   **`FileNotFoundError: [Errno 2] No such file or directory: 'python_backend/.env'`:** You forgot to create the `python_backend/.env` file.
*   **Authentication Errors (401 Unauthorized):** Double-check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your `.env` file and ensure you are providing them correctly (e.g., via Basic Auth headers or browser prompt).
*   **Chat Not Working / API Errors:** Verify your `OPENROUTER_API_KEY` in `.env` is correct and valid. Check the Flask console output for specific error messages from the OpenRouter API.
*   **Port Conflicts:** If another application is using the port defined in `.env` (default 8000), the server won't start. Change the `PORT` in `.env` or stop the other application.
*   **Database Errors:** Check the `DATABASE_URL` in `.env`. If using SQLite, ensure the application has write permissions in the `python_backend/` directory. If using another DB, verify connection details and that the database server is running.