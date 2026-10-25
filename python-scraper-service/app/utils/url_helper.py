from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import re

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ref", "source", "trk", "tracking_id"
}

def canonicalize_url(raw_url: str) -> str:
    """
    Cleans tracking parameters, normalizes scheme and host, and drops redundant fragments.
    """
    if not raw_url:
        return ""
    try:
        parts = urlsplit(raw_url.strip())
        query_pairs = parse_qsl(parts.query, keep_blank_values=False)
        cleaned_query = [
            (k, v) for k, v in query_pairs if k.lower() not in TRACKING_PARAMS
        ]
        cleaned_query.sort(key=lambda x: x[0])
        
        # Lowercase scheme and netloc, strip trailing slash from path if not root
        path = parts.path
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]

        return urlunsplit((
            parts.scheme.lower(),
            parts.netloc.lower(),
            path,
            urlencode(cleaned_query),
            "" # Drop fragment
        ))
    except Exception:
        return raw_url.strip()


def is_matching_domain(url_or_host: str, target_domain: str) -> bool:
    """
    Strict domain verification preventing substring injection attacks.
    Matches 'greenhouse.io' or subdomains '*.greenhouse.io'.
    """
    if not url_or_host or not target_domain:
        return False
    
    host = url_or_host.lower().strip()
    if "://" in host:
        try:
            host = urlsplit(host).hostname or ""
        except Exception:
            return False

    target = target_domain.lower().strip()
    return host == target or host.endswith("." + target)
