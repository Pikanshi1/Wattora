from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "energy_training_data.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_FILE = MODEL_DIR / "energy_model.joblib"

FEATURES = [
    "HOUR",
    "DAY_OF_WEEK",
    "DAY_OF_YEAR",
    "MONTH",
    "IS_WEEKEND",
    "LAG_1H",
    "LAG_24H",
    "LAG_168H",
]
TARGET = "DEMAND_KW"


def main():
    print("Loading prepared energy data...")

    df = pd.read_csv(DATA_FILE, parse_dates=["DATETIME"])
    df = df.sort_values("DATETIME").dropna(subset=FEATURES + [TARGET])

    if len(df) < 500:
        raise ValueError("Not enough hourly records to train the model.")

    # Preserve chronological order: older records train the model,
    # while the newest 20% evaluate its forecasting performance.
    split_index = int(len(df) * 0.8)
    train_df = df.iloc[:split_index]
    test_df = df.iloc[split_index:]

    X_train = train_df[FEATURES]
    y_train = train_df[TARGET]
    X_test = test_df[FEATURES]
    y_test = test_df[TARGET]

    print(f"Training records: {len(train_df):,}")
    print(f"Testing records:  {len(test_df):,}")
    print("Training Random Forest model...")

    model = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("regressor", RandomForestRegressor(
            n_estimators=150,
            max_depth=18,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))

    print("\nEvaluation on the newest 20% of records")
    print(f"MAE:  {mae:.3f} kW")
    print(f"RMSE: {rmse:.3f} kW")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump({
        "model": model,
        "features": FEATURES,
        "target": TARGET,
        "unit": "kW",
        "model_name": "energy_model",
    }, MODEL_FILE)

    print(f"\nModel saved to: {MODEL_FILE}")


if __name__ == "__main__":
    main()