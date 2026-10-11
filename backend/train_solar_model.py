from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "solar_training_data.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_FILE = MODEL_DIR / "solar_model.joblib"

FEATURES = [
    "PLANT_ID",
    "AMBIENT_TEMPERATURE",
    "MODULE_TEMPERATURE",
    "IRRADIATION",
    "HOUR",
    "DAY_OF_YEAR",
    "MONTH",
]

TARGET = "AC_POWER"


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Training data not found: {DATA_FILE}. "
            "Run prepare_solar_data.py first."
        )

    data = pd.read_csv(DATA_FILE)

    required = FEATURES + [TARGET, "DATE_TIME"]
    missing = [column for column in required if column not in data.columns]
    if missing:
        raise ValueError(
            f"Missing columns: {missing}. "
            "Ensure prepare_solar_data.py includes PLANT_ID."
        )

    data["DATE_TIME"] = pd.to_datetime(data["DATE_TIME"], errors="coerce")
    for column in FEATURES + [TARGET]:
        data[column] = pd.to_numeric(data[column], errors="coerce")

    data = data.dropna(subset=["DATE_TIME", TARGET])
    data = data[data[TARGET] >= 0]
    data = data.sort_values("DATE_TIME").reset_index(drop=True)

    split_index = int(len(data) * 0.8)
    if split_index <= 0 or split_index >= len(data):
        raise ValueError("Not enough data for a train/test split.")

    train = data.iloc[:split_index]
    test = data.iloc[split_index:]

    model = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    max_depth=18,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    print(f"Training rows: {len(train):,}")
    print(f"Testing rows:  {len(test):,}")
    print("Training solar model...")

    model.fit(train[FEATURES], train[TARGET])
    predictions = model.predict(test[FEATURES])

    mae = mean_absolute_error(test[TARGET], predictions)
    rmse = mean_squared_error(test[TARGET], predictions) ** 0.5

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "features": FEATURES,
            "target": TARGET,
            # Dataset AC_POWER values appear to be in watts.
            # Verify against the dataset documentation before production use.
            "unit": "W",
        },
        MODEL_FILE,
    )

    print("\nHeld-out evaluation (same unit as AC_POWER)")
    print(f"MAE:  {mae:.3f}")
    print(f"RMSE: {rmse:.3f}")
    print(f"Saved model: {MODEL_FILE}")


if __name__ == "__main__":
    main()