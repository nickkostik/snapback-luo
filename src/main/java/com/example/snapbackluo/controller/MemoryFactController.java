package com.example.snapbackluo.controller;

import com.example.snapbackluo.model.MemoryFact;
import com.example.snapbackluo.repository.MemoryFactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/memory")
// TODO: Add @CrossOrigin annotation later for frontend communication
public class MemoryFactController {

    @Autowired
    private MemoryFactRepository repository;

    // Get all memory facts
    @GetMapping
    public List<MemoryFact> getAllMemoryFacts() {
        return repository.findAll();
    }

    // Add a new memory fact
    @PostMapping
    public ResponseEntity<MemoryFact> addMemoryFact(@RequestBody MemoryFact fact) {
        // Basic validation: ensure text is not null or empty
        if (fact.getFactText() == null || fact.getFactText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build(); // Return 400 Bad Request
        }
        try {
            MemoryFact savedFact = repository.save(fact);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedFact);
        } catch (Exception e) {
            // Log exception e
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Update an existing memory fact
    @PutMapping("/{id}")
    public ResponseEntity<MemoryFact> updateMemoryFact(@PathVariable Long id, @RequestBody MemoryFact fact) {
        // Validate input
        if (fact.getFactText() == null || fact.getFactText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build(); // Return 400 Bad Request
        }
        
        try {
            // Check if the memory fact exists
            Optional<MemoryFact> existingFact = repository.findById(id);
            if (!existingFact.isPresent()) {
                return ResponseEntity.notFound().build(); // Return 404 Not Found
            }
            
            // Update the existing fact with new text
            MemoryFact factToUpdate = existingFact.get();
            factToUpdate.setFactText(fact.getFactText());
            
            // Save the updated fact
            MemoryFact updatedFact = repository.save(factToUpdate);
            return ResponseEntity.ok(updatedFact);
        } catch (Exception e) {
            // Log exception e
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Delete a memory fact by ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMemoryFact(@PathVariable Long id) {
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
}
