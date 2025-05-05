package com.example.snapbackluo.controller;

import com.example.snapbackluo.model.MemoryFact; // Import MemoryFact
import com.example.snapbackluo.model.TrainingInstruction; // Import TrainingInstruction
import com.example.snapbackluo.repository.MemoryFactRepository; // Import MemoryFactRepository
import com.example.snapbackluo.repository.TrainingInstructionRepository; // Import TrainingInstructionRepository
import com.fasterxml.jackson.databind.ObjectMapper; // For JSON manipulation
import com.example.snapbackluo.service.AppSettingsService; // Import AppSettingsService
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*; // Import HttpHeaders, HttpEntity, MediaType, HttpMethod
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException; // Added
import org.springframework.web.client.ResourceAccessException; // Added
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate; // Import RestTemplate

import java.util.ArrayList;
import java.util.HashMap; // For building payload
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors; // Added for history mapping

@RestController
@RequestMapping("/api/chat")
// TODO: Add @CrossOrigin later if needed
public class ChatController {

    // Inject repositories
    @Autowired
    private MemoryFactRepository memoryFactRepository;

    @Autowired
    private TrainingInstructionRepository trainingInstructionRepository;

    @Autowired
    private AppSettingsService appSettingsService; // Inject the service

    // Inject the server's trial API key from environment variable
    @Value("${OPENROUTER_API_KEY}")
    private String serverTrialApiKey;

    // OpenRouter API Configuration
    private static final String OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    private String openRouterModel = "qwen/qwen-2-72b-instruct"; // Default model, now configurable per session
    // private static final String DEFAULT_OPENROUTER_MODEL = "qwen/qwen-2-72b-instruct"; // No longer needed here, managed by AppSettingsService

    // Session attribute keys for OpenRouter
    private static final String SESSION_USER_API_KEY = "userOpenRouterApiKey";
    private static final String SESSION_SELECTED_MODEL = "selectedOpenRouterModel"; // New session key for model
    private static final String SESSION_PROMPT_COUNT = "openRouterPromptCount"; // Renamed for clarity
    private static final int TRIAL_PROMPT_LIMIT = 100; // Max prompts using server's trial key

    // Define the structure for the request body from the frontend
    // Matches the 'payload' structure sent by script.js
    public static class ChatRequest {
        public List<Map<String, Object>> contents; // Expecting list of {role: 'user'/'model', parts: [{text: '...', inlineData: {...}}]}
        public Map<String, Object> systemInstruction; // Expecting {role: 'system', parts: [{text: '...'}]}
        // safetySettings and generationConfig are added by the backend
    }

    // Define structure for the response body sent to the frontend, now supporting images
    public static class ChatResponse {
        public String responseText; // Text part of the response
        public Map<String, String> imageData; // Image part {mimeType: "...", data: "..."}
        public String error;

        // Constructor for success (text and/or image)
        // Handles text-only by passing null for imageData
        public ChatResponse(String responseText, Map<String, String> imageData) {
            this.responseText = responseText;
            this.imageData = imageData;
            this.error = null;
        }

        // Private constructor for error to avoid signature clash
        private ChatResponse(String error, boolean isErrorFlag) {
             this.responseText = null;
             this.imageData = null;
             this.error = error;
        }

        // Static factory method for creating error responses
        public static ChatResponse createErrorResponse(String error) {
            return new ChatResponse(error, true);
        }
    }

    // Use RestTemplate for making HTTP calls
    // It's generally recommended to configure a single bean instance, but creating it here for simplicity
    private final RestTemplate restTemplate = new RestTemplate();
    // Use Jackson ObjectMapper for parsing error responses if needed
    private final ObjectMapper objectMapper = new ObjectMapper();


