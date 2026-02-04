from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ZOARKOSException(Exception):
    """Base exception for ZOARK OS"""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationError(ZOARKOSException):
    """Authentication failed"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(ZOARKOSException):
    """User not authorized"""
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, "AUTHZ_ERROR", status.HTTP_403_FORBIDDEN)


class ValidationError(ZOARKOSException):
    """Validation failed"""
    def __init__(self, message: str, field: Optional[str] = None):
        self.field = field
        super().__init__(message, "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST)


class NotFoundError(ZOARKOSException):
    """Resource not found"""
    def __init__(self, resource: str, resource_id: Optional[str] = None):
        message = f"{resource} not found"
        if resource_id:
            message += f" (ID: {resource_id})"
        super().__init__(message, "NOT_FOUND", status.HTTP_404_NOT_FOUND)


class ConflictError(ZOARKOSException):
    """Resource conflict"""
    def __init__(self, message: str):
        super().__init__(message, "CONFLICT", status.HTTP_409_CONFLICT)


class RateLimitError(ZOARKOSException):
    """Rate limit exceeded"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, "RATE_LIMIT", status.HTTP_429_TOO_MANY_REQUESTS)


class ExternalServiceError(ZOARKOSException):
    """External service error"""
    def __init__(self, service: str, message: str):
        super().__init__(f"{service} error: {message}", "EXTERNAL_SERVICE_ERROR", status.HTTP_502_BAD_GATEWAY)


class APIKeyError(ZOARKOSException):
    """API key related error"""
    def __init__(self, message: str):
        super().__init__(message, "API_KEY_ERROR", status.HTTP_400_BAD_REQUEST)


class AgentExecutionError(ZOARKOSException):
    """Agent execution error"""
    def __init__(self, message: str):
        super().__init__(message, "AGENT_EXECUTION_ERROR", status.HTTP_400_BAD_REQUEST)


def exception_to_response(exc: ZOARKOSException) -> Dict[str, Any]:
    """Convert exception to API response"""
    response = {
        "error": {
            "code": exc.code,
            "message": exc.message,
        }
    }
    
    if isinstance(exc, ValidationError) and exc.field:
        response["error"]["field"] = exc.field
    
    logger.error(f"{exc.code}: {exc.message}")
    return response


def log_error(error_code: str, message: str, context: Optional[Dict[str, Any]] = None):
    """Log error with context"""
    log_message = f"[{error_code}] {message}"
    if context:
        log_message += f" | Context: {context}"
    logger.error(log_message)
