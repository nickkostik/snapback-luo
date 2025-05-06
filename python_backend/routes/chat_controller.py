import os
import requests
import base64 # Added for image handling
import json # Added for potential error parsing
from flask import Blueprint, request, jsonify, session, current_app
from ..models import db, AppSettings, MemoryFact, TrainingInstruction
from .. import auth # Import auth instance from __init__
# from ..config import Config # Config object not directly used here anymore

chat_bp = Blueprint('chat_bp', __name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models" # Added for model fetching

# Constants matching Java version
SESSION_USER_API_KEY = "user_api_key" # Keep existing key for simplicity
SESSION_SELECTED_MODEL = "selected_model"
SESSION_PROMPT_COUNT = "prompt_count"
TRIAL_PROMPT_LIMIT = 100
HTTP_REFERER = "https://kostiks.com" # Match Java header
X_TITLE = "snapback-luo" # Match Java header

# Helper to get default model from DB
def get_default_model():
    # Ensure we query within an app context if needed, though usually available in requests
    with current_app.app_context():
        setting = AppSettings.query.filter_by(setting_key='default_model').first()
        # Fallback default if not set in DB
        return setting.setting_value if setting else 'qwen/qwen-2-72b-instruct'

@chat_bp.route('/', methods=['POST'], strict_slashes=False) # Allow both /api/chat and /api/chat/
def chat_completion():
    data = request.get_json()
    if not data or 'contents' not in data:
        return jsonify({"error": "Invalid request body, missing 'contents'"}), 400

    # --- 1. Get Session Attributes ---
    user_api_key = session.get(SESSION_USER_API_KEY)
    prompt_count = session.get(SESSION_PROMPT_COUNT, 0) # Default to 0 if not set
    selected_model = session.get(SESSION_SELECTED_MODEL)

    # Use default model if none is set in the session or if it's blank
    if not selected_model:
        selected_model = get_default_model()
        current_app.logger.info(f"No model in session, using default: {selected_model}")
    else:
        current_app.logger.info(f"Using model from session: {selected_model}")

    # --- 2. Determine API Key and Check Trial Limit ---
    server_api_key = current_app.config.get('OPENROUTER_API_KEY')
    api_key_to_use = None
    use_trial_key = False

    if user_api_key:
        api_key_to_use = user_api_key
        current_app.logger.info("Using user-provided OpenRouter API key.")
    else:
        if prompt_count < TRIAL_PROMPT_LIMIT:
            api_key_to_use = server_api_key
            use_trial_key = True
            current_app.logger.info(f"Using server trial OpenRouter API key (Prompt #{prompt_count + 1}/{TRIAL_PROMPT_LIMIT})")
        else:
            limit_message = f"Trial prompt limit ({TRIAL_PROMPT_LIMIT}) reached. Please provide your own OpenRouter API key."
            current_app.logger.error(f"ERROR: {limit_message}")
            return jsonify({"error": limit_message}), 403 # Forbidden

    # Check if the selected API key is actually configured/valid
    if not api_key_to_use or api_key_to_use == "YOUR_OPENROUTER_API_KEY_HERE":
        key_error_message = ("Server trial API key (OPENROUTER_API_KEY environment variable) is not configured correctly."
                             if use_trial_key else "User API key is invalid or missing.")
        current_app.logger.error(f"ERROR: {key_error_message}")
        status_code = 500 if use_trial_key else 401 # 500 if server misconfig, 401 if user key issue
        return jsonify({"error": key_error_message}), status_code

    # --- 3. Fetch Persona Data & Build System Prompt (Matching Java) ---
    memory_facts = MemoryFact.query.all()
    # Fetch ALL instructions, including hidden ones, for the prompt
    training_instructions = TrainingInstruction.query.all()

    system_prompt_parts = []
    system_prompt_parts.append("You are Luis García, a specific individual defined by the following facts and instructions. Adhere strictly to this persona.\n")

    if memory_facts:
        system_prompt_parts.append("=== Key Facts About You ===")
        for fact in memory_facts:
            system_prompt_parts.append(f"- {fact.fact_text.strip()}")
        system_prompt_parts.append("") # Add newline

    if training_instructions:
        system_prompt_parts.append("=== Strict Instructions ===")
        current_app.logger.debug(f"=== DEBUG: INSTRUCTIONS BEING USED ({len(training_instructions)} total) ===")
        for instruction in training_instructions:
            text = instruction.instruction_text.strip()
            hidden = instruction.is_hidden # Note: Python uses is_hidden
            current_app.logger.debug(f"Instruction ID: {instruction.id}, Hidden: {hidden}, Text: {text}")
            system_prompt_parts.append(f"- {text}") # Add all instructions regardless of hidden status
        current_app.logger.debug("=== END DEBUG: INSTRUCTIONS ===")
        system_prompt_parts.append("") # Add newline
    else:
        current_app.logger.warning("WARNING: No training instructions found!")

    system_prompt_parts.append("=== IMPORTANT Identity Clarifications ===")
    system_prompt_parts.append("- You are NOT the former professional baseball pitcher Luis García.")
    system_prompt_parts.append("- You are NOT the ESPN commentator or former Liverpool footballer Luis García.")
    system_prompt_parts.append("- You are ONLY the specific Luis García described in the 'Key Facts About You' section.")
    system_prompt_parts.append("- Do NOT mention being an AI or language model. Respond naturally within the defined persona.")

    final_system_prompt = "\n".join(system_prompt_parts)
    current_app.logger.debug(f"=== DEBUG: SYSTEM PROMPT ===\n{final_system_prompt}\n=== END DEBUG: SYSTEM PROMPT ===")

    # --- 4. Prepare payload for OpenRouter API (OpenAI format, handling images) ---
    open_router_messages = []

    # Add System Prompt
    open_router_messages.append({"role": "system", "content": final_system_prompt})

    # Add Conversation History (map from Google format to OpenAI format, handle images)
    request_contents = data.get('contents', [])
    for message in request_contents:
        role = message.get("role") # "user" or "model"
        parts = message.get("parts")

        if role and parts and isinstance(parts, list):
            current_app.logger.debug(f"DEBUG: Processing message parts for role '{role}': {parts}")

            open_ai_role = "assistant" if role == "model" else role
            content_list = []
            simple_text_content = None

            for part in parts:
                if "text" in part:
                    text = part["text"]
                    if text and text.strip():
                        content_list.append({"type": "text", "text": text.strip()})
                        if simple_text_content is None: simple_text_content = text.strip() # Track if only text
                elif "inlineData" in part:
                    inline_data = part["inlineData"]
                    if isinstance(inline_data, dict) and "mimeType" in inline_data and "data" in inline_data:
                        mime_type = inline_data["mimeType"]
                        base64_data = inline_data["data"]
                        if mime_type.startswith("image/"):
                            data_uri = f"data:{mime_type};base64,{base64_data}"
                            content_list.append({
                                "type": "image_url",
                                "image_url": {"url": data_uri}
                            })
                            simple_text_content = None # Mark as complex if image exists
                        else:
                             current_app.logger.warning(f"Skipping inlineData with non-image mimeType: {mime_type}")
                    else:
                        current_app.logger.warning(f"Skipping invalid inlineData part: {inline_data}")

            # Add to messages list
            if content_list:
                # Use simple string content if only text was found
                if len(content_list) == 1 and simple_text_content is not None:
                    open_router_messages.append({"role": open_ai_role, "content": simple_text_content})
                else:
                    # Otherwise, use the complex list content (for vision or mixed)
                    open_router_messages.append({"role": open_ai_role, "content": content_list})

    # --- 5. Set Headers for OpenRouter API (Matching Java) ---
    headers = {
        "Authorization": f"Bearer {api_key_to_use}",
        "Content-Type": "application/json",
        "HTTP-Referer": HTTP_REFERER, # Added header
        "X-Title": X_TITLE           # Added header
    }

    # --- 6. Call OpenRouter API ---
    payload = {
        "model": selected_model,
        "messages": open_router_messages
        # Add other parameters like temperature, max_tokens if needed later
    }

    ai_response_text = None
    ai_image_data = None # To store {mimeType: ..., data: ...}
    error_message = None
    status_code = 500 # Default error status

    try:
        current_app.logger.info(f"Calling OpenRouter API with model: {selected_model}")
        # current_app.logger.debug(f"OpenRouter API URL: {OPENROUTER_API_URL}")
        # current_app.logger.debug(f"OpenRouter API Headers: {headers}")
        # current_app.logger.debug(f"OpenRouter API Payload: {json.dumps(payload)}") # Be careful logging full payload

        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=90)

        # Check status code before trying to parse JSON
        if response.status_code >= 400:
            status_code = response.status_code
            error_text = response.text
            current_app.logger.error(f"OpenRouter Error {status_code}: {error_text}")
            try:
                error_json = response.json()
                # Try to extract the specific message from the nested error structure
                error_message = error_json.get('error', {}).get('message', error_text)
            except ValueError: # Handle cases where error response is not JSON
                error_message = error_text

            # Specific handling for Rate Limit Exceeded
            if status_code == 429:
                error_message = f"Rate limit exceeded for model {selected_model}. Please try again later or contact support. (OpenRouter: {error_message})"
                return jsonify({"error": error_message}), 429 # Return 429 to frontend
            else:
                # Return other errors (like 401, 400, 500 from OpenRouter)
                return jsonify({"error": f"API Error: {error_message}"}), status_code

        # Process successful response (2xx)
        response_data = response.json()
        current_app.logger.debug(f"OpenRouter Raw Response: {response_data}")

        choices = response_data.get('choices')
        if choices and len(choices) > 0:
            first_choice = choices[0]
            message = first_choice.get('message', {})
            content = message.get('content')
            finish_reason = first_choice.get('finish_reason')

            current_app.logger.debug(f"AI Response Content Type: {type(content).__name__}")
            current_app.logger.debug(f"AI Response Content Value: {content}")
            current_app.logger.debug(f"AI Finish Reason: {finish_reason}")

            # Process content (String or List of parts)
            if isinstance(content, str):
                ai_response_text = content
                current_app.logger.debug("Extracted simple text response.")
            elif isinstance(content, list):
                current_app.logger.debug("Processing complex AI response content (List).")
                for part in content:
                    part_type = part.get("type")
                    if part_type == "text" and "text" in part:
                        ai_response_text = part["text"]
                        current_app.logger.debug("Extracted text part from complex response.")
                    elif part_type == "image_url" and "image_url" in part:
                        image_url_map = part["image_url"]
                        data_url = image_url_map.get("url")
                        if data_url and data_url.startswith("data:image/"):
                            try:
                                # Split "data:image/png;base64," into "data:image/png" and "base64_data"
                                header, base64_data = data_url.split(";base64,", 1)
                                mime_type = header.split(":", 1)[1] # Get "image/png"
                                ai_image_data = {"mimeType": mime_type, "data": base64_data}
                                current_app.logger.debug(f"Extracted image data (mimeType: {mime_type}) from complex response.")
                            except Exception as e:
                                current_app.logger.error(f"ERROR: Failed to parse image data URL from AI response: {data_url} - {e}")
                        else:
                            current_app.logger.warning(f"Received image_url part, but URL format is unexpected: {data_url}")
            elif content is not None:
                 current_app.logger.warning(f"Unexpected AI response content type: {type(content).__name__}. Treating as string.")
                 ai_response_text = str(content)

            # Check if we got any content
            if ai_response_text is None and ai_image_data is None:
                error_message = "Could not extract text or image content from OpenRouter API response."
                current_app.logger.error(f"{error_message} Response Body: {response_data}")
                status_code = 500
            else:
                # Success! Increment trial prompt count if the trial key was used
                if use_trial_key:
                    prompt_count += 1
                    session[SESSION_PROMPT_COUNT] = prompt_count
                    current_app.logger.info(f"Trial prompt count incremented to: {prompt_count}")
                status_code = 200 # Explicitly set success status

        else:
            error_message = "Invalid response structure from AI service (missing choices)."
            current_app.logger.error(f"{error_message} Response: {response_data}")
            status_code = 500

    except requests.exceptions.Timeout:
        error_message = "Request timed out while contacting AI service."
        current_app.logger.error(error_message)
        status_code = 504 # Gateway Timeout
    except requests.exceptions.RequestException as e:
        error_message = f"Failed to communicate with AI service: {e}"
        current_app.logger.error(error_message)
        status_code = 502 # Bad Gateway
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        current_app.logger.exception("Unexpected error during chat completion:") # Log stack trace
        status_code = 500

    # --- 7. Return response to frontend (Matching Java structure) ---
    if status_code == 200:
        response_payload = {
            "responseText": ai_response_text.strip() if ai_response_text else None,
            "imageData": ai_image_data, # Will be null if no image
            "error": None
        }
        return jsonify(response_payload), 200
    else:
        # Ensure error_message has a default value
        if not error_message:
            error_message = "An unknown error occurred."
        response_payload = {
            "responseText": None,
            "imageData": None,
            "error": error_message
        }
        return jsonify(response_payload), status_code