    @PostMapping
    public ResponseEntity<ChatResponse> handleChat(@RequestBody ChatRequest chatRequest, HttpSession session) {

        // --- Log incoming request ---
        try {
            System.out.println("DEBUG: Incoming ChatRequest: " + objectMapper.writeValueAsString(chatRequest));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            System.err.println("DEBUG: Error logging incoming ChatRequest: " + e.getMessage());
        }

        // --- 1. Get OpenRouter session attributes (initialize if null) ---
        String userApiKey = (String) session.getAttribute(SESSION_USER_API_KEY);
        Integer promptCount = (Integer) session.getAttribute(SESSION_PROMPT_COUNT);
        String selectedModel = (String) session.getAttribute(SESSION_SELECTED_MODEL);

        if (promptCount == null) {
            promptCount = 0;
        }
        // Use default model if none is set in the session
        if (selectedModel == null || selectedModel.isBlank()) {
            selectedModel = appSettingsService.getGlobalDefaultModel(); // Get global default from service
            System.out.println("No model selected in session, using default: " + selectedModel);
        } else {
             System.out.println("Using model from session: " + selectedModel);
        }


        // --- 2. Determine API Key and Check Trial Limit ---
        String apiKeyToUse = null;
        boolean useTrialKey = false;

        if (userApiKey != null && !userApiKey.isBlank()) {
            apiKeyToUse = userApiKey;
            System.out.println("Using user-provided OpenRouter API key.");
        } else {
            if (promptCount < TRIAL_PROMPT_LIMIT) {
                apiKeyToUse = this.serverTrialApiKey; // Use the server's key injected from env var
                useTrialKey = true;
                System.out.println("Using server trial OpenRouter API key (Prompt #" + (promptCount + 1) + "/" + TRIAL_PROMPT_LIMIT + ")");
            } else {
                // Trial limit reached, and no user key provided
                String limitMessage = "Trial prompt limit (" + TRIAL_PROMPT_LIMIT + ") reached. Please provide your own OpenRouter API key via the API Key Setup page.";
                System.err.println("ERROR: " + limitMessage);
                // Return 403 Forbidden status
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                     .body(ChatResponse.createErrorResponse(limitMessage));
            }
        }

        // Check if the selected API key (trial or user) is actually configured/valid
        if (apiKeyToUse == null || apiKeyToUse.isBlank() || apiKeyToUse.equals("YOUR_OPENROUTER_API_KEY_HERE")) { // Check placeholder too
             String keyErrorMessage = useTrialKey ?
                 "Server trial API key (OPENROUTER_API_KEY environment variable) is not configured correctly." :
                 "User API key is invalid or missing.";
             System.err.println("ERROR: " + keyErrorMessage);
             HttpStatus status = useTrialKey ? HttpStatus.INTERNAL_SERVER_ERROR : HttpStatus.UNAUTHORIZED; // 500 if server misconfig, 401 if user key issue
             return ResponseEntity.status(status)
                                   .body(ChatResponse.createErrorResponse(keyErrorMessage));
        }


        // --- 3. Fetch Persona Data & Build System Prompt (Same as before) ---
        List<MemoryFact> memoryFacts = memoryFactRepository.findAll();
        List<TrainingInstruction> trainingInstructions = trainingInstructionRepository.findAll();

        StringBuilder systemPromptBuilder = new StringBuilder();
        systemPromptBuilder.append("You are Luis García, a specific individual defined by the following facts and instructions. Adhere strictly to this persona.\n\n");
        if (!memoryFacts.isEmpty()) {
            systemPromptBuilder.append("=== Key Facts About You ===\n");
            for (MemoryFact fact : memoryFacts) {
                systemPromptBuilder.append("- ").append(fact.getFactText().trim()).append("\n");
            }
            systemPromptBuilder.append("\n");
        }
        if (!trainingInstructions.isEmpty()) {
            systemPromptBuilder.append("=== Strict Instructions ===\n");
            System.out.println("=== DEBUG: INSTRUCTIONS BEING USED (" + trainingInstructions.size() + " total) ===");
            for (TrainingInstruction instruction : trainingInstructions) {
                String text = instruction.getInstructionText().trim();
                Boolean hidden = instruction.getHidden();
                System.out.println("Instruction ID: " + instruction.getId() + ", Hidden: " + hidden + ", Text: " + text);
                systemPromptBuilder.append("- ").append(text).append("\n");
            }
            System.out.println("=== END DEBUG: INSTRUCTIONS ===");
            systemPromptBuilder.append("\n");
        } else {
            System.out.println("WARNING: No training instructions found!");
        }
        systemPromptBuilder.append("=== IMPORTANT Identity Clarifications ===\n");
        systemPromptBuilder.append("- You are NOT the former professional baseball pitcher Luis García.\n");
        systemPromptBuilder.append("- You are NOT the ESPN commentator or former Liverpool footballer Luis García.\n");
        systemPromptBuilder.append("- You are ONLY the specific Luis García described in the 'Key Facts About You' section.\n");
        systemPromptBuilder.append("- Do NOT mention being an AI or language model. Respond naturally within the defined persona.\n");

        String finalSystemPrompt = systemPromptBuilder.toString();
        System.out.println("=== DEBUG: SYSTEM PROMPT ===\n" + finalSystemPrompt + "\n=== END DEBUG: SYSTEM PROMPT ===");


        // --- 4. Prepare payload for OpenRouter API (OpenAI format) ---
        Map<String, Object> openRouterPayload = new HashMap<>();
        openRouterPayload.put("model", selectedModel); // Use the session or default model

        // Explicitly type messages to handle both String content and List content
        List<Map<String, Object>> messages = new ArrayList<>();

        // Add System Prompt
        messages.add(Map.of("role", "system", "content", finalSystemPrompt));

        // Add Conversation History (map from Google format to OpenAI format)
        if (chatRequest.contents != null) {
            for (Map<String, Object> message : chatRequest.contents) {
                String role = (String) message.get("role"); // "user" or "model"
                List<Map<String, Object>> parts = (List<Map<String, Object>>) message.get("parts");

                if (role != null && parts != null && !parts.isEmpty()) {
                    // --- Log parts for debugging image data ---
                    try {
                        System.out.println("DEBUG: Processing message parts for role '" + role + "': " + objectMapper.writeValueAsString(parts));
                    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                         System.err.println("DEBUG: Error logging message parts: " + e.getMessage());
                    }
                    // --- End log ---

                    // Map "model" role to "assistant" for OpenAI format
                    String openAiRole = role.equals("model") ? "assistant" : role;

                    // --- Build content based on parts (handles text and image) ---
                    List<Map<String, Object>> contentList = new ArrayList<>();
                    String simpleTextContent = null; // For text-only messages

                    for (Map<String, Object> part : parts) {
                        if (part.containsKey("text")) {
                            String text = (String) part.get("text");
                            if (text != null && !text.isEmpty()) {
                                contentList.add(Map.of("type", "text", "text", text));
                                if (simpleTextContent == null) simpleTextContent = text; // Keep track if only text exists
                            }
                        } else if (part.containsKey("inlineData")) {
                            Map<String, String> inlineData = (Map<String, String>) part.get("inlineData");
                            if (inlineData != null && inlineData.containsKey("mimeType") && inlineData.containsKey("data")) {
                                String mimeType = inlineData.get("mimeType");
                                String base64Data = inlineData.get("data");
                                String dataUri = "data:" + mimeType + ";base64," + base64Data;
                                contentList.add(Map.of(
                                    "type", "image_url",
                                    "image_url", Map.of("url", dataUri)
                                ));
                                simpleTextContent = null; // Mark as complex content if image exists
                            }
                        }
                    }

                    // Add to messages list
                    if (!contentList.isEmpty()) {
                        // Use simple string content if only text was found and it's not empty
                        if (contentList.size() == 1 && simpleTextContent != null) {
                             messages.add(Map.of("role", openAiRole, "content", simpleTextContent));
                        } else {
                            // Otherwise, use the complex list content (for vision or mixed)
                            messages.add(Map.of("role", openAiRole, "content", contentList));
                        }
                    }
                }
            }
        }
        openRouterPayload.put("messages", messages);

        // --- 5. Set Headers for OpenRouter API ---
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKeyToUse); // Use Bearer token authentication
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Required headers for OpenRouter identification
        System.out.println("DEBUG: Setting HTTP-Referer header for OpenRouter API call");
        headers.set("HTTP-Referer", "https://kostiks.com"); // Updated to use the actual domain
        headers.set("X-Title", "snapback-luo"); // Set your app's name

