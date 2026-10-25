import httpx
from app.core.config import settings
from app.core.ssrf_validator import validate_redirect_event_hook, validate_url_safety

def create_safe_async_client(timeout: int = None) -> httpx.AsyncClient:
    """
    Creates an async HTTP client configured with SSRF protection,
    custom compliance User-Agent, and strict connection timeouts.
    """
    timeout_val = timeout or settings.REQUEST_TIMEOUT_SECONDS
    return httpx.AsyncClient(
        headers={
            "User-Agent": settings.USER_AGENT,
            "Accept": "application/json, text/html, application/xhtml+xml;q=0.9, */*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,ta;q=0.8,hi;q=0.7",
        },
        timeout=httpx.Timeout(timeout_val, connect=5.0),
        follow_redirects=True,
        max_redirects=4,
        event_hooks={
            "request": [validate_redirect_event_hook]
        }
    )
