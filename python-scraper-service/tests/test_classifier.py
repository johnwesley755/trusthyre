import pytest
from app.extractors.classifier import BlueCollarClassifier

def test_accepts_delivery_rider():
    is_valid, reason = BlueCollarClassifier.evaluate("Delivery Partner / Rider - Chennai", "Need bike and driving license")
    assert is_valid is True
    assert reason is None

def test_accepts_warehouse_packer():
    is_valid, reason = BlueCollarClassifier.evaluate("Warehouse Associate & Packer", "Picking, packing, and sorting packages")
    assert is_valid is True
    assert reason is None

def test_accepts_electrician():
    is_valid, reason = BlueCollarClassifier.evaluate("Maintenance Electrician - Industrial Unit", "ITI certificate required")
    assert is_valid is True
    assert reason is None

def test_accepts_security_guard():
    is_valid, reason = BlueCollarClassifier.evaluate("Security Guard (Day/Night Shift)")
    assert is_valid is True
    assert reason is None

def test_accepts_housekeeping():
    is_valid, reason = BlueCollarClassifier.evaluate("Housekeeping Staff - Hotel")
    assert is_valid is True
    assert reason is None

def test_rejects_software_engineer():
    is_valid, reason = BlueCollarClassifier.evaluate("Senior Software Engineer (React / Node.js)")
    assert is_valid is False
    assert "white-collar" in reason.lower()

def test_rejects_product_manager():
    is_valid, reason = BlueCollarClassifier.evaluate("Associate Product Manager")
    assert is_valid is False
    assert "white-collar" in reason.lower()

def test_rejects_hr_recruiter():
    is_valid, reason = BlueCollarClassifier.evaluate("HR Recruiter - Talent Acquisition")
    assert is_valid is False
    assert "white-collar" in reason.lower()

def test_rejects_accountant():
    is_valid, reason = BlueCollarClassifier.evaluate("Chartered Accountant / Financial Analyst")
    assert is_valid is False
    assert "white-collar" in reason.lower()

def test_rejects_vague_unrecognized_role():
    is_valid, reason = BlueCollarClassifier.evaluate("Random Ambiguous Role Alpha")
    assert is_valid is False
    assert "does not match" in reason.lower()

def test_accepts_maintenance_engineer():
    is_valid, reason = BlueCollarClassifier.evaluate("Maintenance Engineer - Manufacturing Plant", "ITI/Diploma in mechanical maintenance")
    assert is_valid is True
    assert reason is None

def test_accepts_field_service_engineer():
    is_valid, reason = BlueCollarClassifier.evaluate("Field Service Engineer - AC & Water Purifier Repair", "Visit customer homes with tool kit")
    assert is_valid is True
    assert reason is None

def test_accepts_site_engineer_construction():
    is_valid, reason = BlueCollarClassifier.evaluate("Civil Site Engineer & Construction Supervisor", "Supervise site labor and raw materials")
    assert is_valid is True
    assert reason is None

def test_accepts_cnc_operator():
    is_valid, reason = BlueCollarClassifier.evaluate("CNC Machine Operator / Fitter - Coimbatore", "Operate lathe and milling machinery")
    assert is_valid is True
    assert reason is None

def test_accepts_delivery_with_software_mention_in_desc():
    is_valid, reason = BlueCollarClassifier.evaluate("Van Delivery Driver - Chennai", "Coordinate with logistics dispatch team using our mobile delivery tracking software")
    assert is_valid is True
    assert reason is None

def test_rejects_devops_cloud_engineer():
    is_valid, reason = BlueCollarClassifier.evaluate("Cloud DevOps Engineer - AWS/Kubernetes")
    assert is_valid is False
    assert "white-collar" in reason.lower()

