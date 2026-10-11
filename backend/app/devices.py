import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth import get_current_user

router = APIRouter(prefix="/api/devices", tags=["Devices"])

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
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                power REAL NOT NULL,
                hours REAL NOT NULL,
                flexible INTEGER NOT NULL DEFAULT 1,
                enabled INTEGER NOT NULL DEFAULT 1
            )
            """
        )
        connection.commit()


init_db()


class DeviceInput(BaseModel):
    site_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=60)
    category: Literal["Appliances", "Climate", "Other"]
    power: float = Field(gt=0, le=100)
    hours: float = Field(gt=0, le=24)
    flexible: bool = True
    enabled: bool = True


class DeviceToggle(BaseModel):
    enabled: bool


class DeviceResponse(BaseModel):
    id: int
    site_id: int
    name: str
    category: Literal["Appliances", "Climate", "Other"]
    power: float
    hours: float
    flexible: bool
    enabled: bool


def serialize_device(row):
    device = dict(row)
    device["flexible"] = bool(device["flexible"])
    device["enabled"] = bool(device["enabled"])
    return device


def find_device(connection, device_id: int, owner_id: int):
    row = connection.execute(
        """
        SELECT d.* FROM devices d
        JOIN sites s ON s.id = d.site_id
        WHERE d.id = ? AND s.owner_id = ?
        """,
        (device_id, owner_id),
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    return row


def check_site(connection, site_id: int, owner_id: int):
    row = connection.execute(
        "SELECT id FROM sites WHERE id = ? AND owner_id = ?",
        (site_id, owner_id),
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found.",
        )


@router.get("", response_model=list[DeviceResponse])
def list_devices(
    site_id: int = Query(gt=0),
    user=Depends(get_current_user),
):
    with closing(get_connection()) as connection:
        check_site(connection, site_id, user["id"])
        rows = connection.execute(
            """
            SELECT d.* FROM devices d
            JOIN sites s ON s.id = d.site_id
            WHERE d.site_id = ? AND s.owner_id = ?
            ORDER BY d.id ASC
            """,
            (site_id, user["id"]),
        ).fetchall()

        return [serialize_device(row) for row in rows]


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_device(device: DeviceInput, user=Depends(get_current_user)):
    data = device.model_dump()
    data["name"] = data["name"].strip()
    if not data["name"]:
        raise HTTPException(status_code=422, detail="Device name cannot be blank.")

    with closing(get_connection()) as connection:
        with connection:
            check_site(connection, data["site_id"], user["id"])
            cursor = connection.execute(
                """
                INSERT INTO devices
                    (site_id, name, category, power, hours, flexible, enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["site_id"],
                    data["name"],
                    data["category"],
                    data["power"],
                    data["hours"],
                    int(data["flexible"]),
                    int(data["enabled"]),
                ),
            )
            return serialize_device(
                find_device(connection, cursor.lastrowid, user["id"])
            )


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: int,
    device: DeviceInput,
    user=Depends(get_current_user),
):
    data = device.model_dump()
    data["name"] = data["name"].strip()
    if not data["name"]:
        raise HTTPException(status_code=422, detail="Device name cannot be blank.")

    with closing(get_connection()) as connection:
        with connection:
            find_device(connection, device_id, user["id"])
            check_site(connection, data["site_id"], user["id"])
            connection.execute(
                """
                UPDATE devices
                SET site_id = ?, name = ?, category = ?, power = ?, hours = ?,
                    flexible = ?, enabled = ?
                WHERE id = ?
                """,
                (
                    data["site_id"],
                    data["name"],
                    data["category"],
                    data["power"],
                    data["hours"],
                    int(data["flexible"]),
                    int(data["enabled"]),
                    device_id,
                ),
            )
            return serialize_device(
                find_device(connection, device_id, user["id"])
            )


@router.patch("/{device_id}", response_model=DeviceResponse)
def toggle_device(
    device_id: int,
    payload: DeviceToggle,
    user=Depends(get_current_user),
):
    with closing(get_connection()) as connection:
        with connection:
            find_device(connection, device_id, user["id"])
            connection.execute(
                "UPDATE devices SET enabled = ? WHERE id = ?",
                (int(payload.enabled), device_id),
            )
            return serialize_device(
                find_device(connection, device_id, user["id"])
            )


@router.delete("/{device_id}")
def delete_device(device_id: int, user=Depends(get_current_user)):
    with closing(get_connection()) as connection:
        with connection:
            find_device(connection, device_id, user["id"])
            connection.execute("DELETE FROM devices WHERE id = ?", (device_id,))

    return {"message": "Device deleted successfully", "id": device_id}
