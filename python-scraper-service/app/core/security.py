import secrets
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

INTERNAL_HEADER_NAME = "X-Internal-Secret"
api_key_header = APIKeyHeader(name=INTERNAL_HEADER_NAME, auto_error=False)


async def verify_internal_api_key(api_key: str = Security(api_key_header)) -> bool:
    """
    Enforces constant-time authentication for internal service calls from node-backend.
    Prevents timing attacks and unauthorized public execution.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required X-Internal-Secret header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    expected_secret = settings.INTERNAL_SERVICE_SECRET.get_secret_value()
    # secrets.compare_digest prevents timing leakage
    if not secrets.compare_digest(api_key, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal authorization secret.",
        )

    return True
