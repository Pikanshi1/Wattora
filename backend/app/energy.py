from pathlib import Path
import sqlite3
from contextlib import closing

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user

router = APIRouter(prefix="/api/energy", tags=["Energy Demand"])
DB_PATH = Path(__file__).resolve().parent.parent / "wattora.db"

MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "models"
    / "energy_model.joblib"
)

saved_data = joblib.load(MODEL_PATH)
model = saved_data["model"]
FEATURES = saved_data["features"]
TARGET = saved_data["target"]
UNIT = saved_data["unit"]


class EnergyPredictionRequest(BaseModel):
    site_id: int = Field(ge=1)
    hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6, description="Monday=0, Sunday=6")
    day_of_year: int = Field(ge=1, le=366)
    month: int = Field(ge=1, le=12)
    is_weekend: int = Field(ge=0, le=1)


@router.post("/predict")
def predict_energy(
    request: EnergyPredictionRequest,
    user=Depends(get_current_user),
):
    try:
        try:
            with closing(sqlite3.connect(DB_PATH)) as connection:
                site = connection.execute(
                    """
                    SELECT daily_usage FROM sites
                    WHERE id = ? AND owner_id = ?
                    """,
                    (request.site_id, user["id"]),
                ).fetchone()
                if site is None:
                    raise HTTPException(status_code=404, detail="Site not found.")

                device_energy = connection.execute(
                    """
                    SELECT COALESCE(SUM(power * hours), 0)
                    FROM devices WHERE site_id = ? AND enabled = 1
                    """,
                    (request.site_id,),
                ).fetchone()[0]
        except sqlite3.Error as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Could not load this site's energy profile: {exc}",
            ) from exc

        daily_usage_kwh = max(float(site[0]), float(device_energy))
        typical_hourly_demand_kw = daily_usage_kwh / 24
        if 6 <= request.hour <= 9:
            hourly_factor = 1.15
        elif 17 <= request.hour <= 22:
            hourly_factor = 1.35
        elif request.hour < 6 or request.hour > 22:
            hourly_factor = 0.65
        else:
            hourly_factor = 0.9

        values = {
            "HOUR": request.hour,
            "DAY_OF_WEEK": request.day_of_week,
            "DAY_OF_YEAR": request.day_of_year,
            "MONTH": request.month,
            "IS_WEEKEND": request.is_weekend,
            "LAG_1H": typical_hourly_demand_kw * hourly_factor,
            "LAG_24H": typical_hourly_demand_kw,
            "LAG_168H": typical_hourly_demand_kw,
        }

        features = pd.DataFrame(
            [[values[name] for name in FEATURES]],
            columns=FEATURES,
        )

        prediction = float(model.predict(features)[0])

        return {
            "predicted_demand": round(max(0.0, prediction), 3),
            "target": TARGET,
            "unit": UNIT,
            "model": "energy_model",
            "site_id": request.site_id,
            "personalized_daily_usage_kwh": round(daily_usage_kwh, 3),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Energy prediction failed: {str(exc)}",
        ) from exc