"""
Input validation and sanitization middleware for SPR system
Prevents injection attacks and ensures data integrity
"""

import re
import html
import json
import bleach
import logging
from typing import Any, Dict, List, Optional, Union
from functools import wraps
from flask import request, jsonify
from urllib.parse import quote
import unicodedata
from datetime import datetime
import phonenumbers
from email_validator import validate_email, EmailNotValidError

logger = logging.getLogger(__name__)

class ValidationConfig:
    """Configuration for validation rules"""
    
    # String limits
    MAX_STRING_LENGTH = 10000
    MAX_MESSAGE_LENGTH = 4096
    MAX_FILENAME_LENGTH = 255
    MAX_USERNAME_LENGTH = 50
    MAX_EMAIL_LENGTH = 254
    
    # Phone number validation
    ALLOWED_PHONE_REGIONS = ['BR', 'US', 'AR', 'UY', 'PY']
    
    # File upload limits
    MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
    ALLOWED_FILE_TYPES = {
        'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'document': ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'],
        'video': ['mp4', 'webm', 'avi'],
        'audio': ['mp3', 'wav', 'ogg', 'm4a']
    }
    
    # Rate limiting
    MAX_REQUESTS_PER_MINUTE = 100
    MAX_MESSAGE_REQUESTS_PER_MINUTE = 30

