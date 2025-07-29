"""
Authentication and Authorization middleware for SPR system
Implements JWT-based authentication with role-based access control
"""

import jwt
import bcrypt
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from functools import wraps
from flask import request, jsonify, current_app, g
from dataclasses import dataclass
import hashlib
import os
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

@dataclass
class User:
    """User model with security features"""
    id: str
    username: str
    email: str
    password_hash: str
    roles: List[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    password_changed_at: datetime = datetime.now()
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None

class SecurityConfig:
    """Security configuration constants"""
    
    # JWT Configuration
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    
    # Password Policy
    MIN_PASSWORD_LENGTH = 12
    MAX_PASSWORD_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL_CHARS = True
    
    # Account Lockout
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=30)
    
    # Rate Limiting
    MAX_REQUESTS_PER_MINUTE = 60
    MAX_AUTH_REQUESTS_PER_MINUTE = 10
    
    # Session Management
    SESSION_TIMEOUT = timedelta(hours=8)
    CONCURRENT_SESSIONS_LIMIT = 3

class RolePermissions:
    """Define role-based permissions"""
    
    ROLES = {
        'admin': {
            'permissions': [
                'read:all', 'write:all', 'delete:all',
                'manage:users', 'manage:system', 'manage:security'
            ],
            'description': 'Full system access'
        },
        'manager': {
            'permissions': [
                'read:all', 'write:commodities', 'write:reports',
                'read:analytics', 'manage:whatsapp'
            ],
            'description': 'Management access to commodities and reports'
        },
        'operator': {
            'permissions': [
                'read:commodities', 'read:prices', 'write:whatsapp',
                'read:contacts', 'send:messages'
            ],
            'description': 'Operator access for daily operations'
        },
        'viewer': {
            'permissions': [
                'read:commodities', 'read:prices', 'read:basic_reports'
            ],
            'description': 'Read-only access to basic information'
        },
        'api_client': {
            'permissions': [
                'read:api_data', 'write:api_data'
            ],
            'description': 'API access for external integrations'
        }
    }

