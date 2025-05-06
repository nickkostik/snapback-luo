from flask import Blueprint, request, jsonify, current_app
from ..models import db, TrainingInstruction
from .. import auth # Import auth instance from __init__

instruction_bp = Blueprint('instruction_bp', __name__)

# --- Public Endpoints ---

@instruction_bp.route('/', methods=['GET'], strict_slashes=False) # Allow both /api/instructions and /api/instructions/
def get_visible_instructions():
    """Gets all training instructions that are not hidden."""
    try:
        instructions = TrainingInstruction.query.filter_by(is_hidden=False).all()
        return jsonify([instruction.to_dict() for instruction in instructions]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching visible instructions: {e}")
        return jsonify({"error": "Failed to retrieve visible instructions"}), 500

@instruction_bp.route('/', methods=['POST'])
def add_visible_instruction():
    """Adds a new training instruction, defaulting to visible."""
    data = request.get_json()
    # Accept 'instructionText' (camelCase) from frontend
    if not data or 'instructionText' not in data or not data['instructionText'].strip():
        return jsonify({"error": "Missing or empty 'instructionText' in request body"}), 400

    instruction_text = data['instructionText'].strip()

    try:
        # New instructions added via this public endpoint are visible by default
        new_instruction = TrainingInstruction(instruction_text=instruction_text, is_hidden=False)
        db.session.add(new_instruction)
        db.session.commit()
        return jsonify(new_instruction.to_dict()), 201 # 201 Created
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding visible instruction: {e}")
        return jsonify({"error": "Failed to add instruction"}), 500

# --- Admin Endpoints ---

@instruction_bp.route('/all', methods=['GET'])
@auth.login_required
def get_all_instructions():
    """Gets all training instructions (visible and hidden). Admin only."""
    try:
        instructions = TrainingInstruction.query.all()
        return jsonify([instruction.to_dict() for instruction in instructions]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching all instructions: {e}")
        return jsonify({"error": "Failed to retrieve all instructions"}), 500

@instruction_bp.route('/<int:id>', methods=['DELETE'])
@auth.login_required
def delete_instruction(id):
    """Deletes a specific training instruction. Admin only."""
    try:
        instruction = TrainingInstruction.query.get(id)
        if not instruction:
            return jsonify({"error": f"Training instruction with id {id} not found"}), 404

        db.session.delete(instruction)
        db.session.commit()
        return jsonify({"message": f"Instruction with id {id} deleted successfully", "deleted_id": id}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting instruction {id}: {e}")
        return jsonify({"error": "Failed to delete instruction"}), 500

@instruction_bp.route('/debug', methods=['GET'])
@auth.login_required
def get_all_instructions_debug():
    """Gets all instructions with specific fields for debugging. Admin only."""
    try:
        instructions = TrainingInstruction.query.all()
        result = [
            {"id": inst.id, "text": inst.instruction_text, "hidden": inst.is_hidden}
            for inst in instructions
        ]
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching debug instructions: {e}")
        return jsonify({"error": "Failed to retrieve debug instructions"}), 500

@instruction_bp.route('/add-hidden', methods=['POST'])
@auth.login_required
def add_hidden_instruction():
    """Adds a new hidden training instruction. Admin only."""
    data = request.get_json()
    # Accept 'instructionText' (camelCase) from frontend
    if not data or 'instructionText' not in data or not data['instructionText'].strip():
        return jsonify({"error": "Missing or empty 'instructionText' in request body"}), 400

    instruction_text = data['instructionText'].strip()

    try:
        new_instruction = TrainingInstruction(instruction_text=instruction_text, is_hidden=True)
        db.session.add(new_instruction)
        db.session.commit()
        return jsonify(new_instruction.to_dict()), 201 # 201 Created
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding hidden instruction: {e}")
        return jsonify({"error": "Failed to add hidden instruction"}), 500

@instruction_bp.route('/<int:id>/toggle-visibility', methods=['POST'])
@auth.login_required
def set_instruction_visibility(id):
    """Sets the visibility of a specific training instruction explicitly. Admin only."""
    data = request.get_json()
    if data is None or 'is_hidden' not in data or not isinstance(data['is_hidden'], bool):
        return jsonify({"error": "Missing or invalid 'is_hidden' (boolean) in request body"}), 400

    is_hidden_value = data['is_hidden']

    try:
        instruction = TrainingInstruction.query.get(id)
        if not instruction:
            return jsonify({"error": f"Training instruction with id {id} not found"}), 404

        instruction.is_hidden = is_hidden_value # Set explicitly
        db.session.commit()
        current_app.logger.info(f"Set visibility for instruction {id} to is_hidden={is_hidden_value}")
        return jsonify(instruction.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error setting visibility for instruction {id}: {e}")
        return jsonify({"error": "Failed to set instruction visibility"}), 500

# --- Hardcoded Initialization Logic ---

# List of hardcoded instructions from Java version
HARDCODED_INSTRUCTIONS = [
    "You should be friendly and helpful, but maintain your persona.",
    "Do not reveal that you are an AI model.",
    "Keep your responses concise unless asked for detail.",
    "If asked about your 'source code' or 'programming', politely deflect.",
    "You have access to memories and facts provided to you.",
    "You can learn new facts through conversation.",
    "Your primary goal is to simulate the persona of (Nicholas Jacob Kostik) Nick Kostik accurately."
]

def _initialize_hardcoded_instructions():
    """
    Checks for existing hardcoded instructions and adds any missing ones as hidden.
    This mimics the core logic of the Java initialization.
    Returns counts of existing, added, and final instructions.
    """
    existing_instructions = TrainingInstruction.query.all()
    existing_texts = {inst.instruction_text for inst in existing_instructions}
    added_count = 0

    current_app.logger.info(f"Found {len(existing_instructions)} existing instructions before hardcoded check.")

    for text in HARDCODED_INSTRUCTIONS:
        if text not in existing_texts:
            try:
                new_instruction = TrainingInstruction(instruction_text=text, is_hidden=True)
                db.session.add(new_instruction)
                db.session.flush() # Assign ID before logging
                current_app.logger.info(f"Adding missing hardcoded (hidden) instruction ID {new_instruction.id}: '{text}'")
                added_count += 1
            except Exception as e:
                 current_app.logger.error(f"Error adding hardcoded instruction '{text}': {e}")
                 # Continue trying to add others
        # else: # Optional: Log if found
            # current_app.logger.info(f"Hardcoded instruction already exists: '{text}'")

    try:
        db.session.commit()
        current_app.logger.info(f"Committed {added_count} new hardcoded instructions.")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error committing new hardcoded instructions: {e}")
        # Return error indication? For now, just log.

    final_count = TrainingInstruction.query.count()
    return len(existing_instructions), added_count, final_count


@instruction_bp.route('/init-hardcoded', methods=['POST'])
@auth.login_required
def init_hardcoded_endpoint():
    """Manually triggers the initialization of hardcoded instructions. Admin only."""
    current_app.logger.info("Manual trigger for hardcoded instruction initialization.")
    try:
        existing_count, added_count, final_count = _initialize_hardcoded_instructions()
        message = (f"Hardcoded instruction check complete. "
                   f"Found {existing_count} existing. Added {added_count} new (as hidden). "
                   f"Total instructions now: {final_count}.")
        return jsonify({"message": message}), 200
    except Exception as e:
        # Catch potential errors within the helper itself if not handled there
        current_app.logger.error(f"Error during hardcoded instruction initialization: {e}")
        return jsonify({"error": "Failed to initialize hardcoded instructions"}), 500


@instruction_bp.route('/reset-all', methods=['POST'])
@auth.login_required
def reset_all_instructions():
    """Deletes ALL instructions and re-initializes hardcoded ones. DANGEROUS. Admin only."""
    current_app.logger.warning("Executing RESET ALL instructions request.")
    try:
        # Delete all existing instructions
        num_deleted = db.session.query(TrainingInstruction).delete()
        db.session.commit()
        current_app.logger.info(f"Deleted {num_deleted} instructions.")

        # Re-initialize hardcoded ones
        existing_count, added_count, final_count = _initialize_hardcoded_instructions()
        message = (f"Successfully deleted {num_deleted} instructions and re-initialized hardcoded ones. "
                   f"Added {added_count} hardcoded (as hidden). "
                   f"Total instructions now: {final_count}.")
        return jsonify({"message": message}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during reset all instructions: {e}")
        return jsonify({"error": "Failed to reset instructions"}), 500