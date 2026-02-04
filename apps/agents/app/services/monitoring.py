import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from app.config import get_settings

settings = get_settings()


class StructuredLogger:
    """Structured logging for better monitoring"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup logging handlers"""
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # File handler
        file_handler = logging.FileHandler('logs/zoark-os.log')
        file_handler.setLevel(logging.DEBUG)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
    
    def log_event(self, event_type: str, data: Dict[str, Any], level: str = "INFO"):
        """Log structured event"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "data": data
        }
        
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(json.dumps(log_entry))
    
    def log_api_request(self, method: str, path: str, status_code: int, duration_ms: float):
        """Log API request"""
        self.log_event("api_request", {
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms
        })
    
    def log_agent_execution(self, agent_id: str, status: str, duration_ms: float, tokens_used: int = 0):
        """Log agent execution"""
        self.log_event("agent_execution", {
            "agent_id": agent_id,
            "status": status,
            "duration_ms": duration_ms,
            "tokens_used": tokens_used
        })
    
    def log_error(self, error_type: str, message: str, context: Optional[Dict[str, Any]] = None):
        """Log error"""
        self.log_event("error", {
            "error_type": error_type,
            "message": message,
            "context": context or {}
        }, level="ERROR")
    
    def log_database_query(self, query: str, duration_ms: float, rows_affected: int = 0):
        """Log database query"""
        self.log_event("database_query", {
            "query": query[:100],  # First 100 chars
            "duration_ms": duration_ms,
            "rows_affected": rows_affected
        })


def init_sentry():
    """Initialize Sentry for error tracking"""
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,
            environment=settings.environment,
            attach_stacktrace=True,
            debug=settings.environment == "development"
        )


class PerformanceMonitor:
    """Monitor application performance"""
    
    def __init__(self):
        self.logger = StructuredLogger("PerformanceMonitor")
        self.metrics = {}
    
    def track_api_response_time(self, endpoint: str, duration_ms: float):
        """Track API response time"""
        if endpoint not in self.metrics:
            self.metrics[endpoint] = []
        
        self.metrics[endpoint].append(duration_ms)
        
        # Log if slow
        if duration_ms > 1000:  # > 1 second
            self.logger.log_event("slow_api", {
                "endpoint": endpoint,
                "duration_ms": duration_ms
            }, level="WARNING")
    
    def track_database_query(self, query: str, duration_ms: float):
        """Track database query performance"""
        # Log if slow
        if duration_ms > 500:  # > 500ms
            self.logger.log_event("slow_query", {
                "query": query[:100],
                "duration_ms": duration_ms
            }, level="WARNING")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        metrics = {}
        for endpoint, times in self.metrics.items():
            if times:
                metrics[endpoint] = {
                    "avg_ms": sum(times) / len(times),
                    "min_ms": min(times),
                    "max_ms": max(times),
                    "count": len(times)
                }
        return metrics


# Global instances
logger = StructuredLogger("ZOARKOS")
performance_monitor = PerformanceMonitor()


def log_request_response(method: str, path: str, status_code: int, duration_ms: float):
    """Log request/response"""
    logger.log_api_request(method, path, status_code, duration_ms)
    performance_monitor.track_api_response_time(path, duration_ms)


def log_agent_execution(agent_id: str, status: str, duration_ms: float, tokens_used: int = 0):
    """Log agent execution"""
    logger.log_agent_execution(agent_id, status, duration_ms, tokens_used)


def log_error(error_type: str, message: str, context: Optional[Dict[str, Any]] = None):
    """Log error"""
    logger.log_error(error_type, message, context)
    
    # Also report to Sentry if configured
    if settings.sentry_dsn:
        sentry_sdk.capture_exception(Exception(f"{error_type}: {message}"))
