import re
from typing import Tuple, Optional
from app.models.schemas import RawJobRecord
from app.extractors.classifier import BlueCollarClassifier

BANNED_COMPANIES = [
    r"^confidential$", r"^hiring$", r"^hiring\s+company$", r"^employer$",
    r"^direct\s+employer$", r"^urgent\s+hiring$", r"^immediate\s+requirement$",
    r"^consultancy$", r"^placement\s+agency$", r"^unknown$", r"^dummy$",
    r"^test\s+company$"
]

BANNED_TITLES = [
    r"lorem\s+ipsum", r"^test(\s+job)?$", r"^sample(\s+job)?$",
    r"^urgent\s+requirement$", r"^job\s+opening$", r"^various\s+positions$"
]

# Foreign / Overseas locations that appear in Indian domestic searches as foreign recruitment listings
OVERSEAS_GULF_PATTERNS = [
    r"\bkuwait\b", r"\bdubai\b", r"\buae\b", r"\babu\s*dhabi\b",
    r"\bsaudi(?:\s*arabia)?\b", r"\bqatar\b", r"\boman\b", r"\bbahrain\b",
    r"\bgulf\b", r"\bsingapore\b", r"\bmalaysia\b"
]

compiled_banned_companies = [re.compile(p, re.IGNORECASE) for p in BANNED_COMPANIES]
compiled_banned_titles = [re.compile(p, re.IGNORECASE) for p in BANNED_TITLES]
compiled_overseas = [re.compile(p, re.IGNORECASE) for p in OVERSEAS_GULF_PATTERNS]


def validate_job_quality(job: RawJobRecord) -> Tuple[bool, Optional[str]]:
    """
    Evaluates a candidate external job against completeness, legitimacy,
    domestic localization, reasonable salary bounds, and strict blue-collar role qualification.
    """
    # 1. Title verification
    title = (job.title or "").strip()
    if len(title) < 3:
        return False, "Job title is too short or missing."

    for pattern in compiled_banned_titles:
        if pattern.search(title):
            return False, f"Job title matches placeholder pattern: '{title}'."

    # 2. Company verification
    company = (job.company_name or "").strip()
    if len(company) < 2:
        return False, "Employer company name is missing or too short."

    for pattern in compiled_banned_companies:
        if pattern.search(company):
            return False, f"Employer matches generic/dummy pattern: '{company}'."

    # 3. Source URL verification
    if not job.source_url or not (job.source_url.startswith("http://") or job.source_url.startswith("https://")):
        return False, "Invalid or missing source URL."

    # 4. Location verification (Must have at least city or location established)
    if not (job.city and job.city.strip()) and not (job.location and job.location.strip()):
        return False, "Job location is missing or unidentifiable."

    # 4b. Overseas / Gulf check: If user is searching domestic India, discard foreign recruitments
    loc_and_title = f"{title} {job.location or ''} {job.city or ''}"
    for pattern in compiled_overseas:
        if pattern.search(loc_and_title):
            return False, f"Rejected: Foreign/Gulf overseas recruitment listing detected ('{pattern.pattern}')."

    # 4c. Blue-collar salary guard: Indian frontline roles rarely exceed ₹70k/mo or ₹8.5 LPA
    if job.salary_max:
        if job.salary_period == "MONTHLY" and job.salary_max > 75000:
            return False, f"Rejected: Salary ₹{job.salary_max}/mo exceeds blue-collar wage threshold (likely corporate/white-collar)."
        elif job.salary_period == "YEARLY" and job.salary_max > 900000:
            return False, f"Rejected: Salary ₹{job.salary_max}/yr exceeds blue-collar wage threshold (likely corporate/white-collar)."

    # 5. Blue-Collar Role Classification
    is_blue_collar, reject_reason = BlueCollarClassifier.evaluate(job.title, job.description)
    if not is_blue_collar:
        return False, reject_reason

    return True, None
