import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import init_auth_tables, router as auth_router
from app.devices import router as devices_router
from app.energy import router as energy_router
from app.optimizer import router as optimizer_router
from app.sites import router as sites_router
from app.solar import router as solar_router

frontend_origins = {
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    init_auth_tables()
    yield


app = FastAPI(
    title="Wattora API",
    description="AI-powered solar forecasting and energy optimization",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(frontend_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(solar_router)
app.include_router(energy_router)
app.include_router(optimizer_router)
app.include_router(sites_router)
app.include_router(devices_router)
app.include_router(auth_router)


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



