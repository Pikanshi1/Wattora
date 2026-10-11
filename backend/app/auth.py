
import hashlib
import hmac
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from database import engine
from app.email_delivery import (
    EmailDeliveryError,
    get_smtp_settings,
    send_email,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24


def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY", "")
    if len(secret) < 32:
        raise RuntimeError(
            "Set JWT_SECRET_KEY to a random secret of at least 32 characters."
        )
    return secret


def init_auth_tables():
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                full_name VARCHAR(120) NOT NULL,
                email VARCHAR(254) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email_verified BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))

        connection.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                location VARCHAR(150) NOT NULL DEFAULT '',
                home_type VARCHAR(50) NOT NULL DEFAULT 'House',
                solar_capacity DOUBLE PRECISION NOT NULL DEFAULT 5,
                electricity_rate DOUBLE PRECISION NOT NULL DEFAULT 8,
                energy_unit VARCHAR(10) NOT NULL DEFAULT 'kWh',
                currency VARCHAR(10) NOT NULL DEFAULT 'INR'
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                solar_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                demand_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                high_usage_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                weekly_summary BOOLEAN NOT NULL DEFAULT FALSE,
                forecast_horizon INTEGER NOT NULL DEFAULT 24,
                forecast_interval VARCHAR(10) NOT NULL DEFAULT 'hourly',
                optimization_priority VARCHAR(10) NOT NULL DEFAULT 'balanced',
                battery_reserve INTEGER NOT NULL DEFAULT 20
            )
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                token_hash CHAR(64) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))

        connection.execute(text("""
            ALTER TABLE password_reset_tokens
            ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        """))

        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                token_hash CHAR(64) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                attempts INTEGER NOT NULL DEFAULT 0
            )
        """))


class RegisterInput(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class EmailInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)


class VerifyEmailInput(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    code: str = Field(min_length=6, max_length=6, pattern="^[0-9]{6}$")


class PasswordResetInput(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class ProfileInput(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    location: str = Field(default="", max_length=150)
    home_type: str = Field(default="House", min_length=1, max_length=50)
    solar_capacity: float = Field(default=5, ge=0, le=100000)
    electricity_rate: float = Field(default=8, ge=0, le=100000)
    energy_unit: str = Field(default="kWh", pattern="^(kWh|Wh|MWh)$")
    currency: str = Field(default="INR", pattern="^[A-Z]{3}$")


class PreferencesInput(BaseModel):
    solar_alerts: bool = True
    demand_alerts: bool = True
    high_usage_alerts: bool = True
    weekly_summary: bool = False
    forecast_horizon: int = Field(default=24, ge=12, le=168)
    forecast_interval: str = Field(default="hourly", pattern="^(hourly|daily)$")
    optimization_priority: str = Field(
        default="balanced",
        pattern="^(savings|balanced|solar)$",
    )
    battery_reserve: int = Field(default=20, ge=0, le=100)


def normalize_email(email: str) -> str:
    value = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return value


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_verification_code(user_id: int, email: str) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO email_verification_tokens
                    (user_id, token_hash, expires_at, sent_at, attempts)
                VALUES (:user_id, :token_hash, :expires_at, NOW(), 0)
                ON CONFLICT (user_id) DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
                    expires_at = EXCLUDED.expires_at,
                    sent_at = NOW(),
                    attempts = 0
            """),
            {
                "user_id": user_id,
                "token_hash": hash_token(code),
                "expires_at": expires_at,
            },
        )

    try:
        send_email(
            email,
            "Verify your Wattora email",
            (
                f"Your Wattora verification code is {code}.\n\n"
                "This code expires in 15 minutes. If you did not create this "
                "account, you can ignore this email."
            ),
        )
    except EmailDeliveryError:
        with engine.begin() as connection:
            connection.execute(
                text("DELETE FROM email_verification_tokens WHERE user_id = :id"),
                {"id": user_id},
            )
        raise


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized

    with engine.connect() as connection:
        user = connection.execute(
            text("SELECT id, full_name, email FROM users WHERE id = :id"),
            {"id": user_id},
        ).mappings().first()

    if user is None:
        raise unauthorized

    return dict(user)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterInput):
    full_name = data.full_name.strip()
    email = normalize_email(data.email)

    if not full_name:
        raise HTTPException(status_code=422, detail="Name cannot be blank.")

    password_hash = password_hasher.hash(data.password)

    try:
        with engine.begin() as connection:
            user = connection.execute(
                text("""
                    INSERT INTO users
                        (full_name, email, password_hash, email_verified)
                    VALUES (:name, :email, :password_hash, FALSE)
                    RETURNING id, full_name, email
                """),
                {
                    "name": full_name,
                    "email": email,
                    "password_hash": password_hash,
                },
            ).mappings().one()

            connection.execute(
                text("INSERT INTO user_profiles (user_id) VALUES (:id)"),
                {"id": user["id"]},
            )
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    email_sent = True
    message = "Check your inbox for a verification code."
    try:
        issue_verification_code(user["id"], email)
    except EmailDeliveryError as exc:
        logger.warning("Account created but verification email was not sent: %s", exc)
        email_sent = False
        message = (
            "Your account was created, but the verification email could not be "
            f"sent. {exc} Configure email and request a new code."
        )

    return {
        "email": email,
        "email_sent": email_sent,
        "verification_required": True,
        "message": message,
    }


