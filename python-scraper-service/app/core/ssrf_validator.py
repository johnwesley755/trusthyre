import ipaddress
import socket
from urllib.parse import urlsplit
import httpx


BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),       # Link-local & cloud metadata
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.88.99.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),             # Loopback
    ipaddress.ip_network("fc00::/7"),            # Unique local
    ipaddress.ip_network("fe80::/10"),           # Link-local
    ipaddress.ip_network("ff00::/8"),            # Multicast
]


class SSRFValidationError(ValueError):
    """Raised when a URL points to a forbidden network address."""
    pass


def is_ip_allowed(ip_str: str) -> bool:
    """Returns True if the IP is public and safe to connect to; False if private/reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped

        for net in BLOCKED_IP_NETWORKS:
            if ip in net:
                return False
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast)
    except ValueError:
        return False


def validate_url_safety(url: str) -> str:
    """
    Validates URL scheme, resolves hostname to IP addresses, and ensures
    no resolved IP falls into private or internal CIDRs.
    """
    parts = urlsplit(url)
    if parts.scheme.lower() not in ("http", "https"):
        raise SSRFValidationError(f"Forbidden URL scheme: {parts.scheme}. Only HTTP/HTTPS allowed.")

    hostname = parts.hostname
    if not hostname:
        raise SSRFValidationError("URL lacks a valid hostname.")

    # Check if the hostname is directly an IP address
    try:
        if not is_ip_allowed(hostname):
            raise SSRFValidationError(f"Direct connection to private/reserved IP '{hostname}' blocked.")
        return url
    except ValueError:
        pass

    # Resolve hostname via DNS
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise SSRFValidationError(f"DNS resolution failed for hostname '{hostname}': {e}")

    for addr in addr_info:
        ip_str = addr[4][0]
        if not is_ip_allowed(ip_str):
            raise SSRFValidationError(
                f"Security alert: Hostname '{hostname}' resolved to prohibited internal IP '{ip_str}'."
            )

    return url


async def validate_redirect_event_hook(request: httpx.Request):
    """Event hook for httpx to inspect every request in a redirect chain."""
    validate_url_safety(str(request.url))
