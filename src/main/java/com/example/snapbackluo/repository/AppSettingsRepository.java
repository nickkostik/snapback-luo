package com.example.snapbackluo.repository;

import com.example.snapbackluo.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettings, String> {

    // Method to find a setting by its key
    Optional<AppSettings> findBySettingKey(String settingKey);
}