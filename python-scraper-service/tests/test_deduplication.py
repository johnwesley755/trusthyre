import pytest
from app.models.schemas import RawJobRecord
from app.services.deduplication import DeduplicationService
from app.extractors.normalizer import normalize_company, normalize_title, get_salary_bracket

def test_company_normalization():
    assert normalize_company("Porter Technologies Pvt. Ltd.") == "porter"
    assert normalize_company("Meesho Private Limited") == "meesho"
    assert normalize_company("Swiggy Delivery Solutions Corp") == "swiggydelivery"

def test_title_normalization():
    assert normalize_title("Urgently Hiring: Delivery Executive!!") == "delivery executive"
    assert normalize_title("Immediate requirement - Warehouse Packer (Fresher)") == "warehouse packer"

def test_salary_bracket():
    assert get_salary_bracket(12000, 14000) == "under-15k"
    assert get_salary_bracket(18000, 22000) == "15k-25k"
    assert get_salary_bracket(30000, 35000) == "25k-40k"
    assert get_salary_bracket(None, None) == "unspecified"

def test_source_hash_consistency():
    job1 = RawJobRecord(
        title="Delivery Boy - Urgent",
        company_name="Porter Pvt Ltd",
        city="Chennai",
        salary_min=18000,
        salary_max=22000,
        source_name="Porter Careers",
        source_url="https://porter.in/careers/delivery-1?utm_source=google",
    )
    job2 = RawJobRecord(
        title="Delivery Boy",
        company_name="Porter Limited",
        city="chennai",
        salary_min=19000,
        salary_max=21000,
        source_name="Partner ATS",
        source_url="https://porter.in/careers/delivery-1",
    )

    hash1 = DeduplicationService.compute_source_hash(job1)
    hash2 = DeduplicationService.compute_source_hash(job2)
    assert hash1 == hash2, "Expected matching SHA-256 fingerprint across noisy postings"
