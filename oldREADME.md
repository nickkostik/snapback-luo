# Snapback Luo AI Backend (`snapback-luo`)

This project provides the backend services for the Snapback Luo AI application, a conversational AI assistant featuring a dynamic persona, integration with the OpenRouter API, and simple web interfaces for management and user customization. It is built using Java 17 and the Spring Boot framework, serving a static HTML/CSS/JavaScript frontend.

## 1. Project Overview

Snapback Luo provides a flexible and configurable AI chat experience. It acts as a backend server that:

*   Handles chat requests, maintaining conversation history within a user session.
*   Integrates with the OpenRouter API to leverage various Large Language Models (LLMs).
*   Features a dynamic persona loaded from a database (Memory Facts and Training Instructions).
*   Manages API keys (server-provided and user-provided).
*   Persists data using an H2 file-based database.
*   Serves a static frontend for chat, administration, and user customization.
*   Secures administrative endpoints using Basic Authentication.

## 2. Features

*   **Conversational AI:** Manages chat interactions via `/api/chat`, using OpenRouter for LLM responses.
*   **OpenRouter Integration:** Connects to `https://openrouter.ai/api/v1/` using a required server-side API key (`OPENROUTER_API_KEY` environment variable) or a user-provided session key.
*   **Dynamic Persona:** AI identity (`MemoryFact`) and behavior (`TrainingInstruction`) are stored in the H2 database and loaded dynamically, allowing modification without code changes.
*   **API Key Management:**
    *   Uses a server-configured `OPENROUTER_API_KEY` (set via environment variable) for basic functionality and fetching model lists.
    *   Allows users to provide their own OpenRouter key for their session via `api_key_setup.html` (`POST /api/chat/save-key`), stored securely in the server-side `HttpSession`.
*   **Model Selection:** Users can select models via `training.html` (`/api/chat/*`). Administrators can set a global default model via `admin.html` (`/api/chat/*`). A debug page (`debug-models.html`) lists available models (`GET /api/chat/debug/models`).
*   **Database Persistence:** Uses an H2 file-based database (`./data/snapbackdb.mv.db`) for `AppSettings`, `MemoryFact`, and `TrainingInstruction` entities.
*   **Web Interfaces (Static Frontend):**
    *   `index.html`: Main chat interface.
    *   `admin.html`: Admin panel (Basic Auth required) for managing all instructions and default model.
    *   `training.html`: User panel for managing visible instructions, memory facts, and model selection.
    *   `api_key_setup.html`: Page for users to enter their OpenRouter API key.
    *   `debug-models.html`: Page to list available models.
*   **Security:** Basic Authentication (`admin`/password configured in `WebSecurityConfig.java`) protects administrative endpoints (e.g., managing all instructions). CSRF protection is disabled.

## 3. Prerequisites

