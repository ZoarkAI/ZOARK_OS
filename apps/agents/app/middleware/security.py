from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
import time
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all requests and responses"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(f"Request: {request.method} {request.url.path}")
        
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(f"Response: {request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
        
        # Add timing header
        response.headers["X-Process-Time"] = str(duration)
        
        return response


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Sanitize input to prevent injection attacks"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Check for suspicious patterns in query parameters
        for param, value in request.query_params.items():
            if self._is_suspicious(value):
                logger.warning(f"Suspicious query parameter detected: {param}={value}")
        
        return await call_next(request)
    
    def _is_suspicious(self, value: str) -> bool:
        """Check if value contains suspicious patterns"""
        suspicious_patterns = [
            "' OR '1'='1",
            "'; DROP TABLE",
            "<script>",
            "javascript:",
            "onclick=",
            "onerror=",
            "../",
            "..\\",
        ]
        
        value_lower = value.lower()
        return any(pattern.lower() in value_lower for pattern in suspicious_patterns)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.rpm = requests_per_minute
        self._hits = {}
    
    async def dispatch(self, request: Request, call_next) -> Response:
        ip = request.client.host if request.client else "0.0.0.0"
        now = time.time()
        cutoff = now - 60.0
        
        # Get hits for this IP
        if ip not in self._hits:
            self._hits[ip] = []
        
        hits = [t for t in self._hits[ip] if t > cutoff]
        
        if len(hits) >= self.rpm:
            logger.warning(f"Rate limit exceeded for IP: {ip}")
            return Response(
                content='{"detail": "Rate limit exceeded"}',
                status_code=429,
                media_type="application/json"
            )
        
        hits.append(now)
        self._hits[ip] = hits
        
        return await call_next(request)


def setup_security_middleware(app):
    """Setup all security middleware"""
    
    # HTTPS redirect (only in production)
    # app.add_middleware(HTTPSRedirectMiddleware)
    
    # Trusted hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.zoark-os.com"]
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001", "https://zoark-os.com"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Custom security middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(InputSanitizationMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=120)
