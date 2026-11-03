"""Vercel Python entrypoint: serves the FastAPI app at /api/*."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api"))

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402,F401
from app.seed import seed  # noqa: E402

# Lifespan isn't guaranteed on serverless; init + seed at import (cold start).
Base.metadata.create_all(bind=engine)
_s = SessionLocal()
try:
    seed(_s)
finally:
    _s.close()