@chat_bp.route('/save-key', methods=['POST'])
def save_api_key():
    data = request.get_json()
    api_key = data.get('apiKey')
    if api_key and api_key.strip():
        session[SESSION_USER_API_KEY] = api_key.strip()
        session[SESSION_PROMPT_COUNT] = 0 # Reset trial count when user provides key
        current_app.logger.info("User's OpenRouter API Key saved to session. Trial prompt count reset.")
        return jsonify({"message": "API Key saved successfully for this session."}), 200
    else:
        # Allow clearing the key
        session.pop(SESSION_USER_API_KEY, None)
        # We don't necessarily reset count when key is cleared, user might rely on trial again
        current_app.logger.info("User's OpenRouter API Key cleared from session.")
        return jsonify({"message": "API key cleared"}), 200

@chat_bp.route('/debug/models', methods=['GET'])
def get_models():
    """Fetches available models dynamically from OpenRouter using the server API key."""
    server_api_key = current_app.config.get('OPENROUTER_API_KEY')

    if not server_api_key or server_api_key == "YOUR_OPENROUTER_API_KEY_HERE":
         current_app.logger.error("ERROR: Server trial API key needed for /debug/models endpoint is not configured.")
         # Return empty list as per Java error handling for this endpoint
         return jsonify([]), 500 # Internal Server Error status

    headers = {
        "Authorization": f"Bearer {server_api_key}",
        "Content-Type": "application/json", # Although GET, some APIs like it
        "HTTP-Referer": HTTP_REFERER,
        "X-Title": f"{X_TITLE}-debug" # Distinguish debug call
    }

    try:
        current_app.logger.info("Fetching available models from OpenRouter API")
        response = requests.get(OPENROUTER_MODELS_URL, headers=headers, timeout=30)

        if response.status_code == 200:
            response_data = response.json()
            current_app.logger.debug(f"DEBUG: Raw OpenRouter /models response body: {response_data}")
            model_list = response_data.get("data") # Models are under the "data" key

            if isinstance(model_list, list):
                current_app.logger.info(f"DEBUG: Extracted model list from OpenRouter response (count: {len(model_list)})")
                # Return only the list of models, matching Java behavior
                return jsonify(model_list), 200
            else:
                current_app.logger.error(f"ERROR: Could not find 'data' list in OpenRouter models response. Response body: {response_data}")
                return jsonify([]), 500
        else:
            current_app.logger.error(f"Error fetching models from OpenRouter: {response.status_code} - {response.text}")
            return jsonify([]), response.status_code

    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"ERROR: RequestException during OpenRouter /models call: {e}")
        return jsonify([]), 502 # Bad Gateway for network errors
    except Exception as e:
        current_app.logger.exception("ERROR: Unexpected Exception during OpenRouter /models call.")
        return jsonify([]), 500


