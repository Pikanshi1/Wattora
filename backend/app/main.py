
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.solar import router as solar_router
from app.energy import router as energy_router
from app.optimizer import router as optimizer_router
from app.sites import router as sites_router
from app.devices import router as devices_router

app = FastAPI(
    title="Wattora API",
    description="AI-powered solar forecasting and energy optimization",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(solar_router)
app.include_router(energy_router)
app.include_router(optimizer_router)
app.include_router(sites_router)
app.include_router(devices_router)

@app.get("/")
def home():
    return {
        "message": "Welcome to Wattora API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Wattora",
    }
