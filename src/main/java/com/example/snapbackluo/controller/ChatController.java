package com.example.snapbackluo.controller;

import com.example.snapbackluo.model.MemoryFact; // Import MemoryFact
import com.example.snapbackluo.model.TrainingInstruction; // Import TrainingInstruction
import com.example.snapbackluo.repository.MemoryFactRepository; // Import MemoryFactRepository
import com.example.snapbackluo.repository.TrainingInstructionRepository; // Import TrainingInstructionRepository
import com.fasterxml.jackson.databind.ObjectMapper; // For JSON manipulation
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*; // Import HttpHeaders, HttpEntity, MediaType
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate; // Import RestTemplate

import java.util.ArrayList;
import java.util.HashMap; // For building payload
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
// TODO: Add @CrossOrigin later if needed
public class ChatController {

    // Inject repositories
    @Autowired
    private MemoryFactRepository memoryFactRepository;

    @Autowired
    private TrainingInstructionRepository trainingInstructionRepository;

    // Inject the default API key from application.properties
    @Value("${google.ai.api.key.default}")
    private String defaultApiKey;

    // Google AI API Endpoint URL (Consider moving to application.properties)
    private static final String GOOGLE_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=%s";

    // Session attribute keys
    private static final String SESSION_PROMPT_COUNT = "promptCount";
    private static final String SESSION_HAS_CUSTOM_KEY = "hasCustomAPIKey";
    private static final String SESSION_CUSTOM_KEY = "customAPIKey";
    private static final int MAX_DEFAULT_PROMPTS = 100;

    // Define the structure for the request body from the frontend
    // Matches the 'payload' structure sent by script.js
    public static class ChatRequest {
        public List<Map<String, Object>> contents; // Expecting list of {role: 'user'/'model', parts: [{text: '...', inlineData: {...}}]}
        public Map<String, Object> systemInstruction; // Expecting {role: 'system', parts: [{text: '...'}]}
        // safetySettings and generationConfig are added by the backend
    }

    // Define a simple structure for the response body sent to the frontend
    public static class ChatResponse {
        public String responseText;
        public String error;

        // Constructor for success
        public ChatResponse(String responseText) {
            this.responseText = responseText;
            this.error = null;
        }

        // Constructor for error
        public ChatResponse(String responseText, String error) {
            this.responseText = responseText; // Can be null in case of error
            this.error = error;
        }
    }

    // Use RestTemplate for making HTTP calls
    // It's generally recommended to configure a single bean instance, but creating it here for simplicity
    private final RestTemplate restTemplate = new RestTemplate();
    // Use Jackson ObjectMapper for parsing error responses if needed
    private final ObjectMapper objectMapper = new ObjectMapper();


