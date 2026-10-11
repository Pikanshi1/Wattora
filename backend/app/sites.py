import sqlite3
from contextlib import closing
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_current_user

router = APIRouter(prefix="/api/sites", tags=["Sites"])

DB_PATH = Path(__file__).resolve().parent.parent / "wattora.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with closing(get_connection()) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                type TEXT NOT NULL,
                solar_capacity REAL NOT NULL DEFAULT 0,
                daily_usage REAL NOT NULL DEFAULT 10,
                is_primary INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(sites)").fetchall()
        }
        if "owner_id" not in columns:
            connection.execute("ALTER TABLE sites ADD COLUMN owner_id INTEGER")
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_one_primary_per_owner
            ON sites(owner_id)
            WHERE is_primary = 1 AND owner_id IS NOT NULL
            """
        )
        connection.commit()


init_db()


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=150)
    type: str = Field(min_length=1, max_length=50)
    solar_capacity: float = Field(ge=0, le=100000)
    daily_usage: float = Field(ge=0, le=1000000)


class SiteResponse(BaseModel):
    id: int
    name: str
    location: str
    type: str
    solar_capacity: float
    daily_usage: float
    is_primary: bool


def serialize_site(row):
    site = dict(row)
    site["is_primary"] = bool(site["is_primary"])
    return site


def find_site(connection, site_id: int, owner_id: int):
    row = connection.execute(
        "SELECT * FROM sites WHERE id = ? AND owner_id = ?",
        (site_id, owner_id),
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found.",
        )

    return row


@router.get("", response_model=list[SiteResponse])
def list_sites(user=Depends(get_current_user)):
    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT * FROM sites
            WHERE owner_id = ?
            ORDER BY is_primary DESC, id ASC
            """,
            (user["id"],),
        ).fetchall()

        return [serialize_site(row) for row in rows]


@router.post(
    "",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_site(site: SiteCreate, user=Depends(get_current_user)):
    data = site.model_dump()
    data["name"] = data["name"].strip()
    data["location"] = data["location"].strip()
    data["type"] = data["type"].strip()

    if not data["name"] or not data["location"] or not data["type"]:
        raise HTTPException(
            status_code=422,
            detail="Name, location, and property type cannot be blank.",
        )

    with closing(get_connection()) as connection:
        with connection:
            count = connection.execute(
                "SELECT COUNT(*) FROM sites WHERE owner_id = ?",
                (user["id"],),
            ).fetchone()[0]
            cursor = connection.execute(
                """
                INSERT INTO sites
                    (owner_id, name, location, type, solar_capacity,
                     daily_usage, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    data["name"],
                    data["location"],
                    data["type"],
                    data["solar_capacity"],
                    data["daily_usage"],
                    int(count == 0),
                ),
            )
            return serialize_site(
                find_site(connection, cursor.lastrowid, user["id"])
            )


@router.put("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int,
    site: SiteCreate,
    user=Depends(get_current_user),
):
    data = site.model_dump()
    data["name"] = data["name"].strip()
    data["location"] = data["location"].strip()
    data["type"] = data["type"].strip()

    if not data["name"] or not data["location"] or not data["type"]:
        raise HTTPException(
            status_code=422,
            detail="Name, location, and property type cannot be blank.",
        )

    with closing(get_connection()) as connection:
        with connection:
            find_site(connection, site_id, user["id"])
            connection.execute(
                """
                UPDATE sites
                SET name = ?, location = ?, type = ?,
                    solar_capacity = ?, daily_usage = ?
                WHERE id = ? AND owner_id = ?
                """,
                (
                    data["name"],
                    data["location"],
                    data["type"],
                    data["solar_capacity"],
                    data["daily_usage"],
                    site_id,
                    user["id"],
                ),
            )
            return serialize_site(
                find_site(connection, site_id, user["id"])
            )


@router.delete("/{site_id}")
def delete_site(site_id: int, user=Depends(get_current_user)):
    with closing(get_connection()) as connection:
        with connection:
            site = find_site(connection, site_id, user["id"])
            was_primary = bool(site["is_primary"])
            connection.execute("DELETE FROM devices WHERE site_id = ?", (site_id,))
            connection.execute(
                "DELETE FROM sites WHERE id = ? AND owner_id = ?",
                (site_id, user["id"]),
            )

            if was_primary:
                next_site = connection.execute(
                    """
                    SELECT id FROM sites
                    WHERE owner_id = ?
                    ORDER BY id ASC LIMIT 1
                    """,
                    (user["id"],),
                ).fetchone()
                if next_site:
                    connection.execute(
                        """
                        UPDATE sites SET is_primary = 1
                        WHERE id = ? AND owner_id = ?
                        """,
                        (next_site["id"], user["id"]),
                    )

    return {"message": "Site deleted successfully", "id": site_id}


@router.patch("/{site_id}/primary", response_model=SiteResponse)
def set_primary_site(site_id: int, user=Depends(get_current_user)):
    with closing(get_connection()) as connection:
        with connection:
            find_site(connection, site_id, user["id"])
            connection.execute(
                "UPDATE sites SET is_primary = 0 WHERE owner_id = ?",
                (user["id"],),
            )
            connection.execute(
                "UPDATE sites SET is_primary = 1 WHERE id = ? AND owner_id = ?",
                (site_id, user["id"]),
            )
            return serialize_site(
                find_site(connection, site_id, user["id"])
            )
