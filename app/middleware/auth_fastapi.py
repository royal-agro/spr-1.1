"""
FastAPI Authentication and Authorization middleware for SPR system
Implements JWT-based authentication with role-based access control
"""

import jwt
import bcrypt
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from functools import wraps
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dataclasses import dataclass
import hashlib
import os

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
    
    # Account Security
    MAX_LOGIN_ATTEMPTS = 5
    ACCOUNT_LOCKOUT_DURATION = timedelta(minutes=30)
    
    # Session Security
    SESSION_TIMEOUT = timedelta(hours=8)
    IDLE_TIMEOUT = timedelta(minutes=30)

class AuthenticationService:
    """Centralized authentication service"""
    
    def __init__(self):
        self.jwt_secret = os.getenv('JWT_SECRET', 'dev-jwt-secret-key-for-development-only-32-chars-minimum')
        self.users_db = self._initialize_default_users()
        
    def _initialize_default_users(self) -> Dict[str, User]:
        """Initialize default users for development"""
        return {
            'admin': User(
                id='admin-001',
                username='admin',
                email='admin@spr.com',
                password_hash=self._hash_password('admin123456'),
                roles=['admin', 'manager', 'operator'],
                is_active=True,
                created_at=datetime.now()
            ),
            'manager': User(
                id='manager-001', 
                username='manager',
                email='manager@spr.com',
                password_hash=self._hash_password('manager123456'),
                roles=['manager', 'operator'],
                is_active=True,
                created_at=datetime.now()
            ),
            'operator': User(
                id='operator-001',
                username='operator', 
                email='operator@spr.com',
                password_hash=self._hash_password('operator123456'),
                roles=['operator'],
                is_active=True,
                created_at=datetime.now()
            )
        }
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def authenticate_user(self, username: str, password: str) -> Dict:
        """Authenticate user credentials"""
        try:
            user = self.users_db.get(username)
            if not user:
                return {'success': False, 'error': 'Invalid credentials'}
            
            if not user.is_active:
                return {'success': False, 'error': 'Account is disabled'}
            
            if not self._verify_password(password, user.password_hash):
                return {'success': False, 'error': 'Invalid credentials'}
            
            # Generate JWT token
            token = self._generate_token(user)
            
            return {
                'success': True,
                'token': token,
                'user': {
                    'username': user.username,
                    'roles': user.roles,
                    'permissions': self._get_user_permissions(user.roles)
                }
            }
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return {'success': False, 'error': 'Authentication failed'}
    
    def _generate_token(self, user: User) -> str:
        """Generate JWT token for user"""
        import time
        now_timestamp = int(time.time())
        payload = {
            'user_id': user.id,
            'username': user.username,
            'roles': user.roles,
            'permissions': self._get_user_permissions(user.roles),
            'exp': now_timestamp + int(SecurityConfig.JWT_ACCESS_TOKEN_EXPIRES.total_seconds())
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=SecurityConfig.JWT_ALGORITHM)
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=[SecurityConfig.JWT_ALGORITHM]
            )
            
            # Check if token is expired
            import time
            exp = payload.get('exp')
            if exp and time.time() > exp:
                return None
                
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def _get_user_permissions(self, roles: List[str]) -> List[str]:
        """Get permissions based on user roles"""
        permissions = set()
        
        role_permissions = {
            'admin': [
                'read:all', 'write:all', 'delete:all',
                'admin:users', 'admin:system', 'admin:security',
                'write:whatsapp', 'read:whatsapp', 'send:messages',
                'create:broadcast', 'approve:broadcast', 'edit:broadcast'
            ],
            'manager': [
                'read:all', 'write:reports', 'write:analysis',
                'write:whatsapp', 'read:whatsapp', 'send:messages',
                'create:broadcast', 'approve:broadcast'
            ],
            'operator': [
                'read:reports', 'read:analysis', 'write:basic',
                'read:whatsapp', 'send:messages',
                'create:broadcast'
            ],
            'viewer': [
                'read:reports', 'read:analysis'
            ]
        }
        
        for role in roles:
            if role in role_permissions:
                permissions.update(role_permissions[role])
        
        return list(permissions)

# Global auth service instance
auth_service = AuthenticationService()

# FastAPI security scheme
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """FastAPI dependency to get current authenticated user"""
    try:
        print(f"DEBUG: Token recebido: {credentials.credentials[:30]}...")
        payload = auth_service.verify_token(credentials.credentials)
        print(f"DEBUG: Payload retornado: {payload}")
        if not payload:
            print("DEBUG: Payload vazio, token inválido")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        print(f"DEBUG: Usuário autenticado: {payload.get('username')}")
        return payload
    except Exception as e:
        print(f"DEBUG: Erro na autenticação: {e}")
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

def requires_auth(func):
    """Decorator that requires authentication"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # In FastAPI, authentication is handled by dependencies
        return await func(*args, **kwargs)
    return wrapper

def requires_permission(permission: str):
    """Decorator that requires specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs (should be injected by FastAPI dependency)
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            user_permissions = current_user.get('permissions', [])
            if permission not in user_permissions and 'write:all' not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def requires_role(role: str):
    """Decorator that requires specific role"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            user_roles = current_user.get('roles', [])
            if role not in user_roles and 'admin' not in user_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient role permissions"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator