from pathlib import Path

import pandas as pd

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "household_power_consumption.txt"
OUTPUT_FILE = BASE_DIR / "data" / "energy_training_data.csv"


def main():
    print("Loading household electricity data...")

    # Read the semicolon-separated source file.
    df = pd.read_csv(
        DATA_FILE,
        sep=";",
        na_values=["?"],
        low_memory=False,
    )

    print(f"Loaded {len(df):,} minute-level records.")

    # Combine Date and Time into a proper timestamp.
    df["DATETIME"] = pd.to_datetime(
        df["Date"] + " " + df["Time"],
        format="%d/%m/%Y %H:%M:%S",
        errors="coerce",
    )

    # Convert electricity measurements to numeric values.
    df["Global_active_power"] = pd.to_numeric(
        df["Global_active_power"],
        errors="coerce",
    )

    # Keep only the timestamp and the demand target.
    df = df[["DATETIME", "Global_active_power"]].dropna()

    # Sort chronologically before converting minute data to hourly data.
    df = df.sort_values("DATETIME").set_index("DATETIME")

    # Hourly average power demand, measured in kW.
    hourly = df["Global_active_power"].resample("h").mean().dropna()

    # Create calendar features for forecasting.
    result = hourly.to_frame(name="DEMAND_KW")
    result["HOUR"] = result.index.hour
    result["DAY_OF_WEEK"] = result.index.dayofweek
    result["DAY_OF_YEAR"] = result.index.dayofyear
    result["MONTH"] = result.index.month
    result["IS_WEEKEND"] = (result.index.dayofweek >= 5).astype(int)

    # Add historical demand features using past hours only.
    result["LAG_1H"] = result["DEMAND_KW"].shift(1)
    result["LAG_24H"] = result["DEMAND_KW"].shift(24)
    result["LAG_168H"] = result["DEMAND_KW"].shift(168)

    # Remove rows without enough historical data.
    result = result.dropna()

    result.to_csv(OUTPUT_FILE, index_label="DATETIME")

    print(f"Saved {len(result):,} hourly records to:")
    print(OUTPUT_FILE)
    print("\nPreview:")
    print(result.head())
    print("\nDemand summary (kW):")
    print(result["DEMAND_KW"].describe())


if __name__ == "__main__":
    main()