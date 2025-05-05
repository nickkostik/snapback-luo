# Development Guide: Snapback Luo Backend

This guide focuses on the development workflow for the Snapback Luo backend, specifically leveraging Spring Boot DevTools for automatic application restarts and browser LiveReload.

For a complete project overview, setup instructions (including mandatory API key configuration), deployment details, and feature explanations, please refer to the main [README.md](README.md).

## Prerequisites

*   **JDK 17+**: Ensure you have Java Development Kit version 17 or higher installed and configured.
*   **OpenRouter API Key**: For the standard development workflow (`./mvnw spring-boot:run`), you **must** set the `OPENROUTER_API_KEY` environment variable. See `README.md` section 4.3 for details on how to set it.

## Development Workflow with DevTools

The project includes the `spring-boot-devtools` dependency (see `pom.xml`), which provides features to speed up the development cycle. These are enabled by default via settings in `src/main/resources/application.properties`.

### Key Features Enabled:

*   **Automatic Restart**: When you save changes to Java files (in `src/main/java`) or configuration files (like `application.properties`), Spring Boot DevTools will automatically restart the application context quickly. You'll see restart logs in the console.
*   **LiveReload**: When you save changes to static resources (HTML, CSS, JavaScript files in `src/main/resources/static`), DevTools triggers a LiveReload event. If you have the LiveReload browser extension installed and enabled, your browser will automatically refresh the page.
*   **Disabled Caching**: Static resources are served with caching disabled (`spring.resources.cache.period=0` in `application.properties`) during development to ensure you always see the latest changes.

### Recommended LiveReload Browser Extension:

Install the extension for your browser to take advantage of automatic page refreshes:

*   [Chrome LiveReload Extension](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei)
*   [Firefox LiveReload Extension](https://addons.mozilla.org/en-US/firefox/addon/livereload-web-extension/)

Remember to enable the extension in your browser tab after starting the application.

## Running the Application for Development

There are two main ways to run the application during development:

### Option 1: Standard Development Run (Recommended)

This method uses the standard Spring Boot Maven plugin and respects the configurations in `application.properties`.

1.  **Set API Key**: Ensure the `OPENROUTER_API_KEY` environment variable is set in your terminal session (see Prerequisites and `README.md`).
2.  **Run:**
    ```bash
    # Linux/macOS
    ./mvnw spring-boot:run

    # Windows
    mvnw.cmd spring-boot:run
    ```
3.  **Behavior:**
    *   Starts the application on the port defined in `application.properties` (default: `8000`).
    *   Uses the `OPENROUTER_API_KEY` from your environment.
    *   **DevTools (Restart & LiveReload) are automatically active.**

This is the recommended approach for most development tasks as it mirrors the standard configuration.

### Option 2: Using the `run-dev.sh` Script (Quick Test)

This script provides a quick way to run the application but with specific overrides. **Use with caution and be aware of its behavior.**

1.  **Make Script Executable (One-time):**
    ```bash
    chmod +x run-dev.sh
    ```
2.  **(Important) Check/Edit API Key in Script:** The script uses a **hardcoded** OpenRouter API key inside `run-dev.sh`. This key might be invalid or need updating. **It bypasses the `OPENROUTER_API_KEY` environment variable.**
3.  **Run:**
    ```bash
    ./run-dev.sh
    ```
4.  **Behavior:**
    *   Sets a specific `JAVA_HOME` path within the script.
    *   Forces the application to run on port **8081**.
    *   Uses the **hardcoded** API key from within the script.
    *   **DevTools (Restart & LiveReload) are explicitly enabled via command-line arguments.**

Use this script primarily for quick tests where the hardcoded key and different port (8081) are acceptable and understood.

## DevTools Configuration (`application.properties`)

The following settings in `src/main/resources/application.properties` control the DevTools behavior:

```properties
# DevTools Configuration
spring.devtools.restart.enabled=true
spring.devtools.livereload.enabled=true
# Watch static files for changes too
spring.devtools.restart.additional-paths=src/main/resources/static
# Serve static files from classpath:/static/
spring.resources.static-locations=classpath:/static/
# Disable caching for static resources during development
spring.resources.cache.period=0
```

These settings ensure DevTools are active when running via `./mvnw spring-boot:run`. The `run-dev.sh` script also passes flags to ensure they are enabled, but these properties are the primary configuration.

## Troubleshooting DevTools

*   **Restart Not Happening**:
    *   Ensure you saved the file.
    *   Verify the changed file is under a path monitored by DevTools (e.g., `src/main/java`, `src/main/resources`).
    *   Check the console output for restart logs or any errors during restart.
    *   Ensure the application was started using one of the methods described above.
*   **LiveReload Not Working**:
    *   Ensure the LiveReload browser extension is installed AND enabled for the page.
    *   Verify you are changing files within `src/main/resources/static`.
    *   Check the browser's developer console and the application console for errors.
    *   Ensure `spring.devtools.livereload.enabled=true` is set (it is by default in `application.properties`).

Refer to the main [README.md](README.md) for general troubleshooting (API key issues, port conflicts, database problems, etc.).
