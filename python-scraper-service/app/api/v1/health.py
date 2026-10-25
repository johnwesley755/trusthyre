import logging
from fastapi import APIRouter
from sqlalchemy import text
from app.api.deps import DBSessionDep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def get_health(db: DBSessionDep):
    """Health check validating microservice and PostgreSQL database availability."""
    db_status = "UP"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        db_status = "DOWN"

    return {
        "status": "UP" if db_status == "UP" else "DEGRADED",
        "service": "TrustHyre Blue-Collar Scraping Microservice",
        "database": db_status,
    }
