from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class AppSettings(db.Model):
    __tablename__ = 'app_settings'
    setting_key = db.Column(db.String(255), primary_key=True)
    setting_value = db.Column(db.String(1024))

    def to_dict(self):
        return {
            'setting_key': self.setting_key,
            'setting_value': self.setting_value
        }

class MemoryFact(db.Model):
    __tablename__ = 'memory_facts'
    id = db.Column(db.Integer, primary_key=True)
    fact_text = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'fact_text': self.fact_text
        }

class TrainingInstruction(db.Model):
    __tablename__ = 'training_instructions'
    id = db.Column(db.Integer, primary_key=True)
    instruction_text = db.Column(db.Text, nullable=False)
    is_hidden = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'instruction_text': self.instruction_text,
            'is_hidden': self.is_hidden
        }