from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, status
from app.api.deps import DBSessionDep, AuthSecretDep
from app.models.schemas import JobResponse, JobModerationRequest
from app.repositories.job_repo import JobRepository

router = APIRouter(prefix="/jobs", tags=["Jobs Management"])


@router.get("", response_model=List[JobResponse])
async def list_discovered_jobs(
    db: DBSessionDep,
    _auth: AuthSecretDep,
    status: Optional[str] = Query("ALL", description="Job status: ALL, OPEN, PENDING_REVIEW, REJECTED, EXPIRED"),
    city: Optional[str] = Query(None, description="City filter (e.g. Chennai)"),
    source: Optional[str] = Query(None, description="Source name filter"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Searches and lists ingested external jobs with pagination and status filters."""
    jobs, _total = await JobRepository.list_jobs(
        db, status=status, city=city, source=source, limit=limit, offset=offset
    )
    return jobs


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_detail(job_id: UUID, db: DBSessionDep, _auth: AuthSecretDep):
    """Retrieves full details for a specific ingested job."""
    job = await JobRepository.get_by_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    return job


@router.post("/{job_id}/approve", response_model=JobResponse)
async def approve_job(
    job_id: UUID,
    db: DBSessionDep,
    _auth: AuthSecretDep,
    _req: Optional[JobModerationRequest] = None,
):
    """Approves an external candidate listing and marks it OPEN for worker discovery."""
    job = await JobRepository.update_status(db, job_id, "OPEN")
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    await db.commit()
    return job


@router.post("/{job_id}/reject", response_model=JobResponse)
async def reject_job(
    job_id: UUID,
    _req: JobModerationRequest,
    db: DBSessionDep,
    _auth: AuthSecretDep,
):
    """Rejects an external candidate listing."""
    job = await JobRepository.update_status(db, job_id, "REJECTED")
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    await db.commit()
    return job


@router.post("/{job_id}/expire", response_model=JobResponse)
async def expire_job(
    job_id: UUID,
    _req: JobModerationRequest,
    db: DBSessionDep,
    _auth: AuthSecretDep,
):
    """Manually marks a listing as EXPIRED."""
    job = await JobRepository.update_status(db, job_id, "EXPIRED")
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    await db.commit()
    return job
