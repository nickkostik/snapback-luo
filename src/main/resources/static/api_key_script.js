const apiKeyInput = document.getElementById('apiKeyInput');
const saveButton = document.getElementById('saveApiKeyButton');
const confirmationDiv = document.getElementById('saveConfirmation');
let confirmationTimeout;

// Function to save the key
async function saveApiKey() { // Make function async
    const apiKey = apiKeyInput.value.trim();
    const API_BASE_URL = '/api/chat'; // Use relative path

    // Clear previous confirmation/error messages immediately
    confirmationDiv.textContent = '';
    confirmationDiv.style.opacity = '0';
    clearTimeout(confirmationTimeout);

    if (apiKey) {
        try {
            const response = await fetch(`${API_BASE_URL}/save-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: apiKey }),
            });

            let message = '';
            let messageColor = '#ff3b30'; // Default to error color (red)

            try {
                const data = await response.json(); // Attempt to parse JSON response body
                message = data.message || `Error: Received unexpected response format. Status: ${response.status}`; // Use message from backend or fallback

                if (response.ok) {
                    console.log("API Key save successful:", data.message);
                    message = `✅ ${data.message}`; // Prepend checkmark for success
                    messageColor = '#34c759'; // Green confirmation
                } else {
                    console.error("Failed to save API Key:", response.status, data.message || response.statusText);
                    message = `❌ Error ${response.status}: ${data.message || response.statusText}`; // Prepend cross mark for error
                }
            } catch (parseError) {
                // Handle cases where response is not JSON
                console.error("Error parsing response JSON:", parseError);
                const responseText = await response.text(); // Try reading as text
                message = `❌ Error ${response.status}: ${responseText.substring(0, 100) || response.statusText || 'Could not parse server response.'}`;
            }

            // Display the message from the backend or the error message
            confirmationDiv.textContent = message;
            confirmationDiv.style.color = messageColor;

        } catch (networkError) {
            console.error("Network error saving API Key:", networkError);
            confirmationDiv.textContent = '❌ Network error. Could not reach server to save key.';
            confirmationDiv.style.color = '#ff3b30'; // Red error color
        }

         // Show the message (success or error)
         confirmationDiv.style.opacity = '1';

         // Hide confirmation/error after a few seconds
         confirmationTimeout = setTimeout(() => {
             confirmationDiv.style.opacity = '0';
         }, 4000); // Slightly longer display time

        // Optionally clear the input field after attempting to save
        // apiKeyInput.value = '';

    } else {
        // Show error/prompt if key is empty
        confirmationDiv.textContent = '⚠️ Please enter an API Key.';
        confirmationDiv.style.opacity = '1';
        confirmationDiv.style.color = '#ff9f0a'; // Orange warning color

        // Clear previous timeout
        clearTimeout(confirmationTimeout);

         // Hide confirmation after a few seconds
         confirmationTimeout = setTimeout(() => {
            confirmationDiv.style.opacity = '0';
        }, 3000);
    }
}

// Event listener for the button
saveButton.addEventListener('click', saveApiKey);

// Optional: Allow saving by pressing Enter in the input field
apiKeyInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent potential form submission
        saveApiKey();
    }
});

// Remove loading from sessionStorage - key is managed server-side now.
// Ensure confirmation message is hidden initially and styled
confirmationDiv.style.opacity = '0';
confirmationDiv.style.transition = 'opacity 0.5s ease-out';