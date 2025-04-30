#!/bin/bash

echo "Starting Snapback Luo backend with DevTools enabled..."
echo "The application will automatically restart when files change."

# Set JAVA_HOME
export JAVA_HOME=/home/opc/jdk-21.0.7+6
export PATH=$JAVA_HOME/bin:$PATH

echo "Using Java from: $JAVA_HOME"
java -version

# Navigate to the project directory
cd "$(dirname "$0")"

# Run the Spring Boot application with DevTools enabled
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=true -Dspring.devtools.livereload.enabled=true"

# Note: If you're using Maven wrapper (mvnw), make sure it's executable
# chmod +x mvnw
