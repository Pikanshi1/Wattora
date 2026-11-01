from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.auth import get_current_user
from database import engine

router = APIRouter(prefix="/api/sites", tags=["Sites"])


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
        text("SELECT * FROM sites WHERE id = :site_id AND owner_id = :owner_id"),
        {"site_id": site_id, "owner_id": owner_id},
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found.",
        )

    return row


@router.get("", response_model=list[SiteResponse])
def list_sites(user=Depends(get_current_user)):
    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT * FROM sites
                WHERE owner_id = :owner_id
                ORDER BY is_primary DESC, id ASC
            """),
            {"owner_id": user["id"]},
        ).mappings().all()
        return [serialize_site(row) for row in rows]


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
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

    with engine.begin() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM sites WHERE owner_id = :owner_id"),
            {"owner_id": user["id"]},
        ).scalar_one()
        site_id = connection.execute(
            text("""
                INSERT INTO sites
                    (owner_id, name, location, type, solar_capacity,
                     daily_usage, is_primary)
                VALUES
                    (:owner_id, :name, :location, :type, :solar_capacity,
                     :daily_usage, :is_primary)
                RETURNING id
            """),
            {
                "owner_id": user["id"],
                **data,
                "is_primary": count == 0,
            },
        ).scalar_one()
        return serialize_site(find_site(connection, site_id, user["id"]))


@router.put("/{site_id}", response_model=SiteResponse)
def update_site(site_id: int, site: SiteCreate, user=Depends(get_current_user)):
    data = site.model_dump()
    data["name"] = data["name"].strip()
    data["location"] = data["location"].strip()
    data["type"] = data["type"].strip()

    if not data["name"] or not data["location"] or not data["type"]:
        raise HTTPException(
            status_code=422,
            detail="Name, location, and property type cannot be blank.",
        )

    with engine.begin() as connection:
        find_site(connection, site_id, user["id"])
        connection.execute(
            text("""
                UPDATE sites
                SET name = :name, location = :location, type = :type,
                    solar_capacity = :solar_capacity, daily_usage = :daily_usage
                WHERE id = :site_id AND owner_id = :owner_id
            """),
            {**data, "site_id": site_id, "owner_id": user["id"]},
        )
        return serialize_site(find_site(connection, site_id, user["id"]))


@router.delete("/{site_id}")
def delete_site(site_id: int, user=Depends(get_current_user)):
    with engine.begin() as connection:
        site = find_site(connection, site_id, user["id"])
        connection.execute(
            text("DELETE FROM sites WHERE id = :site_id AND owner_id = :owner_id"),
            {"site_id": site_id, "owner_id": user["id"]},
        )

        if site["is_primary"]:
            next_site = connection.execute(
                text("""
                    SELECT id FROM sites
                    WHERE owner_id = :owner_id
                    ORDER BY id ASC LIMIT 1
                """),
                {"owner_id": user["id"]},
            ).scalar_one_or_none()
            if next_site is not None:
                connection.execute(
                    text("UPDATE sites SET is_primary = TRUE WHERE id = :id"),
                    {"id": next_site},
                )

    return {"message": "Site deleted successfully", "id": site_id}


@router.patch("/{site_id}/primary", response_model=SiteResponse)
def set_primary_site(site_id: int, user=Depends(get_current_user)):
    with engine.begin() as connection:
        find_site(connection, site_id, user["id"])
        connection.execute(
            text("UPDATE sites SET is_primary = FALSE WHERE owner_id = :owner_id"),
            {"owner_id": user["id"]},
        )
        connection.execute(
            text("""
                UPDATE sites SET is_primary = TRUE
                WHERE id = :site_id AND owner_id = :owner_id
            """),
            {"site_id": site_id, "owner_id": user["id"]},
        )
        return serialize_site(find_site(connection, site_id, user["id"]))