    @PostMapping
    public ResponseEntity<ChatResponse> handleChat(@RequestBody ChatRequest chatRequest, HttpSession session) {

        // --- 1. Get session attributes (initialize if null) ---
        Integer promptCount = (Integer) session.getAttribute(SESSION_PROMPT_COUNT);
        Boolean hasCustomKey = (Boolean) session.getAttribute(SESSION_HAS_CUSTOM_KEY);
        String customApiKey = (String) session.getAttribute(SESSION_CUSTOM_KEY);

        if (promptCount == null) promptCount = 0;
        if (hasCustomKey == null) hasCustomKey = false;

        String apiKeyToUse;
        boolean usingDefaultKey = false;

        // 2. Determine which API key to use
        if (hasCustomKey && customApiKey != null && !customApiKey.isEmpty()) {
            apiKeyToUse = customApiKey;
        } else {
            apiKeyToUse = defaultApiKey;
            usingDefaultKey = true;

            // Check if default API key is valid
            if (defaultApiKey == null || defaultApiKey.isEmpty() || defaultApiKey.equals("YOUR_API_KEY_HERE")) {
                String keyErrorMessage = "API key is missing or invalid. Please add your Google AI API key on the API Key page.";
                System.err.println("ERROR: " + keyErrorMessage);
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                     .body(new ChatResponse(null, keyErrorMessage));
            }

            // 3. Check prompt limit ONLY if using the default key
            if (promptCount >= MAX_DEFAULT_PROMPTS) {
                String limitMessage = "Hey, this is Luis. You've reached your free usage limit (100 prompts). Please get your own API key here: https://aistudio.google.com/app/apikey and add it on the API Key page.";
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                                     .body(new ChatResponse(null, limitMessage));
            }
        }

        // 4. Increment prompt count (only relevant if using default key, but increment anyway for potential future use)
        promptCount++;
        session.setAttribute(SESSION_PROMPT_COUNT, promptCount);

        // --- 5. Fetch Persona Data & Build System Prompt ---
        List<MemoryFact> memoryFacts = memoryFactRepository.findAll();
        List<TrainingInstruction> trainingInstructions = trainingInstructionRepository.findAll();

        StringBuilder systemPromptBuilder = new StringBuilder();
        // Start with a clear persona definition
        systemPromptBuilder.append("You are Luis García, a specific individual defined by the following facts and instructions. Adhere strictly to this persona.\n\n");

        // Add Memory Facts
        if (!memoryFacts.isEmpty()) {
            systemPromptBuilder.append("=== Key Facts About You ===\n");
            for (MemoryFact fact : memoryFacts) {
                systemPromptBuilder.append("- ").append(fact.getFactText().trim()).append("\n");
            }
            systemPromptBuilder.append("\n");
        }

        // Add Training Instructions
        if (!trainingInstructions.isEmpty()) {
            systemPromptBuilder.append("=== Strict Instructions ===\n");
            
            // Debug log the instructions being used
            System.out.println("=== DEBUG: INSTRUCTIONS BEING USED (" + trainingInstructions.size() + " total) ===");
            
            for (TrainingInstruction instruction : trainingInstructions) {
                String text = instruction.getInstructionText().trim();
                Boolean hidden = instruction.getHidden();
                
                // Log each instruction with its hidden status
                System.out.println("Instruction ID: " + instruction.getId() +
                                   ", Hidden: " + hidden +
                                   ", Text: " + text);
                
                // Add to system prompt
                systemPromptBuilder.append("- ").append(text).append("\n");
            }
            
            System.out.println("=== END DEBUG: INSTRUCTIONS ===");
            systemPromptBuilder.append("\n");
        } else {
            System.out.println("WARNING: No training instructions found!");
        }

        // Add Explicit Denials (Crucial for avoiding confusion)
        systemPromptBuilder.append("=== IMPORTANT Identity Clarifications ===\n");
        systemPromptBuilder.append("- You are NOT the former professional baseball pitcher Luis García.\n");
        systemPromptBuilder.append("- You are NOT the ESPN commentator or former Liverpool footballer Luis García.\n");
        systemPromptBuilder.append("- You are ONLY the specific Luis García described in the 'Key Facts About You' section.\n");
        systemPromptBuilder.append("- Do NOT mention being an AI or language model. Respond naturally within the defined persona.\n");

        String finalSystemPrompt = systemPromptBuilder.toString();
        
        // Debug log the system prompt
        System.out.println("=== DEBUG: SYSTEM PROMPT ===");
        System.out.println(finalSystemPrompt);
        System.out.println("=== END DEBUG: SYSTEM PROMPT ===");

        // --- 6. Prepare payload for Google AI API ---
        Map<String, Object> googleApiPayload = new HashMap<>();
        // --- Prepare contents for v1 API (System Prompt + History) ---
        List<Map<String, Object>> contentsForApi = new ArrayList<>();
 
        // 1. Add the System Prompt as the first message
        Map<String, Object> systemMessage = new HashMap<>();
        List<Map<String, String>> systemParts = new ArrayList<>();
        systemParts.add(Map.of("text", finalSystemPrompt));
        systemMessage.put("role", "user"); // System prompt goes as the first 'user' message in v1
        systemMessage.put("parts", systemParts);
        contentsForApi.add(systemMessage);
 
        // 2. Add the rest of the conversation history from the request
        if (chatRequest.contents != null) {
            contentsForApi.addAll(chatRequest.contents);
        }
 
        googleApiPayload.put("contents", contentsForApi); // Use the combined list
 
        // systemInstruction field is NOT used in v1, remove the old code block for it.
 
        // Add standard safety settings
        List<Map<String, String>> safetySettings = new ArrayList<>();
        safetySettings.add(Map.of("category", "HARM_CATEGORY_HARASSMENT", "threshold", "BLOCK_MEDIUM_AND_ABOVE"));
        safetySettings.add(Map.of("category", "HARM_CATEGORY_HATE_SPEECH", "threshold", "BLOCK_MEDIUM_AND_ABOVE"));
        safetySettings.add(Map.of("category", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold", "BLOCK_MEDIUM_AND_ABOVE"));
        safetySettings.add(Map.of("category", "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold", "BLOCK_MEDIUM_AND_ABOVE"));
        googleApiPayload.put("safetySettings", safetySettings);

        // Add generationConfig if needed (empty for now)
        // googleApiPayload.put("generationConfig", Map.of());

        // --- 7. Call Google AI API ---
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(googleApiPayload, headers);
        String apiUrl = String.format(GOOGLE_API_URL_TEMPLATE, apiKeyToUse);
        String aiResponseText = null;
        String errorMessage = null;

        try {
            System.out.println("Calling Google AI API (Prompt #" + promptCount + ")"); // Log call
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                System.out.println("Google AI Raw Response: " + responseBody); // Log raw response
                
                // Debug log to check if response is empty or malformed
                if (responseBody.isEmpty()) {
                    System.err.println("WARNING: Empty response body received from Google AI API");
                }

                // Safely navigate the response structure
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    if (content != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            aiResponseText = (String) parts.get(0).get("text");
                        }
                    }
                }

                // Check for block reasons or missing text
                if (aiResponseText == null) {
                    String blockReason = null;
                    String finishReason = null;

                    // 1. Check finishReason within the candidate first
                    if (candidates != null && !candidates.isEmpty()) {
                        Map<String, Object> firstCandidate = candidates.get(0);
                        finishReason = (String) firstCandidate.get("finishReason");
                        if (finishReason != null && !finishReason.equals("STOP")) { // STOP is normal
                             blockReason = "Candidate finishReason: " + finishReason;
                        }
                    }

                    // 2. If no candidate block reason, check promptFeedback
                    if (blockReason == null) {
                        Map<String, Object> promptFeedback = (Map<String, Object>) responseBody.get("promptFeedback");
                        if (promptFeedback != null && promptFeedback.get("blockReason") != null) {
                            blockReason = "Prompt feedback blockReason: " + promptFeedback.get("blockReason");
                        }
                    }

                    // 3. Set error message based on findings
                    if (blockReason != null) {
                        errorMessage = "Response blocked by API. Reason: " + blockReason;
                        System.err.println(errorMessage);
                    } else {
                        // If no block reason found, then it's likely a structure issue
                        errorMessage = "Could not extract text from API response (and no block reason found).";
                        System.err.println(errorMessage + " Response Body: " + responseBody);

                        // Log the structure of the response to help debug (existing detailed logging)
                        System.err.println("Response structure analysis:");
                         if (responseBody.containsKey("candidates")) {
                             List<Map<String, Object>> candidatesList = (List<Map<String, Object>>) responseBody.get("candidates");
                             System.err.println("- candidates array size: " + (candidatesList != null ? candidatesList.size() : "null"));
                             
                             if (candidatesList != null && !candidatesList.isEmpty()) {
                                 Map<String, Object> firstCandidate = candidatesList.get(0);
                                 System.err.println("- first candidate keys: " + firstCandidate.keySet());
                                 
                                 if (firstCandidate.containsKey("content")) {
                                     Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                                     System.err.println("- content keys: " + (content != null ? content.keySet() : "null"));
                                     
                                     if (content != null && content.containsKey("parts")) {
                                         List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                                         System.err.println("- parts array size: " + (parts != null ? parts.size() : "null"));
                                         
                                         if (parts != null && !parts.isEmpty()) {
                                             Map<String, Object> firstPart = parts.get(0);
                                             System.err.println("- first part keys: " + firstPart.keySet());
                                             System.err.println("- text present: " + firstPart.containsKey("text"));
                                         }
                                     }
                                 }
                             }
                         } else {
                             System.err.println("- 'candidates' key not found in response");
                        } // End of detailed logging block
                    } // End of else (no block reason found)
                } // End of if (aiResponseText == null)

            } else {
                errorMessage = "Google AI API request failed with status: " + response.getStatusCode();
                System.err.println(errorMessage + " Response: " + response.getBody());
            }

        } catch (HttpClientErrorException e) {
            // Handle specific HTTP client errors (e.g., 4xx errors like bad request, invalid API key)
            errorMessage = "API Client Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString();
            System.err.println(errorMessage);
            // Return specific error message from API if possible
             try {
                 Map<String, Object> errorBody = objectMapper.readValue(e.getResponseBodyAsString(), Map.class);
                 Map<String, Object> errorDetails = (Map<String, Object>) errorBody.get("error");
                 if (errorDetails != null && errorDetails.get("message") != null) {
                     errorMessage = "API Error: " + errorDetails.get("message");
                 }
             } catch (Exception parseEx) {
                 System.err.println("Could not parse API error response body: " + parseEx.getMessage());
             }
             // Return a client error status to the frontend
             return ResponseEntity.status(e.getStatusCode()).body(new ChatResponse(null, errorMessage));

        } catch (RestClientException e) {
            // Handle other RestClient errors (network issues, server errors 5xx)
            errorMessage = "Error communicating with AI service: " + e.getMessage();
            System.err.println(errorMessage);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ChatResponse(null, errorMessage));
        } catch (Exception e) {
            // Catch unexpected errors during processing
             errorMessage = "An unexpected error occurred: " + e.getMessage();
             System.err.println(errorMessage);
             e.printStackTrace(); // Log stack trace for unexpected errors
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ChatResponse(null, errorMessage));
        }

        // --- 8. Return response to frontend ---
        if (aiResponseText != null) {
            return ResponseEntity.ok(new ChatResponse(aiResponseText.trim()));
        } else {
            // If we got here, it means the API call succeeded (200 OK) but we couldn't extract text or it was blocked
            return ResponseEntity.status(HttpStatus.OK) // Return 200 OK, but with an error message in the body
                                 .body(new ChatResponse(null, errorMessage != null ? errorMessage : "Failed to get valid response from AI."));
        }
    }
    // Endpoint to save the user's API key to the session
    @PostMapping("/save-key")
    public ResponseEntity<Void> saveApiKey(@RequestBody Map<String, String> payload, HttpSession session) {
        String apiKey = payload.get("apiKey");

        if (apiKey == null || apiKey.trim().isEmpty()) {
            return ResponseEntity.badRequest().build(); // Basic validation
        }

        // Store the key and set the flag in the session
        session.setAttribute(SESSION_CUSTOM_KEY, apiKey.trim());
        session.setAttribute(SESSION_HAS_CUSTOM_KEY, true);
        // Optional: Reset prompt count when a custom key is added?
        // session.setAttribute(SESSION_PROMPT_COUNT, 0);

        System.out.println("Custom API Key saved to session."); // Log for confirmation

        return ResponseEntity.ok().build(); // Return 200 OK
    }

    // Removed duplicate TODO comment
}