class AuthenticationService:
    """Service for handling authentication operations"""
    
    def __init__(self):
        self.users = {}  # In production, use proper database
        self.active_sessions = {}
        self.blacklisted_tokens = set()
        self.rate_limit_tracker = {}
        
        # Initialize encryption
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for sensitive data"""
        key_file = '/app/security/encryption.key'
        
        try:
            if os.path.exists(key_file):
                with open(key_file, 'rb') as f:
                    return f.read()
            else:
                # Create new key
                key = Fernet.generate_key()
                os.makedirs(os.path.dirname(key_file), exist_ok=True)
                with open(key_file, 'wb') as f:
                    f.write(key)
                # Set restrictive permissions
                os.chmod(key_file, 0o600)
                return key
        except Exception as e:
            logger.error(f"Error handling encryption key: {e}")
            # Fallback to environment variable
            key = os.getenv('ENCRYPTION_KEY')
            if key:
                return key.encode()
            else:
                return Fernet.generate_key()
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt with salt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def validate_password_policy(self, password: str) -> Dict[str, any]:
        """Validate password against security policy"""
        errors = []
        
        if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters long")
        
        if len(password) > SecurityConfig.MAX_PASSWORD_LENGTH:
            errors.append(f"Password must be no more than {SecurityConfig.MAX_PASSWORD_LENGTH} characters long")
        
        if SecurityConfig.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if SecurityConfig.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if SecurityConfig.REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if SecurityConfig.REQUIRE_SPECIAL_CHARS and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        # Check for common weak passwords
        weak_patterns = ['password', '123456', 'qwerty', 'admin', 'root']
        if any(pattern in password.lower() for pattern in weak_patterns):
            errors.append("Password contains common weak patterns")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def generate_tokens(self, user: User) -> Dict[str, str]:
        """Generate JWT access and refresh tokens"""
        try:
            now = datetime.utcnow()
            
            # Access token payload
            access_payload = {
                'user_id': user.id,
                'username': user.username,
                'roles': user.roles,
                'permissions': self._get_user_permissions(user.roles),
                'iat': now,
                'exp': now + SecurityConfig.JWT_ACCESS_TOKEN_EXPIRES,
                'type': 'access'
            }
            
            # Refresh token payload
            refresh_payload = {
                'user_id': user.id,
                'iat': now,
                'exp': now + SecurityConfig.JWT_REFRESH_TOKEN_EXPIRES,
                'type': 'refresh'
            }
            
            access_token = jwt.encode(
                access_payload,
                current_app.config['JWT_SECRET_KEY'],
                algorithm=SecurityConfig.JWT_ALGORITHM
            )
            
            refresh_token = jwt.encode(
                refresh_payload,
                current_app.config['JWT_SECRET_KEY'],
                algorithm=SecurityConfig.JWT_ALGORITHM
            )
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': int(SecurityConfig.JWT_ACCESS_TOKEN_EXPIRES.total_seconds())
            }
            
        except Exception as e:
            logger.error(f"Error generating tokens: {e}")
            raise
    
    def _get_user_permissions(self, roles: List[str]) -> List[str]:
        """Get all permissions for user roles"""
        permissions = set()
        for role in roles:
            if role in RolePermissions.ROLES:
                permissions.update(RolePermissions.ROLES[role]['permissions'])
        return list(permissions)
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            # Check if token is blacklisted
            if token in self.blacklisted_tokens:
                return None
            
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[SecurityConfig.JWT_ALGORITHM]
            )
            
            # Check token type
            if payload.get('type') not in ['access', 'refresh']:
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return None
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None
    
    def blacklist_token(self, token: str):
        """Add token to blacklist"""
        self.blacklisted_tokens.add(token)
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user with username and password"""
        try:
            # Rate limiting check
            if not self._check_rate_limit(username, 'auth'):
                return {
                    'success': False,
                    'error': 'Too many authentication attempts. Please try again later.'
                }
            
            user = self.users.get(username)
            if not user:
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }
            
            # Check if account is locked
            if user.locked_until and datetime.now() < user.locked_until:
                return {
                    'success': False,
                    'error': f'Account locked until {user.locked_until.strftime("%Y-%m-%d %H:%M:%S")}'
                }
            
            # Check if user is active
            if not user.is_active:
                return {
                    'success': False,
                    'error': 'Account is deactivated'
                }
            
            # Verify password
            if not self.verify_password(password, user.password_hash):
                user.failed_login_attempts += 1
                
                # Lock account if too many failed attempts
                if user.failed_login_attempts >= SecurityConfig.MAX_LOGIN_ATTEMPTS:
                    user.locked_until = datetime.now() + SecurityConfig.LOCKOUT_DURATION
                    logger.warning(f"Account locked for user {username} due to failed login attempts")
                
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }
            
            # Reset failed attempts on successful login
            user.failed_login_attempts = 0
            user.locked_until = None
            user.last_login = datetime.now()
            
            # Generate tokens
            tokens = self.generate_tokens(user)
            
            # Track active session
            session_id = secrets.token_urlsafe(32)
            self.active_sessions[session_id] = {
                'user_id': user.id,
                'username': user.username,
                'created_at': datetime.now(),
                'last_activity': datetime.now(),
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', '')
            }
            
            logger.info(f"User {username} authenticated successfully")
            
            return {
                'success': True,
                'tokens': tokens,
                'session_id': session_id,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'roles': user.roles,
                    'permissions': self._get_user_permissions(user.roles)
                }
            }
            
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return {
                'success': False,
                'error': 'Authentication failed'
            }
    
    def _check_rate_limit(self, identifier: str, request_type: str) -> bool:
        """Check rate limiting for requests"""
        now = datetime.now()
        window = timedelta(minutes=1)
        
        # Clean old entries
        cutoff = now - window
        if identifier in self.rate_limit_tracker:
            self.rate_limit_tracker[identifier] = [
                timestamp for timestamp in self.rate_limit_tracker[identifier]
                if timestamp > cutoff
            ]
        else:
            self.rate_limit_tracker[identifier] = []
        
        # Check limits
        current_requests = len(self.rate_limit_tracker[identifier])
        
        if request_type == 'auth':
            limit = SecurityConfig.MAX_AUTH_REQUESTS_PER_MINUTE
        else:
            limit = SecurityConfig.MAX_REQUESTS_PER_MINUTE
        
        if current_requests >= limit:
            return False
        
        # Add current request
        self.rate_limit_tracker[identifier].append(now)
        return True
    
    def create_user(self, username: str, email: str, password: str, roles: List[str]) -> Dict:
        """Create new user with security validations"""
        try:
            # Validate password
            password_validation = self.validate_password_policy(password)
            if not password_validation['valid']:
                return {
                    'success': False,
                    'errors': password_validation['errors']
                }
            
            # Check if user already exists
            if username in self.users:
                return {
                    'success': False,
                    'error': 'Username already exists'
                }
            
            # Validate roles
            invalid_roles = [role for role in roles if role not in RolePermissions.ROLES]
            if invalid_roles:
                return {
                    'success': False,
                    'error': f'Invalid roles: {invalid_roles}'
                }
            
            # Create user
            user_id = secrets.token_urlsafe(16)
            password_hash = self.hash_password(password)
            
            user = User(
                id=user_id,
                username=username,
                email=email,
                password_hash=password_hash,
                roles=roles,
                is_active=True,
                created_at=datetime.now()
            )
            
            self.users[username] = user
            
            logger.info(f"User {username} created successfully")
            
            return {
                'success': True,
                'user_id': user_id
            }
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return {
                'success': False,
                'error': 'Failed to create user'
            }

# Global authentication service instance
auth_service = AuthenticationService()

def requires_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Access token required'}), 401
        
        # Verify token
        payload = auth_service.verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Set current user in request context
        g.current_user = payload
        
        return f(*args, **kwargs)
    
    return decorated_function

def requires_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(f):
        @wraps(f)
        @requires_auth
        def decorated_function(*args, **kwargs):
            user_permissions = g.current_user.get('permissions', [])
            
            # Check for wildcard permissions
            if 'read:all' in user_permissions or 'write:all' in user_permissions:
                return f(*args, **kwargs)
            
            if permission not in user_permissions:
                return jsonify({'error': f'Permission required: {permission}'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def requires_role(role: str):
    """Decorator to require specific role"""
    def decorator(f):
        @wraps(f)
        @requires_auth
        def decorated_function(*args, **kwargs):
            user_roles = g.current_user.get('roles', [])
            
            if role not in user_roles and 'admin' not in user_roles:
                return jsonify({'error': f'Role required: {role}'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator