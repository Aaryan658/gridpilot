import os, secrets
from fastapi import (
    HTTPException, Security, Request
)
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(
    name="X-GridPilot-API-Key",
    auto_error=False
)

MASTER_API_KEY = os.getenv(
    "GRIDPILOT_API_KEY",
    "gp_" + secrets.token_hex(16)
)

print(f"\nGridPilot API Key: {MASTER_API_KEY}\n")

def is_localhost(request: Request) -> bool:
    host = request.client.host
    return host in [
        "127.0.0.1", "::1", "localhost"
    ]

def verify_api_key(
    request: Request,
    api_key: str = Security(API_KEY_HEADER)
):
    if is_localhost(request):
        return "local_demo"
    if not api_key or \
       api_key != MASTER_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )
    return api_key
