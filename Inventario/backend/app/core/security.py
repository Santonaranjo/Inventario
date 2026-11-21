from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
import jwt

from app.core.config import settings
from app.core.errors import UnauthorizedError

ACCESS = "access"
REFRESH = "refresh"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _encode(payload: dict) -> str:
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, rol: str) -> str:
    now = utcnow()
    return _encode(
        {
            "sub": str(user_id),
            "rol": rol,
            "type": ACCESS,
            "iat": now,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            "jti": uuid4().hex,
        }
    )


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """Devuelve (token, jti, expira). El jti se guarda en BD para poder revocarlo."""
    now = utcnow()
    jti = uuid4().hex
    expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    token = _encode({"sub": str(user_id), "type": REFRESH, "iat": now, "exp": expires, "jti": jti})
    return token, jti, expires


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("El token expiró", "TOKEN_EXPIRADO") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError("Token inválido", "TOKEN_INVALIDO") from exc
    if payload.get("type") != expected_type or "sub" not in payload:
        raise UnauthorizedError("Token inválido", "TOKEN_INVALIDO")
    return payload
