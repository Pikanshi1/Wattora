
import sqlite3
from contextlib import closing
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field


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
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                type TEXT NOT NULL,
                solar_capacity REAL NOT NULL DEFAULT 0,
                daily_usage REAL NOT NULL DEFAULT 10,
                is_primary INTEGER NOT NULL DEFAULT 0
            )
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


def find_site(connection, site_id: int):
    row = connection.execute(
        "SELECT * FROM sites WHERE id = ?",
        (site_id,),
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )

    return row


@router.get("", response_model=list[SiteResponse])
def list_sites():
    with closing(get_connection()) as connection:
        rows = connection.execute(
            "SELECT * FROM sites ORDER BY is_primary DESC, id ASC"
        ).fetchall()

        return [serialize_site(row) for row in rows]


@router.post(
    "",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_site(site: SiteCreate):
    data = site.dict()
    data["name"] = data["name"].strip()
    data["location"] = data["location"].strip()
    data["type"] = data["type"].strip()

    if not data["name"] or not data["location"] or not data["type"]:
        raise HTTPException(
            status_code=422,
            detail="Name, location, and property type cannot be blank",
        )

    with closing(get_connection()) as connection:
        with connection:
            count = connection.execute(
                "SELECT COUNT(*) FROM sites"
            ).fetchone()[0]

            cursor = connection.execute(
                """
                INSERT INTO sites
                    (name, location, type, solar_capacity,
                     daily_usage, is_primary)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    data["name"],
                    data["location"],
                    data["type"],
                    data["solar_capacity"],
                    data["daily_usage"],
                    1 if count == 0 else 0,
                ),
            )

            row = find_site(connection, cursor.lastrowid)
            return serialize_site(row)


@router.put("/{site_id}", response_model=SiteResponse)
def update_site(site_id: int, site: SiteCreate):
    data = site.dict()
    data["name"] = data["name"].strip()
    data["location"] = data["location"].strip()
    data["type"] = data["type"].strip()

    if not data["name"] or not data["location"] or not data["type"]:
        raise HTTPException(
            status_code=422,
            detail="Name, location, and property type cannot be blank",
        )

    with closing(get_connection()) as connection:
        with connection:
            find_site(connection, site_id)

            connection.execute(
                """
                UPDATE sites
                SET name = ?, location = ?, type = ?,
                    solar_capacity = ?, daily_usage = ?
                WHERE id = ?
                """,
                (
                    data["name"],
                    data["location"],
                    data["type"],
                    data["solar_capacity"],
                    data["daily_usage"],
                    site_id,
                ),
            )

            return serialize_site(find_site(connection, site_id))


@router.delete("/{site_id}")
def delete_site(site_id: int):
    with closing(get_connection()) as connection:
        with connection:
            site = find_site(connection, site_id)
            was_primary = bool(site["is_primary"])

            connection.execute(
                "DELETE FROM sites WHERE id = ?",
                (site_id,),
            )

            if was_primary:
                next_site = connection.execute(
                    "SELECT id FROM sites ORDER BY id ASC LIMIT 1"
                ).fetchone()

                if next_site:
                    connection.execute(
                        "UPDATE sites SET is_primary = 1 WHERE id = ?",
                        (next_site["id"],),
                    )

    return {"message": "Site deleted successfully", "id": site_id}


@router.patch("/{site_id}/primary", response_model=SiteResponse)
def set_primary_site(site_id: int):
    with closing(get_connection()) as connection:
        with connection:
            find_site(connection, site_id)

            connection.execute(
                "UPDATE sites SET is_primary = 0"
            )
            connection.execute(
                "UPDATE sites SET is_primary = 1 WHERE id = ?",
                (site_id,),
            )

            return serialize_site(find_site(connection, site_id))
