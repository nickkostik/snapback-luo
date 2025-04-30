package com.example.snapbackluo.repository;

import com.example.snapbackluo.model.TrainingInstruction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingInstructionRepository extends JpaRepository<TrainingInstruction, Long> {
    // Find all non-hidden instructions
    List<TrainingInstruction> findByHiddenFalse();
}