@chat_bp.route('/model', methods=['GET'])
def get_current_model():
    """Gets the currently selected model for the session."""
    selected_model = session.get(SESSION_SELECTED_MODEL)
    if not selected_model:
        selected_model = get_default_model()
    current_app.logger.info(f"GET /api/chat/model - Returning current model: {selected_model}")
    # Return in the format Java uses: {"currentModel": "..."}
    return jsonify({"currentModel": selected_model}), 200


@chat_bp.route('/model', methods=['POST'])
def update_model():
    """Updates the model identifier for the session."""
    data = request.get_json()
    # Match Java's expected key "model"
    new_model = data.get('model') if data else None

    if not new_model or not new_model.strip():
         return jsonify({"message": "Model identifier cannot be empty."}), 400 # Match Java error msg, return 400

    trimmed_model = new_model.strip()
    session[SESSION_SELECTED_MODEL] = trimmed_model
    current_app.logger.info(f"POST /api/chat/model - Updated session model to: {trimmed_model}")
    # Match Java's success response structure
    return jsonify({"message": "Model updated successfully for this session.", "newModel": trimmed_model}), 200


@chat_bp.route('/default-model', methods=['POST'])
@auth.login_required # Keep authentication for changing global setting
def update_global_default_model():
    data = request.get_json()
    """Updates the GLOBAL default model identifier. Admin only."""
    data = request.get_json()
    new_default_model = data.get('model') if data else None

    if not new_default_model or not new_default_model.strip():
        # Match Java error message and status
        return jsonify({"message": "Global default model identifier cannot be empty."}), 400

    trimmed_default_model = new_default_model.strip()

    try:
        with current_app.app_context():
            setting = AppSettings.query.filter_by(setting_key='default_model').first()
            if setting:
                setting.setting_value = trimmed_default_model
                current_app.logger.info(f"Updating existing global default model setting to: {trimmed_default_model}")
            else:
                setting = AppSettings(setting_key='default_model', setting_value=trimmed_default_model)
                db.session.add(setting)
                current_app.logger.info(f"Creating new global default model setting: {trimmed_default_model}")

            db.session.commit()
            current_app.logger.info(f"POST /api/chat/default-model - Updated global default model to: {trimmed_default_model}")
            # Match Java's success response structure
            return jsonify({"message": "Global default model updated successfully.", "newGlobalDefaultModel": trimmed_default_model}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating global default model: {e}")
        # Match Java's error response structure
        return jsonify({"message": "Failed to update global default model due to an internal error."}), 500