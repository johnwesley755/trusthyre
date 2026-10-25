import asyncio
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import ScanQueryConfig, RawJobRecord
from app.scrapers.base import BaseSourceAdapter
from app.scrapers.registry import SourceAdapterRegistry
from app.extractors.vernacular_mapper import VernacularTradeMapper
from app.extractors.validator import validate_job_quality
from app.services.deduplication import DeduplicationService
from app.repositories.job_repo import JobRepository
from app.repositories.scan_repo import ScanRepository
from app.core.logger import logger

active_scan_cancellations: Dict[UUID, bool] = {}


class DiscoveryPipeline:

    @classmethod
    def cancel_scan(cls, scan_id: UUID) -> bool:
        if scan_id in active_scan_cancellations:
            active_scan_cancellations[scan_id] = True
            logger.info(f"Cancellation requested for scan {scan_id}")
            return True
        return False

    @classmethod
    async def run_scan(cls, db: AsyncSession, scan_id: UUID, config: ScanQueryConfig):
        """
        Executes end-to-end blue-collar job discovery, validation,
        deduplication, and database persistence pipeline.
        """
        active_scan_cancellations[scan_id] = False
        expanded_keywords = VernacularTradeMapper.expand_query(config.query)
        if not expanded_keywords and (not config.query or config.query.upper() in ["ALL", "ALL_TRADES"]):
            expanded_keywords = ["Delivery Driver", "Electrician", "Warehouse Associate", "Security Guard", "Plumber", "Cook"]

        logger.info(f"[DiscoveryPipeline][Step 1/5 - INITIATE] Starting blue-collar discovery scan {scan_id} for city: '{config.city}', query: '{config.query}' (Expanded trades: {expanded_keywords})")

        total_found = 0
        valid_count = 0
        duplicate_count = 0
        rejected_count = 0
        error_count = 0
        source_stats: Dict[str, Any] = {}

        # Resolve adapters to run
        all_adapters = SourceAdapterRegistry.list_adapters()
        if config.sources:
            chosen = []
            for s_id in config.sources:
                ad = SourceAdapterRegistry.get_adapter(s_id)
                if ad and ad not in chosen:
                    chosen.append(ad)
            selected_adapters = chosen if chosen else all_adapters
        else:
            selected_adapters = all_adapters

        try:
            # Concurrently fetch candidate listings across all enabled adapters
            logger.info(f"[DiscoveryPipeline][Step 2/5 - PARALLEL FETCH] Initiating concurrent discovery across {len(selected_adapters)} adapters...")

            async def fetch_adapter_candidates(adapter: BaseSourceAdapter):
                try:
                    health = await asyncio.wait_for(adapter.check_health(), timeout=5.0)
                    status_val = health.status
                except Exception:
                    status_val = "RESTRICTED" if adapter.is_restricted else "ACTIVE"

                if adapter.is_restricted or status_val in ["PERMISSION_REQUIRED", "AUTH_REQUIRED", "UNAVAILABLE"]:
                    return adapter, status_val, [], None

                try:
                    candidates = await asyncio.wait_for(adapter.discover_jobs(config), timeout=15.0)
                    return adapter, status_val, candidates, None
                except Exception as ex:
                    return adapter, status_val, [], str(ex)

            adapter_results = await asyncio.gather(*(fetch_adapter_candidates(a) for a in selected_adapters))

            # Sequentially process candidates and ingest into PostgreSQL database session
            for adapter, adapter_status, candidates, err_msg in adapter_results:
                if active_scan_cancellations.get(scan_id, False):
                    logger.info(f"[DiscoveryPipeline] Scan {scan_id} aborted due to cancellation request.")
                    break

                source_stats[adapter.id] = {
                    "name": adapter.name,
                    "status": adapter_status,
                    "discovered": len(candidates),
                    "valid": 0,
                    "duplicates": 0,
                    "rejected": 0,
                    "errors": 1 if err_msg else 0,
                }

                if err_msg:
                    error_count += 1
                    logger.error(f"[DiscoveryPipeline] Error executing adapter {adapter.id}: {err_msg}")
                    await ScanRepository.log_event(db, scan_id, adapter.id, err_msg, level="ERROR")
                    continue

                total_found += len(candidates)
                logger.info(f"[DiscoveryPipeline][Step 3/5 - VALIDATE] '{adapter.name}' [{adapter_status}]: {len(candidates)} listings returned. Validating...")

                for raw_job in candidates:
                    if active_scan_cancellations.get(scan_id, False):
                        break

                    # Step 1: Quality Gate & Strict Blue-Collar Validation
                    is_valid, reject_reason = validate_job_quality(raw_job)
                    if not is_valid:
                        rejected_count += 1
                        source_stats[adapter.id]["rejected"] += 1
                        await ScanRepository.log_event(
                            db, scan_id, adapter.id,
                            f"Rejected: {raw_job.title} at {raw_job.company_name} - Reason: {reject_reason}",
                            level="DEBUG"
                        )
                        continue

                    # Step 2: 3-Tier Deduplication Check
                    is_dup, existing_job, source_hash = await DeduplicationService.check_duplicate(db, raw_job)
                    if is_dup and existing_job:
                        duplicate_count += 1
                        source_stats[adapter.id]["duplicates"] += 1
                        await DeduplicationService.merge_alternate_source(db, existing_job, raw_job)
                        await ScanRepository.log_event(
                            db, scan_id, adapter.id,
                            f"Duplicate merged: {raw_job.title} at {raw_job.company_name} (Existing ID: {existing_job.id})",
                            level="INFO"
                        )
                    else:
                        # Step 3: Insert new unique Blue-Collar job
                        valid_count += 1
                        source_stats[adapter.id]["valid"] += 1
                        new_job = await JobRepository.create_job(db, raw_job, source_hash)
                        await ScanRepository.log_event(
                            db, scan_id, adapter.id,
                            f"New Blue-Collar Job Ingested: {new_job.title} at {new_job.employer_name} in {new_job.city} (ID: {new_job.id})",
                            level="INFO"
                        )

                await db.commit()
                logger.info(f"[DiscoveryPipeline][Step 4/5 - COMMITTED] '{adapter.name}': Discovered={len(candidates)}, Valid={source_stats[adapter.id]['valid']}, Duplicates={source_stats[adapter.id]['duplicates']}, Rejected={source_stats[adapter.id]['rejected']}")

            final_status = "CANCELLED" if active_scan_cancellations.get(scan_id, False) else "COMPLETED"
            await ScanRepository.complete_scan(
                db, scan_id, final_status,
                total_found, valid_count, duplicate_count, rejected_count, error_count, source_stats
            )
            await db.commit()
            logger.info(f"[DiscoveryPipeline][Step 5/5 - COMPLETE] Scan {scan_id} finished with status '{final_status}'. Total Found: {total_found}, Valid Jobs Ingested: {valid_count}, Duplicates: {duplicate_count}, Rejected: {rejected_count}, Errors: {error_count}")

        except Exception as scan_ex:
            logger.error(f"Fatal error in scan {scan_id}: {scan_ex}")
            await ScanRepository.complete_scan(
                db, scan_id, "FAILED",
                total_found, valid_count, duplicate_count, rejected_count, error_count + 1, source_stats
            )
            await db.commit()
        finally:
            active_scan_cancellations.pop(scan_id, None)
