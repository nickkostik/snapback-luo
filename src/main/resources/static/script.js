const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const attachFileButton = document.getElementById('attachFileButton');
const fileInput = document.getElementById('fileInput');
const filePreviewArea = document.getElementById('filePreviewArea');
const memoryListUl = document.getElementById('currentMemoryList'); // Get memory list element

// Construct base URL explicitly using the current page's origin
const API_BASE_URL = `${window.location.origin}/api`;
console.log("API Base URL determined as:", API_BASE_URL); // Add logging

// --- Global variable to hold attached file data ---
let attachedFileData = null; // { name: string, mimeType: string, data: string (base64) }

// --- API Helper Functions (Copied/Adapted from training_script.js) ---
async function fetchInstructions() {
    const url = `${API_BASE_URL}/instructions`;
    console.log("Fetching instructions from:", url); // Add logging
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP error fetching instructions! status: ${response.status}`);
            return []; // Return empty on error
        }
        return await response.json();
    } catch (error) {
        console.error("Network error fetching instructions:", error);
        return []; // Return empty on error
    }
}

async function fetchMemoryFacts() {
    const url = `${API_BASE_URL}/memory`;
    console.log("Fetching memory facts from:", url); // Add logging
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP error fetching memory facts! status: ${response.status}`);
            return []; // Return empty on error
        }
        return await response.json();
    } catch (error) {
        console.error("Network error fetching memory facts:", error);
        if (memoryListUl) memoryListUl.innerHTML = '<li>Error loading memory.</li>';
        return []; // Return empty on error
    }
}

// --- System Prompt Generation (Uses Backend) ---
async function buildSystemPrompt() {
    // Updated base prompt to be more neutral, relying on instructions for persona details.
    const basePrompt = `You are an AI impersonating Luis Garcia. Respond naturally based on the following instructions and conversation history. Stay in character. NEVER mention you are an AI.`;
    const savedInstructions = await fetchInstructions(); // Fetch from backend

    if (savedInstructions.length === 0) {
        console.log("No instructions found, using base prompt."); // Add logging
        return basePrompt;
    }
    // Extract just the text from the instruction objects
    const instructionsString = savedInstructions.map(instr => instr.instructionText).join('\n- ');
    const fullPrompt = `${basePrompt}\n\nFollow these specific instructions:\n- ${instructionsString}`;
    console.log("Using System Prompt:", fullPrompt);
    return fullPrompt;
}
// --- End System Prompt Generation ---

// Store conversation history { role: 'user'/'model', parts: [...] }
let conversationHistory = [];