@router.post("/login")
def login(data: LoginInput):
    email = normalize_email(data.email)

    with engine.connect() as connection:
        user = connection.execute(
            text("""
                SELECT id, full_name, email, password_hash, email_verified
                FROM users WHERE email = :email
            """),
            {"email": email},
        ).mappings().first()

    if user is None or not password_hasher.verify(
        data.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Email or password is incorrect.",
        )

    if not user["email_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before signing in.",
        )

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
        },
    }


@router.post("/verify-email")
def verify_email(data: VerifyEmailInput):
    email = normalize_email(data.email)
    token_hash = hash_token(data.code)
    now = datetime.now(timezone.utc)
    verified_user_id = None

    with engine.begin() as connection:
        row = connection.execute(
            text("""
                SELECT u.id, u.email_verified, t.token_hash,
                       t.expires_at, t.attempts
                FROM users u
                JOIN email_verification_tokens t ON t.user_id = u.id
                WHERE u.email = :email
                FOR UPDATE OF t
            """),
            {"email": email},
        ).mappings().first()

        if row and not row["email_verified"] and row["expires_at"] > now:
            if hmac.compare_digest(token_hash, row["token_hash"].strip()):
                connection.execute(
                    text("UPDATE users SET email_verified = TRUE WHERE id = :id"),
                    {"id": row["id"]},
                )
                connection.execute(
                    text("DELETE FROM email_verification_tokens WHERE user_id = :id"),
                    {"id": row["id"]},
                )
                verified_user_id = row["id"]
            else:
                connection.execute(
                    text("""
                        UPDATE email_verification_tokens
                        SET attempts = attempts + 1
                        WHERE user_id = :id
                    """),
                    {"id": row["id"]},
                )
                if row["attempts"] >= 4:
                    connection.execute(
                        text("""
                            DELETE FROM email_verification_tokens
                            WHERE user_id = :id
                        """),
                        {"id": row["id"]},
                    )

    if verified_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code is invalid or expired.",
        )

    return {"message": "Email verified. You can now sign in."}


@router.post("/resend-verification")
def resend_verification(data: EmailInput):
    email = normalize_email(data.email)

    try:
        get_smtp_settings()
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    with engine.connect() as connection:
        user = connection.execute(
            text("""
                SELECT u.id, u.email_verified, t.sent_at
                FROM users u
                LEFT JOIN email_verification_tokens t ON t.user_id = u.id
                WHERE u.email = :email
            """),
            {"email": email},
        ).mappings().first()

    if user and not user["email_verified"]:
        sent_at = user["sent_at"]
        if sent_at and datetime.now(timezone.utc) - sent_at < timedelta(minutes=1):
            return {
                "message": "If this account needs verification, a new code will "
                "be sent when it is eligible."
            }

        try:
            issue_verification_code(user["id"], email)
        except EmailDeliveryError as exc:
            logger.warning("Verification email delivery failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    return {
        "message": "If this account needs verification, a new code has been sent."
    }


