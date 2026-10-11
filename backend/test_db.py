print("Starting database diagnostic...", flush=True)

print("Loading database configuration...", flush=True)
from database import test_db_connection

print("Database module loaded.", flush=True)
print("Attempting AWS connection...", flush=True)

try:
    test_db_connection()
    print("AWS PostgreSQL connection successful!", flush=True)
except Exception as error:
    print("Database connection failed.", flush=True)
    print(f"{type(error).__name__}: {error}", flush=True)