        // --- 6. Call OpenRouter API ---
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(openRouterPayload, headers);
        String aiResponseText = null; // To store extracted text
        Map<String, String> aiImageData = null; // To store extracted image data
        String errorMessage = null;

        try {
            System.out.println("Calling OpenRouter API with model: " + selectedModel); // Use selectedModel
            System.out.println("OpenRouter API URL: " + OPENROUTER_API_URL);
            System.out.println("OpenRouter API Headers: " + headers);
            System.out.println("OpenRouter API Payload: " + objectMapper.writeValueAsString(openRouterPayload));
            
            ResponseEntity<Map> responseEntity = restTemplate.exchange(
                    OPENROUTER_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class);

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                Map<String, Object> responseBody = responseEntity.getBody();
                System.out.println("OpenRouter Raw Response: " + responseBody);

                // Safely navigate the OpenAI-compatible response structure
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> firstChoice = choices.get(0);
                    // The 'message' field contains the AI's response
                    Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");

                    if (message != null && message.containsKey("content")) {
                        Object content = message.get("content");
                        System.out.println("DEBUG: AI Response Content Type: " + (content == null ? "null" : content.getClass().getName()));
                        System.out.println("DEBUG: AI Response Content Value: " + content);

                        // Check if content is simple text or a list of parts (for multimodal)
                        if (content instanceof String) {
                            // Simple text response
                            aiResponseText = (String) content;
                            System.out.println("DEBUG: Extracted simple text response.");
                        } else if (content instanceof List) {
                            // Complex response (potentially text + image or just image)
                            System.out.println("DEBUG: Processing complex AI response content (List).");
                            List<Map<String, Object>> responseParts = (List<Map<String, Object>>) content;
                            for (Map<String, Object> part : responseParts) {
                                String partType = (String) part.get("type");
                                if ("text".equals(partType) && part.containsKey("text")) {
                                    aiResponseText = (String) part.get("text"); // Extract text part
                                    System.out.println("DEBUG: Extracted text part from complex response.");
                                } else if ("image_url".equals(partType) && part.containsKey("image_url")) {
                                    // Handle image part - Assuming image_url contains { url: "data:mime/type;base64,..." }
                                    Map<String, String> imageUrlMap = (Map<String, String>) part.get("image_url");
                                    String dataUrl = imageUrlMap.get("url");
                                    if (dataUrl != null && dataUrl.startsWith("data:image/")) {
                                        try {
                                            String[] parts = dataUrl.split(";base64,");
                                            String mimeType = parts[0].substring(5); // Remove "data:"
                                            String base64Data = parts[1];
                                            aiImageData = Map.of("mimeType", mimeType, "data", base64Data);
                                            System.out.println("DEBUG: Extracted image data (mimeType: " + mimeType + ") from complex response.");
                                        } catch (Exception e) {
                                            System.err.println("ERROR: Failed to parse image data URL from AI response: " + dataUrl + " - " + e.getMessage());
                                        }
                                    } else {
                                         System.err.println("WARNING: Received image_url part, but URL format is unexpected: " + dataUrl);
                                         // TODO: Handle non-data URLs if necessary (e.g., fetch image)
                                    }
                                }
                            }
                        } else if (content != null) {
                             System.err.println("WARNING: Unexpected AI response content type: " + content.getClass().getName());
                             // Attempt to convert to string as fallback
                             aiResponseText = String.valueOf(content);
                        }
                    }

                    // Check finish reason
                    String finishReason = (String) firstChoice.get("finish_reason");
                    if (finishReason != null && !finishReason.equals("stop")) {
                        System.out.println("OpenRouter finish_reason: " + finishReason);
                        // Handle non-stop reasons if needed
                    }
                }

