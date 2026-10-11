from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

GENERATION_COLUMNS = [
    "DATE_TIME",
    "PLANT_ID",
    "DC_POWER",
    "AC_POWER",
    "DAILY_YIELD",
    "TOTAL_YIELD",
]

WEATHER_COLUMNS = [
    "DATE_TIME",
    "AMBIENT_TEMPERATURE",
    "MODULE_TEMPERATURE",
    "IRRADIATION",
]


def prepare_plant(plant_number: int) -> pd.DataFrame:
    generation_file = (
        DATA_DIR / f"Plant_{plant_number}_Generation_Data.csv"
    )
    weather_file = (
        DATA_DIR / f"Plant_{plant_number}_Weather_Sensor_Data.csv"
    )

    generation = pd.read_csv(generation_file)
    weather = pd.read_csv(weather_file)

    # Normalize timestamps before joining.
    generation["DATE_TIME"] = pd.to_datetime(
        generation["DATE_TIME"], errors="coerce"
    )
    weather["DATE_TIME"] = pd.to_datetime(
        weather["DATE_TIME"], errors="coerce"
    )

    generation = generation.dropna(subset=["DATE_TIME"])
    weather = weather.dropna(subset=["DATE_TIME"])

    # Use the plant number explicitly as a feature.
    generation["PLANT_ID"] = plant_number

    data = pd.merge(
        generation[GENERATION_COLUMNS],
        weather[WEATHER_COLUMNS],
        on="DATE_TIME",
        how="inner",
        validate="many_to_one",
    )

    data["HOUR"] = data["DATE_TIME"].dt.hour
    data["DAY_OF_YEAR"] = data["DATE_TIME"].dt.dayofyear
    data["MONTH"] = data["DATE_TIME"].dt.month

    numeric_columns = [
        "DC_POWER",
        "AC_POWER",
        "DAILY_YIELD",
        "TOTAL_YIELD",
        "AMBIENT_TEMPERATURE",
        "MODULE_TEMPERATURE",
        "IRRADIATION",
    ]

    for column in numeric_columns:
        data[column] = pd.to_numeric(data[column], errors="coerce")

    data = data.dropna(
        subset=[
            "AC_POWER",
            "AMBIENT_TEMPERATURE",
            "MODULE_TEMPERATURE",
            "IRRADIATION",
        ]
    )

    return data


def main():
    plant_1 = prepare_plant(1)
    plant_2 = prepare_plant(2)

    combined = pd.concat(
        [plant_1, plant_2],
        ignore_index=True,
    ).sort_values("DATE_TIME")

    output_file = DATA_DIR / "solar_training_data.csv"
    combined.to_csv(output_file, index=False)

    print(f"Plant 1 rows: {len(plant_1):,}")
    print(f"Plant 2 rows: {len(plant_2):,}")
    print(f"Combined rows: {len(combined):,}")
    print(f"Saved to: {output_file}")


if __name__ == "__main__":
    main()
