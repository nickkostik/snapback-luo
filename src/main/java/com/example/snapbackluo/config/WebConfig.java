package com.example.snapbackluo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Map paths directly to the static HTML files
        // Spring Boot automatically serves files from classpath:/static/
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/training").setViewName("forward:/training.html");
        registry.addViewController("/api_key").setViewName("forward:/api_key_setup.html");
        registry.addViewController("/admin").setViewName("forward:/admin.html");
    }
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                // Allow all origins for development - review for production
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
