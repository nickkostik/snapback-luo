# Snapback Luo AI Backend (`snapbackluo`)

This project contains the backend services for the Snapback Luo AI application. It is built using Java and the Spring Boot framework.

## Prerequisites

*   Java Development Kit (JDK) version 17 or higher.
*   Maven (The project uses the Maven wrapper `./mvnw`, so a separate Maven installation is not strictly required if you have a JDK).

## Installation and Building

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nickkostik/snapback-luo.git
    cd snapback-luo-backend
    ```
2.  **Build the project:**
    Use the Maven wrapper to compile the code and package it into a JAR file.
    ```bash
    ./mvnw package
    ```
    This will create the executable JAR file in the `target/` directory.

## Running the Application

### Standard Run

You can run the application using the Maven wrapper:
```bash
./mvnw spring-boot:run
```
The application will start, and you can access it at `http://localhost:8080` (or the configured port).

### Development Run (with Hot Reload)

For development, a script is provided to run the application with Spring Boot DevTools enabled, which allows for automatic restarts and live reloading when code changes are detected.

1.  **Make the script executable (if needed):**
    ```bash
    chmod +x run-dev.sh
    ```
2.  **Run the script:**
    ```bash
    ./run-dev.sh
    ```
This script handles setting up the environment and running the application with development-friendly features.