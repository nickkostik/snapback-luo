# Development Guide for Snapback Luo Backend

This guide explains how to set up and use the automatic restart feature for the Snapback Luo backend application.

## Automatic Restart with Spring Boot DevTools

The application is configured to automatically restart when files are changed, including:
- Java source files
- Static resources (HTML, CSS, JavaScript)
- Configuration files

This is achieved using Spring Boot DevTools, which is already included in the project dependencies.

## Running the Application in Development Mode

### Option 1: Using the run-dev.sh Script

We've provided a convenient script to start the application with DevTools enabled:

```bash
./run-dev.sh
```

This script will start the Spring Boot application with the appropriate settings for automatic restart.

### Option 2: Manual Start with Maven

If you prefer to run the application manually, you can use the following command:

```bash
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=true -Dspring.devtools.livereload.enabled=true"
```

## How It Works

1. **Automatic Restart**: When you modify Java files or configuration files, the application will automatically restart.

2. **LiveReload**: When you modify static resources (HTML, CSS, JS), the browser will automatically refresh if you have the LiveReload browser extension installed.

3. **Static Resources**: Changes to files in the `src/main/resources/static` directory are detected and trigger appropriate actions.

4. **No Caching**: Static resources are served without caching to ensure you always see the latest version.

## LiveReload Browser Extension

For the best development experience, install the LiveReload browser extension:

- [Chrome LiveReload Extension](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei)
- [Firefox LiveReload Extension](https://addons.mozilla.org/en-US/firefox/addon/livereload-web-extension/)

After installing the extension, enable it when your application is running to automatically refresh the browser when static resources change.

## Troubleshooting

If automatic restart is not working:

1. Make sure the application is running with DevTools enabled (using one of the methods above)
2. Check the console output for any errors
3. Verify that the file you modified is in a location that triggers a restart
4. Try restarting the application manually

## Additional Configuration

The DevTools configuration is in `application.properties`:

```properties
spring.devtools.restart.enabled=true
spring.devtools.livereload.enabled=true
spring.devtools.restart.additional-paths=src/main/resources/static
spring.resources.static-locations=classpath:/static/
spring.resources.cache.period=0
```

You can modify these settings if needed.