                // Check if we got *any* content (text or image)
                if (aiResponseText == null && aiImageData == null) {
                    errorMessage = "Could not extract text or image content from OpenRouter API response.";
                    System.err.println(errorMessage + " Response Body: " + responseBody);
                } else {
                    // Success! Increment trial prompt count if the trial key was used
                    if (useTrialKey) {
                        promptCount++;
                        session.setAttribute(SESSION_PROMPT_COUNT, promptCount);
                        System.out.println("Trial prompt count incremented to: " + promptCount);
                    }
                }
            } else {
                errorMessage = "OpenRouter API request failed with status: " + responseEntity.getStatusCode();
                System.err.println(errorMessage + " Response: " + responseEntity.getBody());
            }

        } catch (HttpClientErrorException e) {
            // Handle 4xx client errors (e.g., 401 Unauthorized, 403 Forbidden, 429 Rate Limit, 400 Bad Request)
            errorMessage = "OpenRouter API Client Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString();
            System.err.println(errorMessage);
            // Try to extract a more specific error message from the response body
            try {
                Map<String, Object> errorBody = objectMapper.readValue(e.getResponseBodyAsString(), Map.class);
                Map<String, Object> errorDetails = (Map<String, Object>) errorBody.get("error");
                if (errorDetails != null && errorDetails.get("message") != null) {
                    errorMessage = "API Error: " + errorDetails.get("message");
                }
            } catch (Exception parseEx) {
                System.err.println("Could not parse OpenRouter error response body: " + parseEx.getMessage());
            }
            // Return the specific client error status to the frontend
            return ResponseEntity.status(e.getStatusCode()).body(ChatResponse.createErrorResponse(errorMessage));

        } catch (HttpServerErrorException e) {
            // Handle 5xx server errors from OpenRouter
            errorMessage = "OpenRouter API Server Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString();
            System.err.println(errorMessage);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ChatResponse.createErrorResponse("The AI service encountered an internal error. Please try again later."));

        } catch (ResourceAccessException e) {
            // Handle network errors (e.g., connection timeout)
            errorMessage = "Network error communicating with OpenRouter API: " + e.getMessage();
            System.err.println(errorMessage);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ChatResponse.createErrorResponse("Could not connect to the AI service. Please check your network connection."));

        } catch (Exception e) {
            // Catch any other unexpected errors during processing
             errorMessage = "An unexpected error occurred while processing the chat request: " + e.getMessage();
             System.err.println(errorMessage);
             e.printStackTrace(); // Log stack trace for unexpected errors
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ChatResponse.createErrorResponse("An unexpected internal error occurred."));
        }

        // --- 7. Return response to frontend ---
        // --- 7. Return response to frontend ---
        if (aiResponseText != null || aiImageData != null) {
            // Use the constructor that handles both text and image data
            return ResponseEntity.ok(new ChatResponse(aiResponseText != null ? aiResponseText.trim() : null, aiImageData));
        } else {
            // If we got here, the API call might have succeeded (2xx) but we couldn't extract content,
            // or an error occurred before the try-catch block. Use the captured errorMessage.
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR) // 500 is safer if content is missing unexpectedly
                                 .body(ChatResponse.createErrorResponse(errorMessage != null ? errorMessage : "Failed to get a valid response from the AI service."));
        }
    }

    // Endpoint to save the user's OpenRouter API key to the session
    @PostMapping("/save-key")
    public ResponseEntity<Map<String, String>> saveApiKey(@RequestBody Map<String, String> payload, HttpSession session) {
        String apiKey = payload.get("apiKey");

        if (apiKey == null || apiKey.trim().isEmpty()) {
             return ResponseEntity.badRequest().body(Map.of("message", "API key cannot be empty."));
        }

        // Store the key in the session using the new constant
        session.setAttribute(SESSION_USER_API_KEY, apiKey.trim());
        // Reset the prompt count when a user provides their own key
        session.setAttribute(SESSION_PROMPT_COUNT, 0); // Reset trial count

        System.out.println("User's OpenRouter API Key saved to session. Trial prompt count reset.");

        // Return success message to frontend
        return ResponseEntity.ok(Map.of("message", "API Key saved successfully for this session."));
    }

    // Removed duplicate TODO comment
    
    // Debug endpoint to check available models from OpenRouter
    @GetMapping("/debug/models")
    // *** FIX: Change return type to List<Map<String, Object>> ***
    public ResponseEntity<List<Map<String, Object>>> debugAvailableModels(HttpSession session) {
        // *** ADDED: Explicit API Key Check ***
        String apiKeyForModelFetch = this.serverTrialApiKey;
        if (apiKeyForModelFetch == null || apiKeyForModelFetch.isBlank() || apiKeyForModelFetch.equals("YOUR_OPENROUTER_API_KEY_HERE")) {
             System.err.println("ERROR: Server trial API key needed for /debug/models endpoint is not configured (OPENROUTER_API_KEY env var).");
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                 .body(new ArrayList<>()); // Return empty list
        }

        HttpHeaders headers = new HttpHeaders();
        // Use server key for fetching models, as user key might not be set/valid
        headers.setBearerAuth(apiKeyForModelFetch);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("HTTP-Referer", "https://kostiks.com");
        headers.set("X-Title", "snapback-luo-debug");
        
        HttpEntity<String> requestEntity = new HttpEntity<>(headers);
        
        try {
            System.out.println("Fetching available models from OpenRouter API");
            ResponseEntity<Map> responseEntity = restTemplate.exchange(
                    "https://openrouter.ai/api/v1/models",
                    HttpMethod.GET,
                    requestEntity,
                    Map.class);
            
            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                Map<String, Object> responseBody = responseEntity.getBody();
                
                // *** ADD LOGGING: Log the raw response from OpenRouter ***
                try {
                    System.out.println("DEBUG: Raw OpenRouter /models response body: " + objectMapper.writeValueAsString(responseBody));
                } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                    System.err.println("DEBUG: Error converting OpenRouter response to JSON for logging: " + e.getMessage());
                }
                
                // *** FIX: Extract the actual model list (likely under "data") ***
                List<Map<String, Object>> modelList = null;
                if (responseBody.containsKey("data") && responseBody.get("data") instanceof List) {
                    modelList = (List<Map<String, Object>>) responseBody.get("data");
                    System.out.println("DEBUG: Extracted model list from OpenRouter response (count: " + modelList.size() + ")");
                } else {
                    System.err.println("ERROR: Could not find 'data' list in OpenRouter models response. Response body: " + responseBody);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ArrayList<>()); // Return empty list on error
                }
                // Return *only* the extracted list to the frontend
                return ResponseEntity.ok(modelList);
            } else {
                return ResponseEntity.status(responseEntity.getStatusCode())
                    .body(new ArrayList<>()); // Return empty list
            }
        } catch (RestClientException e) { // Catch RestClient specific exceptions first
            System.err.println("ERROR: RestClientException during OpenRouter /models call.");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ArrayList<>()); // Return empty list
        } catch (Exception e) { // Catch any other unexpected exceptions
            System.err.println("ERROR: Unexpected Exception during OpenRouter /models call.");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ArrayList<>()); // Return empty list
        }
    }

    // --- New Endpoints for Model Management ---

    // Endpoint to get the currently selected model identifier for the session
    @GetMapping("/model")
    public ResponseEntity<Map<String, String>> getCurrentModel(HttpSession session) {
        String selectedModel = (String) session.getAttribute(SESSION_SELECTED_MODEL);
        if (selectedModel == null || selectedModel.isBlank()) {
            selectedModel = appSettingsService.getGlobalDefaultModel(); // Return global default if not set in session
        }
        System.out.println("GET /api/chat/model - Returning current model: " + selectedModel);
        return ResponseEntity.ok(Map.of("currentModel", selectedModel));
    }

    // Endpoint to update the model identifier for the session
    @PostMapping("/model")
    public ResponseEntity<Map<String, String>> updateModel(@RequestBody Map<String, String> payload, HttpSession session) {
        String newModel = payload.get("model"); // *** FIX: Change key from "modelIdentifier" to "model" ***

        if (newModel == null || newModel.trim().isEmpty()) {
             return ResponseEntity.badRequest().body(Map.of("message", "Model identifier cannot be empty."));
        }

        // Store the selected model in the session
        session.setAttribute(SESSION_SELECTED_MODEL, newModel.trim());
        System.out.println("POST /api/chat/model - Updated session model to: " + newModel.trim());

        // Return success message
        return ResponseEntity.ok(Map.of("message", "Model updated successfully for this session.", "newModel", newModel.trim()));
    }
// Endpoint to update the GLOBAL default model identifier
    @PostMapping("/default-model")
    public ResponseEntity<Map<String, String>> updateGlobalDefaultModel(@RequestBody Map<String, String> payload) {
        String newDefaultModel = payload.get("model");

        if (newDefaultModel == null || newDefaultModel.trim().isEmpty()) {
             return ResponseEntity.badRequest().body(Map.of("message", "Global default model identifier cannot be empty."));
        }

        try {
            appSettingsService.setGlobalDefaultModel(newDefaultModel.trim());
            System.out.println("POST /api/chat/default-model - Updated global default model to: " + newDefaultModel.trim());
            return ResponseEntity.ok(Map.of("message", "Global default model updated successfully.", "newGlobalDefaultModel", newDefaultModel.trim()));
        } catch (Exception e) {
            System.err.println("Error updating global default model: " + e.getMessage());
            // Log the stack trace for debugging if needed
            // e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(Map.of("message", "Failed to update global default model due to an internal error."));
        }
    }
}