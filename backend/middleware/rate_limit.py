"""
In-Memory Rate Limiting Middleware for NIRIKSHAK AI APIs.
Protects authentication, grievance intake, and image upload endpoints
against automated abuse and denial-of-service attempts.
"""

import time
import logging
from typing import Dict, List, Tuple
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("nirikshak-ratelimit")


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding window per-client IP rate limiter with endpoint-specific thresholds.
    """

    # Configured limits: (max_requests, window_seconds)
    ROUTE_LIMITS = {
        "/api/auth/login": (15, 60),            # 15 attempts per minute
        "/api/complaints": (30, 60),            # 30 submissions per minute
        "/api/compliance/analyze": (40, 60),    # 40 OCR analyses per minute
    }
    DEFAULT_LIMIT = (180, 60)                   # 180 requests per minute general limit

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled
        self.history: Dict[str, List[float]] = {}

    def _cleanup(self, now: float):
        """Purge entries older than 2 minutes to prevent memory growth."""
        cutoff = now - 120
        keys_to_delete = []
        for key, timestamps in self.history.items():
            self.history[key] = [t for t in timestamps if t > cutoff]
            if not self.history[key]:
                keys_to_delete.append(key)
        for k in keys_to_delete:
            self.history.pop(k, None)

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self.enabled:
            return await call_next(request)

        # Allow test client or health probes or preflight OPTIONS to bypass rate limits
        if request.method == "OPTIONS" or request.headers.get("X-Test-Bypass-Rate-Limit") == "true":
            return await call_next(request)

        path = request.url.path
        if path.startswith("/api/health") or path.startswith("/docs") or path.startswith("/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Match specific route limit or fallback to default
        max_requests, window_sec = self.DEFAULT_LIMIT
        if "/copilot" in path:
            max_requests, window_sec = (30, 60)  # 30 copilot queries per minute
        else:
            for route_prefix, limit in self.ROUTE_LIMITS.items():
                if path == route_prefix or path.startswith(route_prefix):
                    max_requests, window_sec = limit
                    break

        key = f"{client_ip}:copilot" if "/copilot" in path else f"{client_ip}:{path}"
        timestamps = self.history.get(key, [])
        valid_window = now - window_sec
        recent_timestamps = [t for t in timestamps if t > valid_window]

        if len(recent_timestamps) >= max_requests:
            retry_after = int(window_sec - (now - recent_timestamps[0])) + 1
            logger.warning(f"Rate limit exceeded for IP {client_ip} on {path}. Limit: {max_requests}/{window_sec}s")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "detail": f"Rate limit exceeded for {path}. Please wait before retrying.",
                    "retry_after_seconds": max(1, retry_after),
                },
                headers={"Retry-After": str(max(1, retry_after))},
            )

        recent_timestamps.append(now)
        self.history[key] = recent_timestamps

        if len(self.history) > 1000:
            self._cleanup(now)

        response = await call_next(request)
        return response
