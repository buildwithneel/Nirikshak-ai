import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("nirikshak-db-conn")

# Configurable database URL (SQLite default for local development, PostgreSQL ready for Supabase)
DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nirikshak.db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

# Fix Supabase / Heroku postgres:// prefix for SQLAlchemy 2.0+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure database engine options based on dialect
engine_kwargs = {
    "echo": False,
    "future": True,
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    logger.info("Database configured for SQLite (development/local)")
else:
    # Supabase PostgreSQL production connection pool settings
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": int(os.environ.get("DB_POOL_RECYCLE", "300")),
        "pool_size": int(os.environ.get("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.environ.get("DB_MAX_OVERFLOW", "20")),
    })
    logger.info("Database configured for PostgreSQL / Supabase with production pooling")

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_db():
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_postgres() -> bool:
    """Returns True if the active database is PostgreSQL (e.g. Supabase)."""
    return not DATABASE_URL.startswith("sqlite")


def get_db_type() -> str:
    """Returns human-readable database dialect string."""
    return "Supabase PostgreSQL" if is_postgres() else "SQLite"
