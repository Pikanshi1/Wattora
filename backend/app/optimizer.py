from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.auth import get_current_user
from database import engine

router = APIRouter(prefix="/api/optimizer", tags=["Energy Optimization"])


class OptimizationRequest(BaseModel):
    site_id: int = Field(ge=1)
    solar_power_w: float = Field(ge=0, description="Predicted solar power in watts")


@router.post("/analyze")
def analyze_energy(
    request: OptimizationRequest,
    user=Depends(get_current_user),
):
    with engine.connect() as connection:
        site = connection.execute(
            text("""
                SELECT id FROM sites
                WHERE id = :site_id AND owner_id = :owner_id
            """),
            {"site_id": request.site_id, "owner_id": user["id"]},
        ).first()
        if site is None:
            raise HTTPException(status_code=404, detail="Site not found.")

        demand_kw = connection.execute(
            text("""
            SELECT COALESCE(SUM(power), 0)
            FROM devices
            WHERE site_id = :site_id AND enabled = TRUE
            """),
            {"site_id": request.site_id},
        ).scalar_one()

    with engine.connect() as connection:
        preferences = connection.execute(
            text("""
                SELECT optimization_priority, battery_reserve
                FROM user_preferences
                WHERE user_id = :user_id
            """),
            {"user_id": user["id"]},
        ).mappings().first()

    priority = preferences["optimization_priority"] if preferences else "balanced"
    battery_reserve = preferences["battery_reserve"] if preferences else 20
    solar_kw = request.solar_power_w / 1000

    surplus_kw = max(0.0, solar_kw - demand_kw)
    grid_required_kw = max(0.0, demand_kw - solar_kw)

    if surplus_kw > 0:
        status = "solar_surplus"
        if priority == "solar":
            recommendation = (
                "Prioritize solar power for household loads, preserve your "
                f"{battery_reserve}% battery reserve, and store remaining surplus."
            )
        elif priority == "savings":
            recommendation = (
                "Use solar power for household loads first to reduce grid "
                f"purchases; preserve your {battery_reserve}% battery reserve."
            )
        else:
            recommendation = (
                "Use solar power for household loads and consider storing "
                f"surplus while keeping your {battery_reserve}% battery reserve."
            )
    elif grid_required_kw > 0:
        status = "energy_deficit"
        recommendation = (
            "Use available solar power first and avoid discharging below your "
            f"{battery_reserve}% battery reserve; the remaining demand may "
            "require grid power."
        )
    else:
        status = "balanced"
        recommendation = "Solar generation matches household demand."

    self_consumption_percent = (
        min(solar_kw, demand_kw) / solar_kw * 100
        if solar_kw > 0
        else 0.0
    )

    return {
        "solar_generation_kw": round(solar_kw, 3),
        "demand_kw": round(demand_kw, 3),
        "surplus_kw": round(surplus_kw, 3),
        "grid_required_kw": round(grid_required_kw, 3),
        "self_consumption_percent": round(self_consumption_percent, 1),
        "status": status,
        "recommendation": recommendation,
        "site_id": request.site_id,
        "optimization_priority": priority,
        "battery_reserve": battery_reserve,
    }