*   **Java Development Kit (JDK):** Version 17 or higher is required. Ensure `JAVA_HOME` is set correctly or that the `java` executable for JDK 17+ is in your system's `PATH`.
*   **Maven (Optional but Recommended):** The project includes the Maven wrapper (`./mvnw` for Linux/macOS, `mvnw.cmd` for Windows). This wrapper will automatically download the correct Maven version if you have a JDK installed.
*   **OpenRouter API Key:** You **must** obtain an API key from [OpenRouter.ai](https://openrouter.ai/). This key is required for the server to function.

## 4. Installation and Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/nickkostik/snapback-luo.git
    cd snapback-luo # Navigate into the cloned project directory
    ```
2.  **Verify Java Version:**
    Confirm that JDK 17 or higher is the active version.
    ```bash
    java -version
    ```
3.  **Configure Server API Key (Mandatory):**
    The application requires a server-side OpenRouter API key. This **must** be provided via an environment variable named `OPENROUTER_API_KEY`.
    *   **How to Set (Example for Linux/macOS):**
        ```bash
        export OPENROUTER_API_KEY="sk-or-v1-your-actual-openrouter-key"
        # Now run the application using mvnw or java -jar in the SAME terminal session
        ```
    *   **Windows (Command Prompt):**
        ```cmd
        set OPENROUTER_API_KEY=sk-or-v1-your-actual-openrouter-key
        ```
    *   **Windows (PowerShell):**
        ```powershell
        $env:OPENROUTER_API_KEY = "sk-or-v1-your-actual-openrouter-key"
        ```
    *   **Deployment:** Use your deployment environment's standard mechanism for setting environment variables (e.g., Dockerfile `ENV`, systemd unit file `Environment=`, cloud provider configuration).
    *   **Note:** The `run-dev.sh` script uses a hardcoded key and runs on a different port (see Running section). For standard development or production, setting the environment variable is necessary.

4.  **Review Configuration (`src/main/resources/application.properties`):**
    *   **Server Port:** Defaults to `server.port=8000`.
    *   **Database:** Defaults to H2 file DB at `spring.datasource.url=jdbc:h2:file:./data/snapbackdb`. The `data/` directory will be created relative to where the application is run.
    *   **H2 Console:** Enabled by default at `/h2-console` (e.g., `http://localhost:8000/h2-console`). Use JDBC URL `jdbc:h2:file:./data/snapbackdb`, username `sa`, and no password.

## 5. Running the Application

Ensure the `OPENROUTER_API_KEY` environment variable is set correctly before running via Maven or JAR.

### Option 1: Development Mode (Maven Plugin - Recommended for Dev)

This method runs the application using the Spring Boot Maven plugin on the configured port (default: 8000) and uses the `OPENROUTER_API_KEY` from the environment. Spring Boot DevTools provides auto-restart on code changes.

1.  **Set API Key:** Ensure the `OPENROUTER_API_KEY` environment variable is set in your current terminal session.
2.  **Run:**
    ```bash
    # Linux/macOS
    ./mvnw spring-boot:run

    # Windows
    mvnw.cmd spring-boot:run
    ```
    The application will be available at `http://localhost:8000` (or the configured port).

### Option 2: Development Test Script (`run-dev.sh`)

This script provides a quick way to run the application for testing, but with specific behavior:

*   Runs on port **8081** (overrides `application.properties`).
*   Uses a **hardcoded** OpenRouter API key within the script itself. **This key will likely need to be updated in the script for it to work.**
*   Does **not** use the `OPENROUTER_API_KEY` environment variable.

1.  **Make Script Executable (One-time):**
    ```bash
    chmod +x run-dev.sh
    ```
2.  **(Optional) Edit API Key in Script:** Modify the hardcoded key inside `run-dev.sh` if needed.
3.  **Run:**
    ```bash
    ./run-dev.sh
    ```
    The application will be available at `http://localhost:8081`. Use this primarily for quick tests where the hardcoded key and different port are acceptable.

### Option 3: Packaged JAR (Production/Deployment)

Build an executable JAR file and run it. This is suitable for production deployments.

1.  **Set API Key:** Ensure the `OPENROUTER_API_KEY` environment variable is set in the environment where the JAR will run.
2.  **Build the JAR:**
    ```bash
    # Linux/macOS
    ./mvnw package

    # Windows
    mvnw.cmd package
    ```
    This creates an executable JAR in the `target/` directory (e.g., `target/snapbackluo-0.0.1-SNAPSHOT.jar`).
3.  **Run the JAR:**
    ```bash
    java -jar target/snapbackluo-*.jar
    # Replace * with the actual version number
    ```
    The application will run on the port defined in `application.properties` (default 8000).

## 6. Folder Structure

```
snapback-luo/
├── .mvn/                   # Maven wrapper configuration
├── data/                   # H2 database files (created automatically on first run)
│   └── snapbackdb.mv.db
├── src/
│   ├── main/
│   │   ├── java/com/example/snapbackluo/
│   │   │   ├── SnapbackluoApplication.java # Main Spring Boot application class (Entry Point)
│   │   │   ├── config/             # Spring configuration (WebSecurityConfig.java, WebConfig.java)
│   │   │   ├── controller/         # REST API endpoints (ChatController, MemoryFactController, TrainingInstructionController)
│   │   │   ├── model/              # JPA Entities (AppSettings, MemoryFact, TrainingInstruction)
│   │   │   ├── repository/         # Spring Data JPA repositories (AppSettingsRepository, MemoryFactRepository, TrainingInstructionRepository)
│   │   │   └── service/            # Business logic (AppSettingsService)
│   │   └── resources/
│   │       ├── application.properties # Main configuration file (port, database, etc.)
│   │       └── static/             # Static frontend assets (HTML, CSS, JS, images)
│   │           ├── index.html
│   │           ├── admin.html
│   │           ├── training.html
│   │           ├── api_key_setup.html
│   │           ├── debug-models.html
│   │           ├── script.js
│   │           ├── admin_script.js
│   │           ├── training_script.js
│   │           ├── api_key_script.js
│   │           ├── style.css
│   │           ├── luis.png
│   │           ├── favicon.ico
│   │           └── README.md       # README specific to frontend examples (NOT for backend setup)
│   └── test/                   # Unit and integration tests
├── .gitattributes          # Git configuration
├── .gitignore              # Specifies intentionally untracked files for Git
├── mvnw                    # Maven wrapper script (Linux/macOS)
├── mvnw.cmd                # Maven wrapper script (Windows)
├── pom.xml                 # Maven Project Object Model (dependencies, build config)
├── README.md               # This file
└── run-dev.sh              # Helper script for running on port 8081 with a hardcoded key
```

*   **`src/main/java`**: Core Java backend code.
*   **`src/main/resources`**: Configuration files (`application.properties`) and static web assets (`static/`).
*   **`src/main/resources/static`**: Web root. Files here are served directly. The `README.md` in this directory contains notes relevant to the static frontend examples, not the main backend application setup.
*   **`data/`**: Stores the H2 database file. Should typically be added to `.gitignore`.
*   **`pom.xml`**: Maven build file defining dependencies and build process.

## 7. Server Architecture and Request Flow

The backend uses Spring Boot with these key components:

*   **Entry Point:** `SnapbackluoApplication.java` starts the Spring Boot application.
*   **Configuration:**
    *   `application.properties`: Defines server port, database connection, etc.
    *   `WebSecurityConfig.java`: Configures Basic Authentication for admin endpoints (in-memory 'admin' user) and disables CSRF.
    *   `WebConfig.java`: General web layer configuration (if any).
*   **Controllers (`src/main/java/com/example/snapbackluo/controller/`)**: Handle HTTP requests.
    *   `ChatController`: Handles `/api/chat` (POST for chat, GET/POST for model/key config), `/api/chat/debug/models` (GET).
    *   `MemoryFactController`: Handles `/api/memory` (Public GET/POST/PUT/DELETE).
    *   `TrainingInstructionController`: Handles `/api/instructions` (Public GET/POST for visible, Admin GET/POST/PUT/DELETE for all - requires Basic Auth).
*   **Models/Entities (`src/main/java/com/example/snapbackluo/model/`)**: JPA entities mapping to database tables.
    *   `AppSettings`: Stores application settings (e.g., default model).
    *   `MemoryFact`: Stores AI persona facts.
    *   `TrainingInstruction`: Stores AI behavioral instructions (can be hidden).
*   **Repositories (`src/main/java/com/example/snapbackluo/repository/`)**: Spring Data JPA interfaces for database operations.
    *   `AppSettingsRepository`, `MemoryFactRepository`, `TrainingInstructionRepository`.
*   **Services (`src/main/java/com/example/snapbackluo/service/`)**: Contain business logic.
    *   `AppSettingsService`: Manages application settings.

**Example Chat Request Flow (`POST /api/chat`):**

1.  **Frontend (`static/script.js`)**: User sends message. JS sends POST to `/api/chat` with conversation history.
2.  **Backend (`ChatController.java`)**:
    *   Receives request.
    *   Retrieves user's session API key (if set via `api_key_setup.html`) or falls back to the server's `OPENROUTER_API_KEY` environment variable.
    *   Validates the chosen API key.
    *   Fetches `MemoryFact` and visible `TrainingInstruction` data from the database via repositories.
    *   Constructs the system prompt using the fetched persona data.
    *   Formats the message history for the OpenRouter API.
    *   Sends the request (including model, system prompt, messages) to `https://openrouter.ai/api/v1/chat/completions` using the chosen API key.
    *   Handles the response from OpenRouter (success or error).
    *   Returns the AI's reply (or error details) to the frontend.
3.  **Frontend (`static/script.js`)**: Displays the AI's response or an error message.

## 8. Page Functionality (Frontend)

All frontend pages are static HTML files served from `src/main/resources/static/`.

*   **`index.html` (`script.js`)**:
    *   Main chat interface.
    *   Sends messages to `POST /api/chat`.
    *   Fetches visible instructions via `GET /api/instructions` to display.
    *   Displays AI responses and errors.
*   **`admin.html` (`admin_script.js`)**:
    *   Requires Basic Authentication (`admin`/password from `WebSecurityConfig`).
    *   Manages *all* Training Instructions (including hidden) via `/api/instructions/*` endpoints (GET/POST/PUT/DELETE).
    *   Sets the default AI model via `/api/chat/*` endpoints.
*   **`training.html` (`training_script.js`)**:
    *   User customization panel.
    *   Manages *visible* Training Instructions via `/api/instructions` (GET/POST).
    *   Manages Memory Facts via `/api/memory/*` endpoints (GET/POST/PUT/DELETE).
    *   Allows user to select their preferred model for the session via `/api/chat/*`.
*   **`api_key_setup.html` (`api_key_script.js`)**:
    *   Form for users to submit their OpenRouter API key.
    *   Sends key to `POST /api/chat/save-key`, which stores it in the server-side `HttpSession`.
*   **`debug-models.html`**:
    *   Lists available models fetched from `GET /api/chat/debug/models`.

## 9. Static Folder Interaction

*   The `src/main/resources/static` directory is the web root. Spring Boot serves files directly from here.
*   `http://localhost:8000/` serves `static/index.html`.
*   `http://localhost:8000/admin.html` serves `static/admin.html`, etc.
*   JavaScript files in this directory (`script.js`, `admin_script.js`, etc.) use the `fetch` API to communicate with the backend REST endpoints (e.g., `/api/chat`, `/api/memory`, `/api/instructions`).
*   The `static/README.md` file contains information specific to the frontend examples or potentially older OpenAI CLI usage notes; it is **not** relevant for setting up or running the main Java backend application.

## 10. Database Structure

*   **Type:** H2 File Database.
*   **Location:** `./data/snapbackdb.mv.db` (relative to execution directory).
*   **Access:** Via Spring Data JPA Repositories.
*   **Tables (mapped from Entities):**
    *   `APP_SETTINGS`: Key-value store for settings (e.g., `default_model`).
    *   `MEMORY_FACT`: Stores AI persona facts (`id`, `fact_text`).
    *   `TRAINING_INSTRUCTION`: Stores AI behavioral instructions (`id`, `instruction_text`, `is_hidden`).
*   **H2 Console:** Access `http://localhost:8000/h2-console`.
    *   JDBC URL: `jdbc:h2:file:./data/snapbackdb`
    *   User Name: `sa`
    *   Password: (leave blank)

## 11. Troubleshooting

*   **Incorrect Java Version:** Ensure JDK 17+ is active (`java -version`). Build errors or runtime issues can occur with incompatible versions.
*   **`OPENROUTER_API_KEY` Not Set/Incorrect:**
    *   **Symptom:** Errors on startup mentioning "Server trial API key... is not configured", or `401 Unauthorized` / `500 Internal Server Error` during chat requests.
    *   **Solution:** Verify the `OPENROUTER_API_KEY` environment variable is correctly set *before* starting the application via Maven or JAR. Ensure the key itself is valid on OpenRouter.ai. Remember `run-dev.sh` uses its own hardcoded key.
*   **Port Conflict (8000 or 8081):**
    *   **Symptom:** Error message like "Port 8000 was already in use".
    *   **Solution:** Stop the process using the port, or configure a different port in `src/main/resources/application.properties` (`server.port=...`) for standard runs. Note `run-dev.sh` specifically uses 8081.
*   **Admin Page Access Denied (401/403):**
    *   **Symptom:** Cannot access `admin.html` or related API endpoints.
    *   **Solution:** Ensure you are providing the correct Basic Authentication credentials (default: user `admin`, password `password` - check `WebSecurityConfig.java`).
*   **Database Issues:**
    *   **DB Locked:** `Database may be already in use...` - Ensure only one instance of the application is running and accessing the `./data/snapbackdb.mv.db` file. Stop other instances or H2 console connections.
    *   **Permissions:** Ensure the application has write permissions to the `data/` directory where it's being run.
*   **Build Errors (`./mvnw package`):** Check console output for specific compilation errors or test failures. Ensure JDK 17+ is used.
*   **`./mvnw` Permission Denied:** Run `chmod +x mvnw` (Linux/macOS) to make the wrapper executable.

## 12. Development Notes

*   Use `./mvnw spring-boot:run` (with `OPENROUTER_API_KEY` env var set) for standard development, leveraging DevTools auto-reloading.
*   Use the H2 console (`/h2-console`) to inspect database contents during development.
*   Remember Basic Authentication is required for certain administrative API endpoints defined in `TrainingInstructionController` and potentially others secured in `WebSecurityConfig.java`.

## 13. Frontend Overview

The frontend is composed of static HTML, CSS, and JavaScript files located in `src/main/resources/static/`. It interacts with the Spring Boot backend exclusively through the defined REST API endpoints (`/api/*`). There is no frontend build process; the files are served as-is by the backend.
