package com.example.snapbackluo.repository;

import com.example.snapbackluo.model.MemoryFact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoryFactRepository extends JpaRepository<MemoryFact, Long> {
    // Custom query methods can be added here later if needed
    // Example: List<MemoryFact> findByTimestampAfter(LocalDateTime timestamp);
}