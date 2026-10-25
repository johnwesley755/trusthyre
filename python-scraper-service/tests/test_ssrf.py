import pytest
from app.core.ssrf_validator import validate_url_safety, SSRFValidationError

def test_allows_public_https_url():
    url = "https://api.lever.co/v0/postings/porter"
    assert validate_url_safety(url) == url

def test_blocks_localhost_ip():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://127.0.0.1:8080/admin")

def test_blocks_loopback_ipv6():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://[::1]:8080/secrets")

def test_blocks_private_subnet_10():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://10.0.0.5/api")

def test_blocks_private_subnet_192():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://192.168.1.1/router")

def test_blocks_cloud_metadata():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://169.254.169.254/latest/meta-data")

def test_blocks_non_http_schemes():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("file:///etc/passwd")
    with pytest.raises(SSRFValidationError):
        validate_url_safety("gopher://127.0.0.1:6379")

def test_blocks_ipv4_mapped_ipv6():
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://[::ffff:127.0.0.1]/sensitive")
    with pytest.raises(SSRFValidationError):
        validate_url_safety("http://[::ffff:169.254.169.254]/latest")