// --- File Handling Functions (Unchanged) ---
attachFileButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        addMessage('error', `File is too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
        fileInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        attachedFileData = { name: file.name, mimeType: file.type, data: base64Data };
        console.log("File attached:", attachedFileData.name, attachedFileData.mimeType);
        updateFilePreview();
    };
    reader.onerror = (error) => {
        console.error("File reading error:", error);
        addMessage('error', 'Error reading file.');
        removeAttachedFile();
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
});

function updateFilePreview() {
    if (attachedFileData) {
        filePreviewArea.innerHTML = `
            <span>📎 ${attachedFileData.name}</span>
            <button class="remove-file-btn" title="Remove file">❌</button>
        `;
        filePreviewArea.querySelector('.remove-file-btn').addEventListener('click', removeAttachedFile);
        filePreviewArea.style.display = 'flex'; // Use flex to align items properly
    } else {
        filePreviewArea.innerHTML = '';
        filePreviewArea.style.display = 'none';
    }
}

function removeAttachedFile() {
    attachedFileData = null;
    fileInput.value = '';
    updateFilePreview();
    console.log("Attached file removed.");
}
// --- End File Handling ---


// --- Chat Display Functions (Unchanged) ---
function addMessage(sender, text, imageData = null) { // Added imageData parameter
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    // Handle Image Data
    if (imageData && imageData.mimeType && imageData.mimeType.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `data:${imageData.mimeType};base64,${imageData.data}`;
        img.alt = imageData.name || (sender === 'user' ? 'User uploaded image' : 'AI generated image'); // Use filename or default alt text
        img.classList.add('chat-image'); // Add a class for styling
        messageDiv.appendChild(img);
        // Optionally, add the text as a caption or alongside, if text also exists
        if (text) {
             const textSpan = document.createElement('span');
             textSpan.textContent = text;
             // Add class for potential styling of text accompanying an image
             textSpan.classList.add('image-caption');
             messageDiv.appendChild(textSpan); // Append text after image
        }
    }
    // Handle Text Data (if no image or if text should be shown alongside image)
    else if (text) { // Changed from simple 'else' to 'else if (text)'
        const textSpan = document.createElement('span');
        textSpan.textContent = text; // Use textContent for safety
        messageDiv.appendChild(textSpan);
    }
    // Handle case where there's neither text nor a valid image (e.g., user only attached non-image file)
    else if (imageData && imageData.name) { // Check if it was a file attachment (even non-image)
         const textSpan = document.createElement('span');
         // Display filename for non-image files or if image rendering failed but we have a name
         textSpan.innerHTML = `<span class="file-mention">(Attached: ${imageData.name})</span>`;
         messageDiv.appendChild(textSpan);
    }
    // If imageData exists but isn't an image, and no text, the message div might be empty, which is fine.

    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function showTypingIndicator() {
    if (document.getElementById('typingIndicator')) return;
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'ai', 'typing');
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<span>Luis is thinking...</span>';
    chatbox.appendChild(typingDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}
// --- End Chat Display Functions ---

// --- Memory Display Function ---
async function updateMemoryDisplay() {
    if (!memoryListUl) return; // Exit if element doesn't exist

    memoryListUl.innerHTML = '<li>Loading memory...</li>';
    const memoryFacts = await fetchMemoryFacts();

    memoryListUl.innerHTML = ''; // Clear loading/previous list

    if (memoryFacts.length === 0 && !memoryListUl.textContent.includes('Error')) {
        memoryListUl.innerHTML = '<li>(No facts stored yet)</li>';
        return;
    }

    memoryFacts.forEach(fact => {
        const item = document.createElement('li');
        item.textContent = fact.factText || '(empty fact)';
        // TODO: Add delete button for memory facts later if needed
        memoryListUl.appendChild(item);
    });
}
// --- End Memory Display Function ---


// --- Send Message to Backend (which proxies to Gemini API) ---
async function getLuisResponse() {
    const userText = userInput.value.trim();
    if (!userText && !attachedFileData) return;

    // --- API Key is now handled by the backend ---
    // No need to get/check API key here anymore.

    addMessage('user', userText || '', attachedFileData); // Pass full imageData object
    userInput.value = ''; // Clear input after sending
    showTypingIndicator();

    const userParts = [];
    if (userText) userParts.push({ text: userText });
    if (attachedFileData) {
        userParts.push({ inlineData: { mimeType: attachedFileData.mimeType, data: attachedFileData.data } });
    }

    const sentFileData = attachedFileData; // Keep track of what was sent
    removeAttachedFile(); // Clear UI immediately

    conversationHistory.push({ role: 'user', parts: userParts });

    // Build the system prompt dynamically (now async)
    const currentSystemPrompt = await buildSystemPrompt(); // Await the prompt

    // Prepare payload for our backend (matching ChatController.ChatRequest)
    const payload = {
        contents: conversationHistory, // Send full history including latest user message
        systemInstruction: {
            role: "system", // Keep role for potential future use by backend
            parts: [{ text: currentSystemPrompt }]
        }
        // safetySettings and generationConfig are now handled by the backend if needed
    };

    console.log("Sending payload to backend:", JSON.stringify(payload, null, 2));
    const chatUrl = `${API_BASE_URL}/chat`; // Construct URL explicitly
    console.log("Attempting to POST to:", chatUrl); // Add logging

    try {
        const response = await fetch(chatUrl, { // Use explicitly constructed URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        removeTypingIndicator();

        // Check if the response status indicates an error
        if (!response.ok) {
            const errorStatus = response.status;
            const errorText = await response.text(); // Read error response body
            console.error(`Backend Error Response (Status: ${errorStatus}):`, errorText);

            let errorMessage = `Error: ${response.statusText || 'Unknown error'}`; // Default message
            let displayMessage = ''; // Message to show the user

            // Specific handling for 403 Forbidden (Trial Limit)
            if (errorStatus === 403) {
                try {
                    const errorData = JSON.parse(errorText);
                    // Check if the specific trial limit error message is present
                    if (errorData && errorData.error && errorData.error.includes("Trial prompt limit")) {
                         displayMessage = "Trial limit reached. Please go to API Key Setup to enter your own OpenRouter key.";
                    } else {
                        // Other 403 error
                        errorMessage = `Forbidden: ${errorData?.error || errorText}`;
                        displayMessage = `Error: Access denied. (${errorMessage})`;
                    }
                } catch (e) {
                    // If parsing fails but status is 403, it might still be the limit message (if backend sent plain text)
                    if (errorText.includes("Trial prompt limit")) {
                         displayMessage = "Trial limit reached. Please go to API Key Setup to enter your own OpenRouter key.";
                    } else {
                        errorMessage = `Forbidden: ${errorText}`;
                        displayMessage = `Error: Access denied. (${errorMessage.substring(0, 100)})`;
                    }
                }
            } else {
                // Generic handling for other errors (401, 429, 5xx, etc.)
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = `Error ${errorStatus}: ${errorData?.error || response.statusText || 'Unknown error'}`;
                } catch (e) {
                    errorMessage = `Error ${errorStatus}: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`;
                }
                displayMessage = errorMessage; // Show the constructed error message
            }

            addMessage('error', displayMessage); // Display the appropriate message to the user
            conversationHistory.pop(); // Remove user message from history if backend call failed
            return; // Stop processing on error
        }

        // Handle successful response from backend (2xx)
        const data = await response.json(); // Parse backend's ChatResponse
        console.log("Backend Success Response:", data);

        if (data.responseText) {
            const aiText = data.responseText.trim();
            addMessage('ai', aiText);
            // Add AI response to history *only if successful*
            conversationHistory.push({ role: 'model', parts: [{ text: aiText }] });
        } else if (data.error) {
            // Handle error message from the backend
            console.error("Backend returned error:", data.error);
            addMessage('error', `Error: ${data.error}`);
            conversationHistory.pop(); // Remove user message if response had an error
            return;
        } else {
            // Handle cases where backend might return OK but no text (shouldn't happen with current controller logic)
            console.error("Backend returned OK but no response text:", data);
            addMessage('error', "Received an empty response from the server. Please check the console for details.");

            // Add more detailed logging
            console.error("Response details:");
            console.error("- Status: OK (200)");
            console.error("- Has responseText: " + (data.responseText !== undefined));
            console.error("- Has error field: " + (data.error !== undefined));
            console.error("- Full response data:", data);

            conversationHistory.pop(); // Remove user message if response was empty/invalid
            return;
        }


         // Optional: Limit history size (remains the same)
         const MAX_HISTORY_LENGTH = 20; // Keep last 10 pairs (user+model)
         if (conversationHistory.length > MAX_HISTORY_LENGTH) {
             conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY_LENGTH);
             console.log("Trimmed conversation history");
         }

         // TODO: Add logic here to potentially extract facts from aiText and save to backend via POST /api/memory
         // This requires parsing logic and checking memory settings (toggles)

    } catch (error) {
        console.error("Network or Fetch Error:", error);
        removeTypingIndicator();
        addMessage('error', `Network error: ${error.message}`);
        conversationHistory.pop(); // Remove user message from history if fetch failed
    }
}
// --- End Send Message ---


// --- Event Listeners ---
sendButton.addEventListener('click', getLuisResponse);
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        if (userInput.value.trim() || attachedFileData) {
            getLuisResponse();
        }
    }
});
// --- End Event Listeners ---


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    updateMemoryDisplay(); // Load and display memory facts on page load
    // Add initial AI message if desired
    // addMessage('ai', "Hey, it's Luo. Whatcha need?");
});
// --- End Initial Setup ---