class InputSanitizer:
    """Service for sanitizing and validating input data"""
    
    def __init__(self):
        # Configure bleach for HTML sanitization
        self.allowed_html_tags = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
        self.allowed_html_attributes = {}
        
        # SQL injection patterns
        self.sql_injection_patterns = [
            r"(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)",
            r"('|\"|;|--|\*|\/\*|\*\/)",
            r"(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+",
            r"(\bOR\b|\bAND\b)\s+[\"']?\w+[\"']?\s*=\s*[\"']?\w+[\"']?",
        ]
        
        # XSS patterns
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>",
        ]
        
        # Command injection patterns
        self.command_injection_patterns = [
            r"[;&|`$]",
            r"\.\./",
            r"~/",
            r"\${.*}",
            r"\$\(.*\)",
        ]
    
    def sanitize_string(self, value: str, max_length: Optional[int] = None) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return str(value)
        
        # Normalize unicode
        value = unicodedata.normalize('NFKC', value)
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # Limit length
        if max_length:
            value = value[:max_length]
        
        # HTML escape
        value = html.escape(value)
        
        return value.strip()
    
    def sanitize_html(self, value: str) -> str:
        """Sanitize HTML content"""
        if not isinstance(value, str):
            return str(value)
        
        # Use bleach to clean HTML
        clean_html = bleach.clean(
            value,
            tags=self.allowed_html_tags,
            attributes=self.allowed_html_attributes,
            strip=True
        )
        
        return clean_html
    
    def validate_phone_number(self, phone: str, region: str = 'BR') -> Dict[str, Any]:
        """Validate phone number format"""
        try:
            if not phone:
                return {'valid': False, 'error': 'Phone number is required'}
            
            # Remove common formatting characters
            clean_phone = re.sub(r'[^\d+]', '', phone)
            
            # Parse phone number
            parsed_number = phonenumbers.parse(clean_phone, region)
            
            # Validate
            if not phonenumbers.is_valid_number(parsed_number):
                return {'valid': False, 'error': 'Invalid phone number format'}
            
            # Check if region is allowed
            number_region = phonenumbers.region_code_for_number(parsed_number)
            if number_region not in ValidationConfig.ALLOWED_PHONE_REGIONS:
                return {'valid': False, 'error': f'Phone region {number_region} not allowed'}
            
            # Format number
            formatted_number = phonenumbers.format_number(
                parsed_number, 
                phonenumbers.PhoneNumberFormat.E164
            )
            
            return {
                'valid': True,
                'formatted_number': formatted_number,
                'region': number_region
            }
            
        except phonenumbers.NumberParseException as e:
            return {'valid': False, 'error': f'Phone parsing error: {str(e)}'}
        except Exception as e:
            logger.error(f"Phone validation error: {e}")
            return {'valid': False, 'error': 'Phone validation failed'}
    
    def validate_email(self, email: str) -> Dict[str, Any]:
        """Validate email address"""
        try:
            if not email:
                return {'valid': False, 'error': 'Email is required'}
            
            if len(email) > ValidationConfig.MAX_EMAIL_LENGTH:
                return {'valid': False, 'error': 'Email too long'}
            
            # Validate email
            validated_email = validate_email(email)
            
            return {
                'valid': True,
                'normalized_email': validated_email.email
            }
            
        except EmailNotValidError as e:
            return {'valid': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Email validation error: {e}")
            return {'valid': False, 'error': 'Email validation failed'}
    
    def detect_sql_injection(self, value: str) -> bool:
        """Detect potential SQL injection attempts"""
        if not isinstance(value, str):
            return False
        
        value_upper = value.upper()
        
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, value_upper, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {pattern}")
                return True
        
        return False
    
    def detect_xss(self, value: str) -> bool:
        """Detect potential XSS attempts"""
        if not isinstance(value, str):
            return False
        
        for pattern in self.xss_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f"Potential XSS detected: {pattern}")
                return True
        
        return False
    
    def detect_command_injection(self, value: str) -> bool:
        """Detect potential command injection attempts"""
        if not isinstance(value, str):
            return False
        
        for pattern in self.command_injection_patterns:
            if re.search(pattern, value):
                logger.warning(f"Potential command injection detected: {pattern}")
                return True
        
        return False
    
    def validate_file_upload(self, filename: str, file_size: int, content_type: str) -> Dict[str, Any]:
        """Validate file upload parameters"""
        try:
            # Check filename
            if not filename:
                return {'valid': False, 'error': 'Filename is required'}
            
            if len(filename) > ValidationConfig.MAX_FILENAME_LENGTH:
                return {'valid': False, 'error': 'Filename too long'}
            
            # Sanitize filename
            safe_filename = self.sanitize_filename(filename)
            
            # Check file extension
            file_ext = safe_filename.split('.')[-1].lower() if '.' in safe_filename else ''
            
            allowed_extensions = []
            for file_type, extensions in ValidationConfig.ALLOWED_FILE_TYPES.items():
                allowed_extensions.extend(extensions)
            
            if file_ext not in allowed_extensions:
                return {'valid': False, 'error': f'File type {file_ext} not allowed'}
            
            # Check file size
            if file_size > ValidationConfig.MAX_FILE_SIZE:
                return {'valid': False, 'error': 'File size too large'}
            
            # Validate content type
            expected_content_types = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                'png': 'image/png', 'gif': 'image/gif',
                'pdf': 'application/pdf', 'txt': 'text/plain',
                'mp4': 'video/mp4', 'mp3': 'audio/mpeg'
            }
            
            expected_type = expected_content_types.get(file_ext)
            if expected_type and content_type != expected_type:
                logger.warning(f"Content type mismatch: expected {expected_type}, got {content_type}")
            
            return {
                'valid': True,
                'safe_filename': safe_filename,
                'file_type': file_ext
            }
            
        except Exception as e:
            logger.error(f"File validation error: {e}")
            return {'valid': False, 'error': 'File validation failed'}
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for safe storage"""
        # Remove path traversal attempts
        filename = filename.replace('..', '').replace('/', '').replace('\\', '')
        
        # Remove dangerous characters
        filename = re.sub(r'[<>:"|?*]', '', filename)
        
        # Normalize unicode
        filename = unicodedata.normalize('NFKD', filename)
        
        # Remove non-ASCII characters
        filename = filename.encode('ascii', 'ignore').decode('ascii')
        
        # Limit length
        if len(filename) > ValidationConfig.MAX_FILENAME_LENGTH:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            max_name_length = ValidationConfig.MAX_FILENAME_LENGTH - len(ext) - 1
            filename = f"{name[:max_name_length]}.{ext}" if ext else name[:ValidationConfig.MAX_FILENAME_LENGTH]
        
        return filename.strip()
    
    def validate_whatsapp_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate WhatsApp message data"""
        try:
            errors = []
            
            # Validate required fields
            required_fields = ['to_number', 'content']
            for field in required_fields:
                if field not in message_data:
                    errors.append(f"Missing required field: {field}")
            
            if errors:
                return {'valid': False, 'errors': errors}
            
            # Validate phone number
            phone_validation = self.validate_phone_number(message_data['to_number'])
            if not phone_validation['valid']:
                errors.append(f"Invalid phone number: {phone_validation['error']}")
            
            # Validate message content
            content = message_data.get('content', '')
            if len(content) > ValidationConfig.MAX_MESSAGE_LENGTH:
                errors.append(f"Message too long (max {ValidationConfig.MAX_MESSAGE_LENGTH} characters)")
            
            # Check for injection attempts
            if self.detect_sql_injection(content):
                errors.append("Potential SQL injection detected")
            
            if self.detect_xss(content):
                errors.append("Potential XSS detected")
            
            if self.detect_command_injection(content):
                errors.append("Potential command injection detected")
            
            # Sanitize content
            sanitized_content = self.sanitize_string(content, ValidationConfig.MAX_MESSAGE_LENGTH)
            
            if errors:
                return {'valid': False, 'errors': errors}
            
            return {
                'valid': True,
                'sanitized_data': {
                    'to_number': phone_validation['formatted_number'],
                    'content': sanitized_content,
                    'message_type': message_data.get('message_type', 'text'),
                    'media_url': self.sanitize_string(message_data.get('media_url', '')) if message_data.get('media_url') else None
                }
            }
            
        except Exception as e:
            logger.error(f"WhatsApp message validation error: {e}")
            return {'valid': False, 'errors': ['Message validation failed']}
    
    def validate_json_input(self, data: Any, max_depth: int = 10) -> Dict[str, Any]:
        """Validate JSON input for structure and content"""
        try:
            # Check JSON depth to prevent DoS
            if isinstance(data, (dict, list)):
                if self._get_json_depth(data) > max_depth:
                    return {'valid': False, 'error': 'JSON structure too deep'}
            
            # Check for dangerous patterns in string values
            if isinstance(data, str):
                if self.detect_sql_injection(data) or self.detect_xss(data) or self.detect_command_injection(data):
                    return {'valid': False, 'error': 'Dangerous content detected'}
            
            elif isinstance(data, dict):
                for key, value in data.items():
                    key_validation = self.validate_json_input(key, max_depth - 1)
                    if not key_validation.get('valid', True):
                        return key_validation
                    
                    value_validation = self.validate_json_input(value, max_depth - 1)
                    if not value_validation.get('valid', True):
                        return value_validation
            
            elif isinstance(data, list):
                for item in data:
                    item_validation = self.validate_json_input(item, max_depth - 1)
                    if not item_validation.get('valid', True):
                        return item_validation
            
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"JSON validation error: {e}")
            return {'valid': False, 'error': 'JSON validation failed'}
    
    def _get_json_depth(self, obj: Any, current_depth: int = 0) -> int:
        """Calculate JSON object depth"""
        if isinstance(obj, dict):
            return max([self._get_json_depth(value, current_depth + 1) for value in obj.values()], default=current_depth)
        elif isinstance(obj, list):
            return max([self._get_json_depth(item, current_depth + 1) for item in obj], default=current_depth)
        else:
            return current_depth

