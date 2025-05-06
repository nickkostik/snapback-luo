# Snapback Luo AI Backend (Python/Flask)

This project provides the backend services for the Snapback Luo AI application, a conversational AI assistant featuring a dynamic persona, integration with the OpenRouter API, and simple web interfaces for management and user customization. It is built using Python and the Flask framework, serving a static HTML/CSS/JavaScript frontend located in `../src/main/resources/static/`.

## Features

*   **Conversational AI:** Flask API managing chat interactions.
*   **OpenRouter Integration:** Connects to OpenRouter to leverage various Large Language Models (LLMs).
*   **Dynamic Persona:** AI identity (Memory Facts) and behavior (Training Instructions) are loaded from a database, allowing modification without code changes.
*   **API Key Management:** Handles both a server-configured OpenRouter key and allows users to provide their own session-specific key.
*   **Database Persistence:** Uses SQLAlchemy for data persistence (defaults to SQLite).
*   **Static Frontend Serving:** Serves the static web interface files (HTML, CSS, JS) located in `../src/main/resources/static/`.
*   **Admin Security:** Secures administrative API endpoints using Basic Authentication.
*   **Configuration:** Flexible configuration via a `.env` file.

## Prerequisites

*   Python 3.x
*   pip (Python package installer)

## Installation

1.  **Clone the Repository:**
    ```bash
    # If you haven't already cloned the project
    git clone <repository_url>
    cd snapback-luo
    ```
    *(Replace `<repository_url>` with the actual URL if needed)*

2.  **Install Dependencies:**
    Navigate to the Python backend directory and install the required packages:
    ```bash
    pip install -r python_backend/requirements.txt
    ```

## Configuration

The application uses a `.env` file located within the `python_backend/` directory for configuration. Create this file if it doesn't exist.

**`python_backend/.env` Example:**

```dotenv
# Required: Secret key for Flask session management
FLASK_SECRET_KEY='a_very_secret_key_please_change'

# Required: Your OpenRouter API Key
OPENROUTER_API_KEY='sk-or-v1-your-openrouter-key'

# Required: Credentials for accessing admin-protected API routes
ADMIN_USERNAME='admin'
ADMIN_PASSWORD='your_secure_password'

# Optional: Database connection string
# Defaults to a local SQLite file: 'sqlite:///snapback.db'
DATABASE_URL='sqlite:///snapback.db'

# Optional: Port for the development server
# Defaults to 8000
PORT=8000
```

**Key Variables:**

*   `FLASK_SECRET_KEY`: A secret key used by Flask for signing session cookies. **Change this to a unique, random string.**
*   `OPENROUTER_API_KEY`: Your API key obtained from [OpenRouter.ai](https://openrouter.ai/). **This is mandatory.**
*   `ADMIN_USERNAME`: Username for Basic Authentication on protected admin routes.
*   `ADMIN_PASSWORD`: Password for Basic Authentication on protected admin routes. **Change this to a strong password.**
*   `DATABASE_URL`: SQLAlchemy database connection string. Defaults to `sqlite:///snapback.db` (a file named `snapback.db` in the instance folder). You can configure this for other databases like PostgreSQL.
*   `PORT`: The port the development server will run on. Defaults to `8000`.

## Running the Application

Ensure the `python_backend/.env` file is created and populated correctly before running.

**Development Server:**

Run the application using the provided entry point script:

```bash
python python_backend/run.py
```

Alternatively, you can use the Flask CLI (ensure you are in the main `snapback-luo` directory or have set the `PYTHONPATH` appropriately):

```bash
export FLASK_APP=python_backend
flask run --port=${PORT:-8000} # Uses PORT from .env or defaults to 8000
```

The application will be accessible at `http://0.0.0.0:PORT` (e.g., `http://0.0.0.0:8000` by default).

**Production:**

For production deployments, it is recommended to use a production-grade WSGI server like Gunicorn:

```bash
# Example: Run with Gunicorn (ensure gunicorn is installed: pip install gunicorn)
# Make sure you are in the snapback-luo directory
gunicorn --bind 0.0.0.0:${PORT:-8000} "python_backend:create_app()"
```
*(Adjust the Gunicorn command based on your specific deployment needs)*

## API Endpoints

The Flask application exposes several API endpoints under the `/api` prefix:

*   `/api/auth`: Handles admin login/authentication status.
*   `/api/chat`: Manages chat interactions, model selection, and API key saving.
*   `/api/memory`: CRUD operations for AI Memory Facts (persona).
*   `/api/instructions`: CRUD operations for AI Training Instructions (behavior).

*(Refer to the route definitions in `python_backend/routes/` for detailed endpoint specifications)*

## Project Structure (`python_backend/`)

```
python_backend/
├── __init__.py         # Main Flask application factory
├── run.py              # Development server entry point
├── config.py           # Configuration loading (from .env)
├── models.py           # SQLAlchemy database models
├── routes/             # Directory containing API route blueprints
│   ├── auth_controller.py
│   ├── chat_controller.py
│   ├── memory_fact_controller.py
│   └── training_instruction_controller.py
├── requirements.txt    # Project dependencies
├── .env                # Configuration file (needs to be created)
└── instance/           # Instance folder (created automatically, may contain SQLite DB)
    └── snapback.db     # Default SQLite database file