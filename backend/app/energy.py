from pathlib import Path

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/energy", tags=["Energy Demand"])

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
    hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6, description="Monday=0, Sunday=6")
    day_of_year: int = Field(ge=1, le=366)
    month: int = Field(ge=1, le=12)
    is_weekend: int = Field(ge=0, le=1)
    lag_1h: float = Field(ge=0)
    lag_24h: float = Field(ge=0)
    lag_168h: float = Field(ge=0)


@router.post("/predict")
def predict_energy(request: EnergyPredictionRequest):
    try:
        values = {
            "HOUR": request.hour,
            "DAY_OF_WEEK": request.day_of_week,
            "DAY_OF_YEAR": request.day_of_year,
            "MONTH": request.month,
            "IS_WEEKEND": request.is_weekend,
            "LAG_1H": request.lag_1h,
            "LAG_24H": request.lag_24h,
            "LAG_168H": request.lag_168h,
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
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Energy prediction failed: {str(exc)}",
        ) from exc