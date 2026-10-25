from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import init_db
from app.scrapers.registry import SourceAdapterRegistry
from app.api.v1.health import router as health_router
from app.api.v1.sources import router as sources_router
from app.api.v1.scans import router as scans_router
from app.api.v1.jobs import router as jobs_router
from app.core.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing TrustHyre Blue-Collar Scraping Microservice...")
    await init_db()
    SourceAdapterRegistry.initialize()

    # Reconcile orphaned in-memory scans across process restarts
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            from sqlalchemy import update
            from app.models.database import ScraperScan, utc_now
            stmt = (
                update(ScraperScan)
                .where(ScraperScan.status == "RUNNING")
                .values(
                    status="INTERRUPTED",
                    completed_at=utc_now(),
                )
            )
            res = await session.execute(stmt)
            if res.rowcount > 0:
                await session.commit()
                logger.warning(f"Reconciled {res.rowcount} interrupted scan(s) from previous process lifecycle.")
        except Exception as e:
            logger.warning(f"Scan lifecycle reconciliation notice: {e}")

    yield
    # Shutdown actions
    logger.info("Shutting down Scraping Microservice...")


app = FastAPI(
    title="TrustHyre Blue-Collar Job Scraping Microservice",
    description="High-performance async FastAPI microservice for compliant blue-collar job discovery, deduplication, and quality curation.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS setup for TrustHyre internal and admin web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8787",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8787",
        "https://app.trusthyre.com",
        "https://api.trusthyre.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(sources_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": "TrustHyre Blue-Collar Scraping Microservice",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred in the scraping microservice."},
    )
