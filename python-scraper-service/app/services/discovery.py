import asyncio
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schemas import ScanQueryConfig, RawJobRecord
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
        logger.info(f"Starting discovery scan {scan_id} for city: {config.city}, query: '{config.query}' (expanded: {expanded_keywords})")

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
            for adapter in selected_adapters:
                # Check for cancellation before starting each source
                if active_scan_cancellations.get(scan_id, False):
                    logger.info(f"Scan {scan_id} aborted due to cancellation request.")
                    break

                # Determine honest source status
                adapter_health = await adapter.check_health()
                adapter_status = adapter_health.status

                source_stats[adapter.id] = {
                    "name": adapter.name,
                    "status": adapter_status,
                    "discovered": 0,
                    "valid": 0,
                    "duplicates": 0,
                    "rejected": 0,
                    "errors": 0,
                }

                if adapter.is_restricted or adapter_status in ["PERMISSION_REQUIRED", "AUTH_REQUIRED", "UNAVAILABLE"]:
                    msg = f"Source {adapter.name} is in state {adapter_status}. Automated crawl skipped ({adapter_health.error_message or adapter.compliance_note})."
                    await ScanRepository.log_event(db, scan_id, adapter.id, msg, level="WARN")
                    continue

                try:
                    candidates: List[RawJobRecord] = await adapter.discover_jobs(config)
                    source_stats[adapter.id]["discovered"] = len(candidates)
                    total_found += len(candidates)

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

                except Exception as src_err:
                    error_count += 1
                    source_stats[adapter.id]["errors"] += 1
                    logger.error(f"Error executing adapter {adapter.id}: {src_err}")
                    await ScanRepository.log_event(db, scan_id, adapter.id, str(src_err), level="ERROR")
                    await db.commit()

            final_status = "CANCELLED" if active_scan_cancellations.get(scan_id, False) else "COMPLETED"
            await ScanRepository.complete_scan(
                db, scan_id, final_status,
                total_found, valid_count, duplicate_count, rejected_count, error_count, source_stats
            )
            await db.commit()
            logger.info(f"Scan {scan_id} finished with status {final_status}. Valid: {valid_count}, Dups: {duplicate_count}, Rejected: {rejected_count}")

        except Exception as scan_ex:
            logger.error(f"Fatal error in scan {scan_id}: {scan_ex}")
            await ScanRepository.complete_scan(
                db, scan_id, "FAILED",
                total_found, valid_count, duplicate_count, rejected_count, error_count + 1, source_stats
            )
            await db.commit()
        finally:
            active_scan_cancellations.pop(scan_id, None)
