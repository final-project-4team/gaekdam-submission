# Archived shim. Use archived implementation at app.legacy_db.db_client if needed.
from app.legacy_db import db_client as archived_db_client

# Re-export functions for compatibility but avoid importing SQLAlchemy at runtime in main path.
save_conversation = archived_db_client.save_conversation
get_recent_conversations = archived_db_client.get_recent_conversations