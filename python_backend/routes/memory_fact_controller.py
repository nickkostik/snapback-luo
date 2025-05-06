from flask import Blueprint, request, jsonify, current_app
from ..models import db, MemoryFact

memory_bp = Blueprint('memory_bp', __name__)

@memory_bp.route('/', methods=['GET'])
def get_memory_facts():
    try:
        facts = MemoryFact.query.all()
        return jsonify([fact.to_dict() for fact in facts]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching memory facts: {e}")
        return jsonify({"error": "Failed to retrieve memory facts"}), 500

@memory_bp.route('/', methods=['POST'])
def add_memory_fact():
    data = request.get_json()
    if not data or 'fact_text' not in data or not data['fact_text'].strip():
        return jsonify({"error": "Missing or empty 'fact_text' in request body"}), 400

    fact_text = data['fact_text'].strip()

    try:
        new_fact = MemoryFact(fact_text=fact_text)
        db.session.add(new_fact)
        db.session.commit()
        return jsonify(new_fact.to_dict()), 201 # 201 Created
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding memory fact: {e}")
        return jsonify({"error": "Failed to add memory fact"}), 500

@memory_bp.route('/<int:id>', methods=['PUT'])
def update_memory_fact(id):
    data = request.get_json()
    if not data or 'fact_text' not in data or not data['fact_text'].strip():
        return jsonify({"error": "Missing or empty 'fact_text' in request body"}), 400

    fact_text = data['fact_text'].strip()

    try:
        fact = MemoryFact.query.get(id)
        if not fact:
            return jsonify({"error": f"Memory fact with id {id} not found"}), 404

        fact.fact_text = fact_text
        db.session.commit()
        return jsonify(fact.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating memory fact {id}: {e}")
        return jsonify({"error": "Failed to update memory fact"}), 500

@memory_bp.route('/<int:id>', methods=['DELETE'])
def delete_memory_fact(id):
    try:
        fact = MemoryFact.query.get(id)
        if not fact:
            return jsonify({"error": f"Memory fact with id {id} not found"}), 404

        db.session.delete(fact)
        db.session.commit()
        # Return the deleted object's ID or a success message
        # Returning the ID might be useful for the frontend
        return jsonify({"message": f"Memory fact with id {id} deleted successfully", "deleted_id": id}), 200
        # Alternatively, return No Content:
        # return '', 204
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting memory fact {id}: {e}")
        return jsonify({"error": "Failed to delete memory fact"}), 500