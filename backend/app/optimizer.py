from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/optimizer", tags=["Energy Optimization"])


class OptimizationRequest(BaseModel):
    solar_power_w: float = Field(ge=0, description="Predicted solar power in watts")
    demand_kw: float = Field(ge=0, description="Predicted household demand in kW")


@router.post("/analyze")
def analyze_energy(request: OptimizationRequest):
    solar_kw = request.solar_power_w / 1000
    demand_kw = request.demand_kw

    surplus_kw = max(0.0, solar_kw - demand_kw)
    grid_required_kw = max(0.0, demand_kw - solar_kw)

    if surplus_kw > 0:
        status = "solar_surplus"
        recommendation = "Use solar power for household loads and consider storing surplus energy."
    elif grid_required_kw > 0:
        status = "energy_deficit"
        recommendation = "Use available solar power first; the remaining demand may require grid power."
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
    }