import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if database_url:
    if database_url.startswith("postgres://"):
        database_url = "postgresql+psycopg://" + database_url.removeprefix(
            "postgres://"
        )
    elif database_url.startswith("postgresql://"):
        database_url = "postgresql+psycopg://" + database_url.removeprefix(
            "postgresql://"
        )
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 10},
    )
else:
    database_url = URL.create(
        drivername="postgresql+psycopg",
        username=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.environ["DB_NAME"],
    )
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 10,
        },
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_db_connection():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def init_app_tables():
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS sites (
                id BIGSERIAL PRIMARY KEY,
                owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(150) NOT NULL,
                type VARCHAR(50) NOT NULL,
                solar_capacity DOUBLE PRECISION NOT NULL DEFAULT 0,
                daily_usage DOUBLE PRECISION NOT NULL DEFAULT 10,
                is_primary BOOLEAN NOT NULL DEFAULT FALSE
            )
        """))
        connection.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_one_primary_per_owner
            ON sites(owner_id)
            WHERE is_primary = TRUE
        """))
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS devices (
                id BIGSERIAL PRIMARY KEY,
                site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
                name VARCHAR(60) NOT NULL,
                category VARCHAR(20) NOT NULL,
                power DOUBLE PRECISION NOT NULL,
                hours DOUBLE PRECISION NOT NULL,
                flexible BOOLEAN NOT NULL DEFAULT TRUE,
                enabled BOOLEAN NOT NULL DEFAULT TRUE
            )
        """))


if __name__ == "__main__":
    test_db_connection()
    print("PostgreSQL connection successful!")
