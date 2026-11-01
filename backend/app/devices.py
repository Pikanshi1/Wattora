from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.auth import get_current_user
from database import engine

router = APIRouter(prefix="/api/devices", tags=["Devices"])


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
        text("""
            SELECT d.* FROM devices d
            JOIN sites s ON s.id = d.site_id
            WHERE d.id = :device_id AND s.owner_id = :owner_id
        """),
        {"device_id": device_id, "owner_id": owner_id},
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found.",
        )

    return row


def check_site(connection, site_id: int, owner_id: int):
    site = connection.execute(
        text("SELECT id FROM sites WHERE id = :site_id AND owner_id = :owner_id"),
        {"site_id": site_id, "owner_id": owner_id},
    ).first()

    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found.",
        )


@router.get("", response_model=list[DeviceResponse])
def list_devices(
    site_id: int = Query(gt=0),
    user=Depends(get_current_user),
):
    with engine.connect() as connection:
        check_site(connection, site_id, user["id"])
        rows = connection.execute(
            text("""
                SELECT d.* FROM devices d
                JOIN sites s ON s.id = d.site_id
                WHERE d.site_id = :site_id AND s.owner_id = :owner_id
                ORDER BY d.id ASC
            """),
            {"site_id": site_id, "owner_id": user["id"]},
        ).mappings().all()
        return [serialize_device(row) for row in rows]


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(device: DeviceInput, user=Depends(get_current_user)):
    data = device.model_dump()
    data["name"] = data["name"].strip()
    if not data["name"]:
        raise HTTPException(status_code=422, detail="Device name cannot be blank.")

    with engine.begin() as connection:
        check_site(connection, data["site_id"], user["id"])
        device_id = connection.execute(
            text("""
                INSERT INTO devices
                    (site_id, name, category, power, hours, flexible, enabled)
                VALUES
                    (:site_id, :name, :category, :power, :hours, :flexible, :enabled)
                RETURNING id
            """),
            data,
        ).scalar_one()
        return serialize_device(find_device(connection, device_id, user["id"]))


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

    with engine.begin() as connection:
        find_device(connection, device_id, user["id"])
        check_site(connection, data["site_id"], user["id"])
        connection.execute(
            text("""
                UPDATE devices
                SET site_id = :site_id, name = :name, category = :category,
                    power = :power, hours = :hours, flexible = :flexible,
                    enabled = :enabled
                WHERE id = :device_id
            """),
            {**data, "device_id": device_id},
        )
        return serialize_device(find_device(connection, device_id, user["id"]))


@router.patch("/{device_id}", response_model=DeviceResponse)
def toggle_device(
    device_id: int,
    payload: DeviceToggle,
    user=Depends(get_current_user),
):
    with engine.begin() as connection:
        find_device(connection, device_id, user["id"])
        connection.execute(
            text("UPDATE devices SET enabled = :enabled WHERE id = :device_id"),
            {"enabled": payload.enabled, "device_id": device_id},
        )
        return serialize_device(find_device(connection, device_id, user["id"]))


@router.delete("/{device_id}")
def delete_device(device_id: int, user=Depends(get_current_user)):
    with engine.begin() as connection:
        find_device(connection, device_id, user["id"])
        connection.execute(
            text("DELETE FROM devices WHERE id = :device_id"),
            {"device_id": device_id},
        )

    return {"message": "Device deleted successfully", "id": device_id}
