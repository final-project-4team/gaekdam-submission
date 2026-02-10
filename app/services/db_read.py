# Archived shim. Use archived implementation at app.legacy_db.db_read if needed.
from app.legacy_db import db_read as archived_db_read

# Re-export functions for compatibility but avoid importing SQLAlchemy at runtime in main path.
get_checkin_count = archived_db_read.get_checkin_count
get_checkout_count = archived_db_read.get_checkout_count
