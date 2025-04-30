# Snapback Luo AI Chat

This project provides a web-based chat interface to interact with an AI persona impersonating Luis Garcia ("Luo"), a former professional baseball pitcher.

## Features

*   **Chat Interface:** Engage in conversation with the Luis Garcia AI persona.
*   **Behavior Training:** Customize the AI's responses and personality through a dedicated training interface.
*   **File Attachments:** (Optional) Attach files (images, text) to provide context for your conversation.

## Running Locally (Frontend Only - See Backend README for full setup)

To run the frontend part of this project on your local machine, you need Python 3 installed.

1.  **Clone or Download:** Get the project files onto your computer. If you cloned using Git, navigate into the repository folder.
    ```bash
    git clone https://github.com/nickkostik/Snapback-Luo-AI.git
    cd Snapback-Luo-AI/snapback-luo-backend/src/main/resources/static 
    ```
    *(Note: Path adjusted based on project structure)*
    If you downloaded a ZIP file, extract it and navigate into the `snapback-luo-backend/src/main/resources/static` folder using your terminal.

2.  **Start the Server:** From within the `static` directory, run the following command in your terminal:
    ```bash
    python -m http.server 8000
    ```
    This command starts a simple Python web server for the frontend files. **Note:** This does not run the backend logic or connect to the AI. See the backend `DEV_README.md` for full instructions.

3.  **Access the Website:** Open your web browser and go to:
    `http://localhost:8000`

You should now see the Snapback Luo chat interface (frontend only).

## Files

*   `index.html`: The main chat interface page.
*   `script.js`: Handles chat logic, API calls (originally intended for Gemini), and file attachments.
*   `style.css`: Styles the appearance of the website.
*   `training.html`: Page for adding/managing training instructions.
*   `training_script.js`: Handles the logic for the training page.
*   `api_key_setup.html` / `api_key_script.js`: For API key management.
*   `luis.png`: Logo image.
*   `README.md`: This file.

## OpenAI CLI Persona Setup Example

The following instructions describe a method for setting up and maintaining a specific persona (like Luis García) when using the OpenAI API via its Command Line Interface (CLI). Note that this project currently uses Google AI, so these specific steps might need adaptation.

**1. Create and Save Your “Train Page” Profile**

*   In the OpenAI CLI or web UI, go to the training (or memory/custom instructions) section.
*   Define your persona exactly once: name, background, specific details (e.g., Glenbard West alum, Pi Kapp pledge Fall 2021, marketing student at Iowa, part-timer at the Airliner, budding guitarist).
*   Emphasize uniqueness: Add bullets explicitly ruling out other individuals with the same name (e.g., "not the baseball player," "not the ESPN commentator").
*   Save this profile under a clear identifier (e.g., `luis_garcia_profile`).
*   Confirm in the UI that this saved profile contains all your specific bullet points.

**2. Build Your Base “System” Prompt**

*   Draft a concise, uncompromising system message template that:
    *   States the full persona bio: "You are Luis García, my friend from Glenbard West..." (include all key details).
    *   Explicitly denies other identities: "You are not any other Luis García."
    *   Instructs the model to use the profile: "Always check the train page `luis_garcia_profile` before answering."
    *   (Optional but recommended) Adds a character lock: "Do not break character, do not reference any other Luis García, do not mention you are an AI."
*   Save this text as your base prompt template.

**3. Always Prepend Profile and Base Prompt in Every CLI Call**

*   When invoking `openai chat completions create ...`, your message array *must* begin with these two system messages in this order:

    *   **Train Page Reference:**
        ```json
        { "role": "system", "content": "LOAD_PROFILE: luis_garcia_profile" }
        ```
    *   **Base Prompt:**
        ```json
        { "role": "system", "content": "<Your full Luis García bio + check instructions + character lock>" }
        ```
*   Only *after* these two entries should you include the actual user's question/prompt (e.g., `{ "role": "user", "content": "Who are you?" }`).
*   This structure ensures the model loads the correct profile and anchors on the core persona instructions for every interaction.

**4. Force Self-Verification (Optional)**

*   Embed a self-check mechanism within your base prompt:
    ```
    "Before you respond, output exactly:
    PROFILE CHECK: OK if the loaded memory matches the Luis García profile,
    or PROFILE CHECK: MISMATCH (and then reload) if it does not.
    Then proceed with answering as Luis."
    ```
*   This provides immediate feedback if the model loses the persona context.

**5. Lock Down Sampling Parameters**

*   Set `temperature=0` (or as close to 0 as possible) in your CLI flags or API call parameters. This minimizes randomness and encourages the model to stick to the provided persona.
*   If necessary, reduce `top_p` (e.g., `top_p=0.5`) to further narrow the model's choices to the most probable (persona-consistent) tokens.

**6. Clear Session Cache/History Between Runs**

*   Avoid carrying over conversation history that might contain incorrect persona information from previous interactions.
*   Either restart your CLI script/process for each new independent query or ensure you explicitly supply *only* the two system messages (Profile Load, Base Prompt) plus the *new* user message each time, without any prior turns.

**7. Test Immediately**

*   After setting up, send a simple test prompt:
    ```
    User: "Who are you?"
    ```
*   Expect a response confirming the correct persona, preceded by `PROFILE CHECK: OK` if using the self-verification step:
    ```
    PROFILE CHECK: OK
    "I am Luis García, your friend from Glenbard West..."
    ```
*   Any other response indicates a failure in the profile loading or base prompt application. Check your steps, especially the order and content of the system messages.

**8. Diagnose Interference**

*   If the model still drifts:
    *   Check any platform-level "Memory" or "Custom Instructions" settings – disable features that might automatically inject conflicting information from past chats.
    *   Explicitly re-send the profile load command/message at the start of *every* session or API call.
    *   Ensure your script clears any local variables holding previous conversation turns before making a new API request.