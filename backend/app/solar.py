
import sqlite3
from contextlib import closing
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user

router = APIRouter(prefix="/api/solar", tags=["Solar Forecast"])

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "solar_model.joblib"
DB_PATH = BASE_DIR / "wattora.db"

# Load the trained model bundle.
saved_data = joblib.load(MODEL_PATH)
model = saved_data["model"]
FEATURES = saved_data["features"]
TARGET = saved_data["target"]
UNIT = saved_data["unit"]


class SolarPredictionRequest(BaseModel):
    # Model plant identifier, not the database site ID.
    plant_id: int = Field(default=1, ge=1, le=2)

    site_id: int = Field(ge=1)

    ambient_temperature: float = Field(ge=-50, le=70)
    module_temperature: float = Field(ge=-50, le=100)
    irradiation: float = Field(ge=0)
    hour: int = Field(ge=0, le=23)
    day_of_year: int = Field(ge=1, le=366)
    month: int = Field(ge=1, le=12)


def get_site_solar_capacity(site_id: int, owner_id: int) -> float:
    """Return the selected site's configured solar capacity in kW."""
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="Wattora database was not found.",
        )

    try:
        with closing(sqlite3.connect(DB_PATH)) as connection:
            row = connection.execute(
                "SELECT solar_capacity FROM sites WHERE id = ? AND owner_id = ?",
                (site_id, owner_id),
            ).fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read site configuration: {exc}",
        ) from exc

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Site {site_id} was not found.",
        )

    return max(0.0, float(row[0]))


@lru_cache(maxsize=2)
def get_reference_peak_power(plant_id: int) -> float:
    samples = []
    for hour in range(24):
        for irradiation in (0.0, 0.25, 0.5, 0.75, 1.0):
            values = {
                "PLANT_ID": plant_id,
                "AMBIENT_TEMPERATURE": 25,
                "MODULE_TEMPERATURE": 35,
                "IRRADIATION": irradiation,
                "HOUR": hour,
                "DAY_OF_YEAR": 180,
                "MONTH": 6,
            }
            samples.append([values[name] for name in FEATURES])

    peak = float(model.predict(pd.DataFrame(samples, columns=FEATURES)).max())
    if peak <= 0:
        raise HTTPException(
            status_code=500,
            detail="Could not determine a valid solar-model reference output.",
        )
    return peak


def scale_power_to_site_capacity(
    predicted_power: float,
    site_capacity_kw: float,
    plant_id: int,
) -> float:
    normalized_unit = str(UNIT).strip().lower().replace(" ", "")
    if normalized_unit in {"w", "watt", "watts"}:
        return (
            predicted_power
            / get_reference_peak_power(plant_id)
            * site_capacity_kw
            * 1000
        )
    if normalized_unit in {"kw", "kilowatt", "kilowatts"}:
        return (
            predicted_power
            / get_reference_peak_power(plant_id)
            * site_capacity_kw
        )
    return predicted_power


def apply_site_capacity_limit(
    predicted_power: float,
    site_capacity_kw: float,
) -> float:
    """
    Limit predicted output to configured site capacity when the model's
    output unit is explicitly recognized as W or kW.

    Predictions are normalized to the user's configured site capacity before
    this physical upper bound is applied.
    """
    normalized_unit = str(UNIT).strip().lower().replace(" ", "")

    if normalized_unit in {"w", "watt", "watts"}:
        maximum_output = site_capacity_kw * 1000
        return min(predicted_power, maximum_output)

    if normalized_unit in {"kw", "kilowatt", "kilowatts"}:
        return min(predicted_power, site_capacity_kw)

    # Do not apply an incorrect cap if the model uses another unit.
    return predicted_power


@router.post("/predict")
def predict_solar(
    request: SolarPredictionRequest,
    user=Depends(get_current_user),
):
    try:
        values = {
            "PLANT_ID": request.plant_id,
            "AMBIENT_TEMPERATURE": request.ambient_temperature,
            "MODULE_TEMPERATURE": request.module_temperature,
            "IRRADIATION": request.irradiation,
            "HOUR": request.hour,
            "DAY_OF_YEAR": request.day_of_year,
            "MONTH": request.month,
        }

        missing_features = [
            name for name in FEATURES if name not in values
        ]
        if missing_features:
            raise HTTPException(
                status_code=500,
                detail=(
                    "The saved solar model expects unsupported features: "
                    + ", ".join(missing_features)
                ),
            )

        features = pd.DataFrame(
            [[values[name] for name in FEATURES]],
            columns=FEATURES,
        )

        prediction = max(0.0, float(model.predict(features)[0]))
        site_capacity_kw = get_site_solar_capacity(request.site_id, user["id"])
        prediction = scale_power_to_site_capacity(
            prediction,
            site_capacity_kw,
            request.plant_id,
        )
        prediction = apply_site_capacity_limit(
            prediction,
            site_capacity_kw,
        )

        response = {
            "predicted_power": round(prediction, 3),
            "target": TARGET,
            "unit": UNIT,
            "model": "solar_model",
        }

        response["site_id"] = request.site_id
        response["site_solar_capacity_kw"] = site_capacity_kw

        return response

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Solar prediction failed: {str(exc)}",
        ) from exc