@router.post("/password/forgot")
def request_password_reset(data: EmailInput):
    email = normalize_email(data.email)

    try:
        get_smtp_settings()
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    with engine.connect() as connection:
        user = connection.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        ).mappings().first()

    if user is None:
        return {
            "message": "If an account exists for this email, reset instructions "
            "have been sent."
        }

    with engine.connect() as connection:
        previous_request = connection.execute(
            text("""
                SELECT requested_at FROM password_reset_tokens
                WHERE user_id = :user_id
            """),
            {"user_id": user["id"]},
        ).mappings().first()

    if (
        previous_request
        and datetime.now(timezone.utc) - previous_request["requested_at"]
        < timedelta(minutes=1)
    ):
        return {
            "message": "If an account exists for this email, reset instructions "
            "have been sent."
        }

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO password_reset_tokens
                    (user_id, token_hash, expires_at, requested_at)
                VALUES (:user_id, :token_hash, :expires_at, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
                    expires_at = EXCLUDED.expires_at,
                    requested_at = NOW()
            """),
            {
                "user_id": user["id"],
                "token_hash": hash_token(token),
                "expires_at": expires_at,
            },
        )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    try:
        send_email(
            email,
            "Reset your Wattora password",
            (
                "A password reset was requested for your Wattora account.\n\n"
                f"Use this link within one hour:\n{reset_url}\n\n"
                "If you did not request this, you can ignore this email."
            ),
        )
    except EmailDeliveryError as exc:
        with engine.begin() as connection:
            connection.execute(
                text("DELETE FROM password_reset_tokens WHERE user_id = :id"),
                {"id": user["id"]},
            )
        logger.warning("Password reset email delivery failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return {
        "message": "If an account exists for this email, reset instructions "
        "have been sent."
    }


@router.post("/password/reset")
def reset_password(data: PasswordResetInput):
    token_hash = hash_token(data.token)
    now = datetime.now(timezone.utc)
    updated = False

    with engine.begin() as connection:
        reset = connection.execute(
            text("""
                SELECT user_id FROM password_reset_tokens
                WHERE token_hash = :token_hash AND expires_at > :now
                FOR UPDATE
            """),
            {"token_hash": token_hash, "now": now},
        ).mappings().first()

        if reset:
            connection.execute(
                text("UPDATE users SET password_hash = :password_hash WHERE id = :id"),
                {
                    "id": reset["user_id"],
                    "password_hash": password_hasher.hash(data.password),
                },
            )
            connection.execute(
                text("""
                    DELETE FROM password_reset_tokens WHERE user_id = :id
                """),
                {"id": reset["user_id"]},
            )
            updated = True

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset link is invalid or expired.",
        )

    return {"message": "Password updated. You can now sign in."}


@router.get("/profile")
def get_profile(user=Depends(get_current_user)):
    with engine.connect() as connection:
        profile = connection.execute(
            text("""
                SELECT u.id, u.full_name, u.email,
                       p.location, p.home_type, p.solar_capacity,
                       p.electricity_rate, p.energy_unit, p.currency
                FROM users u
                JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id = :id
            """),
            {"id": user["id"]},
        ).mappings().first()

    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found.")

    return dict(profile)


@router.put("/profile")
def update_profile(data: ProfileInput, user=Depends(get_current_user)):
    full_name = data.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Name cannot be blank.")

    with engine.begin() as connection:
        connection.execute(
            text("UPDATE users SET full_name = :name WHERE id = :id"),
            {"name": full_name, "id": user["id"]},
        )
        connection.execute(
            text("""
                UPDATE user_profiles
                SET location = :location,
                    home_type = :home_type,
                    solar_capacity = :solar_capacity,
                    electricity_rate = :electricity_rate,
                    energy_unit = :energy_unit,
                    currency = :currency
                WHERE user_id = :id
            """),
            {
                "id": user["id"],
                "location": data.location.strip(),
                "home_type": data.home_type.strip(),
                "solar_capacity": data.solar_capacity,
                "electricity_rate": data.electricity_rate,
                "energy_unit": data.energy_unit,
                "currency": data.currency,
            },
        )

    return get_profile(user)


@router.get("/preferences")
def get_preferences(user=Depends(get_current_user)):
    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO user_preferences (user_id)
                VALUES (:id)
                ON CONFLICT (user_id) DO NOTHING
            """),
            {"id": user["id"]},
        )
        preferences = connection.execute(
            text("""
                SELECT solar_alerts, demand_alerts, high_usage_alerts,
                       weekly_summary, forecast_horizon, forecast_interval,
                       optimization_priority, battery_reserve
                FROM user_preferences WHERE user_id = :id
            """),
            {"id": user["id"]},
        ).mappings().one()

    return dict(preferences)


@router.put("/preferences")
def update_preferences(
    data: PreferencesInput,
    user=Depends(get_current_user),
):
    values = data.model_dump()
    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO user_preferences (
                    user_id, solar_alerts, demand_alerts, high_usage_alerts,
                    weekly_summary, forecast_horizon, forecast_interval,
                    optimization_priority, battery_reserve
                )
                VALUES (
                    :user_id, :solar_alerts, :demand_alerts,
                    :high_usage_alerts, :weekly_summary, :forecast_horizon,
                    :forecast_interval, :optimization_priority,
                    :battery_reserve
                )
                ON CONFLICT (user_id) DO UPDATE SET
                    solar_alerts = EXCLUDED.solar_alerts,
                    demand_alerts = EXCLUDED.demand_alerts,
                    high_usage_alerts = EXCLUDED.high_usage_alerts,
                    weekly_summary = EXCLUDED.weekly_summary,
                    forecast_horizon = EXCLUDED.forecast_horizon,
                    forecast_interval = EXCLUDED.forecast_interval,
                    optimization_priority = EXCLUDED.optimization_priority,
                    battery_reserve = EXCLUDED.battery_reserve
            """),
            {"user_id": user["id"], **values},
        )

    return get_preferences(user)
