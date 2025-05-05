package com.example.snapbackluo.service;

import com.example.snapbackluo.model.AppSettings;
import com.example.snapbackluo.repository.AppSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Import Transactional

import java.util.Optional;

@Service
public class AppSettingsService {

    private static final String GLOBAL_DEFAULT_MODEL_KEY = "global.default.model";
    // Fallback default model if nothing is set in the database
    private static final String FALLBACK_DEFAULT_MODEL = "qwen/qwen-2-72b-instruct";

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    /**
     * Retrieves the globally configured default model ID.
     * Falls back to a hardcoded default if the setting is not found in the database.
     *
     * @return The global default model ID.
     */
    public String getGlobalDefaultModel() {
        Optional<AppSettings> setting = appSettingsRepository.findBySettingKey(GLOBAL_DEFAULT_MODEL_KEY);
        return setting.map(AppSettings::getSettingValue).orElse(FALLBACK_DEFAULT_MODEL);
    }

    /**
     * Sets the global default model ID in the persistent storage.
     * Creates the setting if it doesn't exist, otherwise updates it.
     *
     * @param modelId The new global default model ID to set.
     */
    @Transactional // Ensure the operation is atomic
    public void setGlobalDefaultModel(String modelId) {
        if (modelId == null || modelId.trim().isEmpty()) {
            // Optionally handle invalid input, e.g., throw an exception or log a warning
            System.err.println("Attempted to set an empty or null global default model.");
            return; // Or throw new IllegalArgumentException("Model ID cannot be empty.");
        }

        AppSettings setting = appSettingsRepository.findBySettingKey(GLOBAL_DEFAULT_MODEL_KEY)
                .orElse(new AppSettings(GLOBAL_DEFAULT_MODEL_KEY, modelId.trim())); // Create if not found

        setting.setSettingValue(modelId.trim()); // Update value
        appSettingsRepository.save(setting); // Save (inserts or updates)
        System.out.println("Global default model updated to: " + modelId.trim());
    }
}