# Global sanitizer instance
input_sanitizer = InputSanitizer()

def validate_request_data(schema: Dict[str, Any]):
    """Decorator to validate request data against schema"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get request data
                if request.is_json:
                    data = request.get_json()
                else:
                    data = request.form.to_dict()
                
                if not data:
                    return jsonify({'error': 'Request data required'}), 400
                
                # Validate JSON structure
                json_validation = input_sanitizer.validate_json_input(data)
                if not json_validation['valid']:
                    return jsonify({'error': json_validation['error']}), 400
                
                # Validate against schema
                validation_result = validate_data_schema(data, schema)
                if not validation_result['valid']:
                    return jsonify({
                        'error': 'Validation failed',
                        'details': validation_result['errors']
                    }), 400
                
                # Store validated data in request context
                request.validated_data = validation_result['data']
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Request validation error: {e}")
                return jsonify({'error': 'Request validation failed'}), 400
        
        return decorated_function
    return decorator

def validate_data_schema(data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
    """Validate data against a schema definition"""
    try:
        errors = []
        validated_data = {}
        
        # Check required fields
        required_fields = schema.get('required', [])
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
        
        # Validate each field
        fields = schema.get('fields', {})
        for field_name, field_config in fields.items():
            if field_name in data:
                field_value = data[field_name]
                field_validation = validate_field(field_value, field_config)
                
                if not field_validation['valid']:
                    errors.extend([f"{field_name}: {error}" for error in field_validation['errors']])
                else:
                    validated_data[field_name] = field_validation['value']
        
        if errors:
            return {'valid': False, 'errors': errors}
        
        return {'valid': True, 'data': validated_data}
        
    except Exception as e:
        logger.error(f"Schema validation error: {e}")
        return {'valid': False, 'errors': ['Schema validation failed']}

def validate_field(value: Any, config: Dict[str, Any]) -> Dict[str, Any]:
    """Validate individual field value"""
    try:
        errors = []
        field_type = config.get('type', 'string')
        
        # Type validation
        if field_type == 'string':
            if not isinstance(value, str):
                value = str(value)
            
            # Length validation
            min_length = config.get('min_length', 0)
            max_length = config.get('max_length', ValidationConfig.MAX_STRING_LENGTH)
            
            if len(value) < min_length:
                errors.append(f"Minimum length is {min_length}")
            
            if len(value) > max_length:
                errors.append(f"Maximum length is {max_length}")
            
            # Pattern validation
            pattern = config.get('pattern')
            if pattern and not re.match(pattern, value):
                errors.append(f"Does not match required pattern")
            
            # Sanitize
            value = input_sanitizer.sanitize_string(value, max_length)
            
        elif field_type == 'email':
            email_validation = input_sanitizer.validate_email(value)
            if not email_validation['valid']:
                errors.append(email_validation['error'])
            else:
                value = email_validation['normalized_email']
        
        elif field_type == 'phone':
            phone_validation = input_sanitizer.validate_phone_number(value)
            if not phone_validation['valid']:
                errors.append(phone_validation['error'])
            else:
                value = phone_validation['formatted_number']
        
        elif field_type == 'integer':
            try:
                value = int(value)
                min_value = config.get('min_value')
                max_value = config.get('max_value')
                
                if min_value is not None and value < min_value:
                    errors.append(f"Minimum value is {min_value}")
                
                if max_value is not None and value > max_value:
                    errors.append(f"Maximum value is {max_value}")
                    
            except (ValueError, TypeError):
                errors.append("Must be a valid integer")
        
        elif field_type == 'boolean':
            if isinstance(value, str):
                value = value.lower() in ('true', '1', 'yes', 'on')
            else:
                value = bool(value)
        
        elif field_type == 'datetime':
            if isinstance(value, str):
                try:
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    errors.append("Invalid datetime format")
            elif not isinstance(value, datetime):
                errors.append("Must be a valid datetime")
        
        if errors:
            return {'valid': False, 'errors': errors}
        
        return {'valid': True, 'value': value}
        
    except Exception as e:
        logger.error(f"Field validation error: {e}")
        return {'valid': False, 'errors': ['Field validation failed']}

# Common validation schemas
WHATSAPP_MESSAGE_SCHEMA = {
    'required': ['to_number', 'content'],
    'fields': {
        'to_number': {'type': 'phone'},
        'content': {'type': 'string', 'max_length': ValidationConfig.MAX_MESSAGE_LENGTH},
        'message_type': {'type': 'string', 'pattern': r'^(text|image|document|audio|video)$'},
        'media_url': {'type': 'string', 'max_length': 500}
    }
}

USER_REGISTRATION_SCHEMA = {
    'required': ['username', 'email', 'password'],
    'fields': {
        'username': {'type': 'string', 'min_length': 3, 'max_length': ValidationConfig.MAX_USERNAME_LENGTH, 'pattern': r'^[a-zA-Z0-9_-]+$'},
        'email': {'type': 'email'},
        'password': {'type': 'string', 'min_length': 12},
        'roles': {'type': 'string'}  # Simplified for this example
    }
}

FILE_UPLOAD_SCHEMA = {
    'required': ['filename'],
    'fields': {
        'filename': {'type': 'string', 'max_length': ValidationConfig.MAX_FILENAME_LENGTH},
        'content_type': {'type': 'string', 'max_length': 100},
        'size': {'type': 'integer', 'min_value': 1, 'max_value': ValidationConfig.MAX_FILE_SIZE}
    }
}