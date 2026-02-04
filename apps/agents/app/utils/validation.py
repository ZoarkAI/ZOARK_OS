import re
from typing import Any, Optional
from app.utils.errors import ValidationError


def validate_email(email: str) -> str:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError("Invalid email format", "email")
    return email.lower()


def validate_password(password: str) -> str:
    """Validate password strength"""
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters", "password")
    if not any(c.isupper() for c in password):
        raise ValidationError("Password must contain uppercase letter", "password")
    if not any(c.islower() for c in password):
        raise ValidationError("Password must contain lowercase letter", "password")
    if not any(c.isdigit() for c in password):
        raise ValidationError("Password must contain digit", "password")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        raise ValidationError("Password must contain special character", "password")
    return password


def validate_url(url: str) -> str:
    """Validate URL format"""
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    if not re.match(pattern, url):
        raise ValidationError("Invalid URL format", "url")
    return url


def validate_api_key_format(api_key: str, provider: str) -> str:
    """Validate API key format based on provider"""
    if not api_key or len(api_key) < 10:
        raise ValidationError("Invalid API key format", "api_key")
    
    if provider == "openai" and not api_key.startswith("sk-"):
        raise ValidationError("OpenAI key must start with 'sk-'", "api_key")
    
    if provider == "anthropic" and not api_key.startswith("sk-ant-"):
        raise ValidationError("Anthropic key must start with 'sk-ant-'", "api_key")
    
    return api_key


def validate_string(value: str, min_length: int = 1, max_length: int = 1000, field_name: str = "field") -> str:
    """Validate string length"""
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string", field_name)
    
    if len(value) < min_length:
        raise ValidationError(f"{field_name} must be at least {min_length} characters", field_name)
    
    if len(value) > max_length:
        raise ValidationError(f"{field_name} must be at most {max_length} characters", field_name)
    
    return value.strip()


def validate_integer(value: Any, min_value: Optional[int] = None, max_value: Optional[int] = None, field_name: str = "field") -> int:
    """Validate integer value"""
    if not isinstance(value, int):
        raise ValidationError(f"{field_name} must be an integer", field_name)
    
    if min_value is not None and value < min_value:
        raise ValidationError(f"{field_name} must be at least {min_value}", field_name)
    
    if max_value is not None and value > max_value:
        raise ValidationError(f"{field_name} must be at most {max_value}", field_name)
    
    return value


def validate_enum(value: str, allowed_values: list, field_name: str = "field") -> str:
    """Validate enum value"""
    if value not in allowed_values:
        raise ValidationError(f"{field_name} must be one of: {', '.join(allowed_values)}", field_name)
    return value


def sanitize_string(value: str) -> str:
    """Sanitize string to prevent injection attacks"""
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", ';', '--', '/*', '*/']
    for char in dangerous_chars:
        value = value.replace(char, '')
    return value.strip()


def validate_file_upload(filename: str, allowed_extensions: list, max_size_mb: int = 10) -> str:
    """Validate file upload"""
    if not filename:
        raise ValidationError("Filename is required", "filename")
    
    # Check extension
    ext = filename.split('.')[-1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f"File type must be one of: {', '.join(allowed_extensions)}", "filename")
    
    return filename


def validate_json_structure(data: dict, required_fields: list, field_name: str = "data") -> dict:
    """Validate JSON structure"""
    for field in required_fields:
        if field not in data:
            raise ValidationError(f"Missing required field: {field}", field_name)
    
    return data


def validate_agent_config(config: dict) -> dict:
    """Validate custom agent configuration"""
    required_fields = ["name", "description", "role", "goal", "backstory", "llmProvider", "apiKeyId"]
    
    for field in required_fields:
        if field not in config or not config[field]:
            raise ValidationError(f"Missing required field: {field}", "config")
    
    # Validate name
    validate_string(config["name"], min_length=1, max_length=100, field_name="name")
    
    # Validate description
    validate_string(config["description"], min_length=1, max_length=500, field_name="description")
    
    # Validate LLM provider
    allowed_providers = ["openai", "anthropic", "huggingface", "custom"]
    validate_enum(config["llmProvider"], allowed_providers, "llmProvider")
    
    # Validate tools if provided
    if "tools" in config and config["tools"]:
        if not isinstance(config["tools"], list):
            raise ValidationError("Tools must be a list", "tools")
    
    return config
