"""
Structured Logging, Correlation Request ID, and Safe Error Handling Middleware.
"""

import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("nirikshak-api")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Attaches unique correlation IDs to requests, tracks performance latency,
    and intercepts unhandled server errors with safe structured messages.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate or preserve correlation request ID
        req_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id

        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            response.headers["X-Request-ID"] = req_id
            response.headers["X-Response-Time-Ms"] = str(elapsed_ms)

            # Do not log health probes excessively
            if not request.url.path.startswith("/api/health"):
                logger.info(
                    f"[{req_id}] {request.method} {request.url.path} -> "
                    f"Status {response.status_code} ({elapsed_ms}ms)"
                )
            return response

        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"[{req_id}] UNHANDLED ERROR on {request.method} {request.url.path}: {str(exc)}",
                exc_info=True,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred while processing the statutory inspection request.",
                    "request_id": req_id,
                },
                headers={"X-Request-ID": req_id},
            )
