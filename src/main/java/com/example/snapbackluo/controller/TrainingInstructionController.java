package com.example.snapbackluo.controller;

import com.example.snapbackluo.model.TrainingInstruction;
import com.example.snapbackluo.repository.TrainingInstructionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

import java.util.List;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/instructions")
// TODO: Add @CrossOrigin annotation later for frontend communication
public class TrainingInstructionController {

    @Autowired
    private TrainingInstructionRepository repository;

    // Get all visible (non-hidden) instructions for the frontend
    @GetMapping
    public List<TrainingInstruction> getAllVisibleInstructions() {
        return repository.findByHiddenFalse();
    }
    
    // Get all instructions (both hidden and visible) - for internal use by the AI
    @GetMapping("/all")
    public List<TrainingInstruction> getAllInstructions() {
        return repository.findAll();
    }

    // Reset all instructions (DANGEROUS - only for development/testing)
    @PostMapping("/reset-all")
    public ResponseEntity<String> resetAllInstructions() {
        System.out.println("WARNING: Deleting all instructions and reinitializing hardcoded ones");
        repository.deleteAll();
        initializeHardcodedInstructions();
        return ResponseEntity.ok("All instructions reset. Only hardcoded instructions remain.");
    }
    
    // Add a hidden instruction (for admin use)
    @PostMapping("/add-hidden")
    public ResponseEntity<TrainingInstruction> addHiddenInstructionEndpoint(@RequestBody TrainingInstruction instruction) {
        // Basic validation: ensure text is not null or empty
        if (instruction.getInstructionText() == null || instruction.getInstructionText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build(); // Return 400 Bad Request
        }
        
        try {
            // Set the instruction as hidden
            instruction.setHidden(true);
            TrainingInstruction savedInstruction = repository.save(instruction);
            System.out.println("Added hidden instruction via admin panel: " + savedInstruction.getInstructionText());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedInstruction);
        } catch (Exception e) {
            // Log exception e
            System.err.println("Error adding hidden instruction: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Toggle instruction visibility
    @PostMapping("/{id}/toggle-visibility")
    public ResponseEntity<TrainingInstruction> toggleInstructionVisibility(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> payload) {
        
        Boolean hidden = payload.get("hidden");
        if (hidden == null) {
            return ResponseEntity.badRequest().build(); // Return 400 Bad Request
        }
        
        try {
            // Find the instruction
            Optional<TrainingInstruction> optionalInstruction = repository.findById(id);
            if (!optionalInstruction.isPresent()) {
                return ResponseEntity.notFound().build(); // Return 404 Not Found
            }
            
            // Update the visibility
            TrainingInstruction instruction = optionalInstruction.get();
            instruction.setHidden(hidden);
            TrainingInstruction savedInstruction = repository.save(instruction);
            
            System.out.println("Toggled instruction visibility: ID=" + id +
                               ", Text=" + savedInstruction.getInstructionText() +
                               ", Hidden=" + savedInstruction.getHidden());
            
            return ResponseEntity.ok(savedInstruction);
        } catch (Exception e) {
            // Log exception e
            System.err.println("Error toggling instruction visibility: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Force initialization of hardcoded instructions
    @PostMapping("/init-hardcoded")
    public ResponseEntity<String> forceInitHardcoded() {
        System.out.println("Manually triggering initialization of hardcoded instructions");
        initializeHardcodedInstructions();
        return ResponseEntity.ok("Hardcoded instructions initialization triggered");
    }
    
    // Debug endpoint to get all instructions (both hidden and visible)
    @GetMapping("/debug")
    public List<Map<String, Object>> getAllInstructionsDebug() {
        List<TrainingInstruction> allInstructions = repository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (TrainingInstruction instruction : allInstructions) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", instruction.getId());
            item.put("text", instruction.getInstructionText());
            item.put("hidden", instruction.getHidden());
            result.add(item);
        }
        
        return result;
    }
    
    // Add a new instruction
    @PostMapping
    public ResponseEntity<TrainingInstruction> addInstruction(@RequestBody TrainingInstruction instruction) {
        // Basic validation: ensure text is not null or empty
        if (instruction.getInstructionText() == null || instruction.getInstructionText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build(); // Return 400 Bad Request
        }
        try {
            // Ensure new instructions from users are marked as visible
            instruction.setHidden(false);
            TrainingInstruction savedInstruction = repository.save(instruction);
            System.out.println("Saved new visible instruction with ID: " + savedInstruction.getId() +
                               ", Text: " + savedInstruction.getInstructionText());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedInstruction);
        } catch (Exception e) {
            // Log exception e
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Delete an instruction by ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInstruction(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build(); // Return 404 Not Found
        }
        try {
            repository.deleteById(id);
            return ResponseEntity.noContent().build(); // Return 204 No Content
        } catch (Exception e) {
            // Log exception e
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Add a hidden instruction (for internal use)
    private TrainingInstruction addHiddenInstruction(String instructionText) {
        System.out.println("Adding hidden instruction: " + instructionText);
        TrainingInstruction instruction = new TrainingInstruction();
        instruction.setInstructionText(instructionText);
        instruction.setHidden(true);
        TrainingInstruction saved = repository.save(instruction);
        System.out.println("Saved hidden instruction with ID: " + saved.getId());
        return saved;
    }
    
    // Initialize hardcoded instructions when the application starts
    @EventListener(ContextRefreshedEvent.class)
    public void initializeHardcodedInstructions() {
        System.out.println("Starting initialization of hardcoded instructions...");
        
        // First, log all existing instructions
        List<TrainingInstruction> existingInstructions = repository.findAll();
        System.out.println("Found " + existingInstructions.size() + " existing instructions:");
        for (TrainingInstruction instruction : existingInstructions) {
            System.out.println("ID: " + instruction.getId() +
                               ", Text: " + instruction.getInstructionText() +
                               ", Hidden: " + instruction.getHidden());
        }
        
        // Preserve existing instructions by marking them as visible if hidden is null
        int updatedCount = 0;
        for (TrainingInstruction instruction : existingInstructions) {
            if (instruction.getHidden() == null) {
                instruction.setHidden(false);
                repository.save(instruction);
                updatedCount++;
            }
        }
        System.out.println("Updated " + updatedCount + " existing instructions to set hidden=false");
        
        // Add hardcoded instructions if they don't already exist
        // Hardcoded core personality instructions for Luis Garcia
        List<String> hardcodedInstructions = Arrays.asList(
            "Always refer to yourself as Luis Garcia.",
            "Use casual language and slang in your responses.",
            "Be passionate about basketball, especially the Lakers.",
            "Occasionally make sarcastic comments.",
            "Show a slight dislike for the Boston Celtics.",
            "Mention your snapback hat collection when relevant.",
            "Express strong opinions about food, especially loving tacos.",
            "Use 'bro' and 'man' occasionally when addressing users.",
            "Be knowledgeable but not overly formal about sports statistics."
        );
        
        // Check for each hardcoded instruction if it already exists
        int addedCount = 0;
        for (String instructionText : hardcodedInstructions) {
            // Check if this instruction text already exists in any form (hidden or visible)
            boolean exists = existingInstructions.stream()
                .anyMatch(instruction -> instructionText.equals(instruction.getInstructionText()));
            
            if (!exists) {
                // Only add new hardcoded instructions as hidden
                addHiddenInstruction(instructionText);
                addedCount++;
            } else {
                // Log that we found an existing instruction with this text
                System.out.println("Found existing instruction with text: " + instructionText);
                
                // Important: Don't modify existing instructions that match hardcoded ones
                // They should keep their current hidden/visible status
            }
        }
        
        System.out.println("Added " + addedCount + " new hardcoded instructions");
        
        // Log final state
        List<TrainingInstruction> finalInstructions = repository.findAll();
        System.out.println("Final state: " + finalInstructions.size() + " total instructions");
        System.out.println("Visible instructions: " + repository.findByHiddenFalse().size());
    }
}