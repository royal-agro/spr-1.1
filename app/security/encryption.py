"""
Advanced encryption and secure key management for SPR system
Implements field-level encryption, secure key rotation, and data protection
"""

import os
import json
import base64
import secrets
import logging
from typing import Dict, Any, Optional, Union, List
from datetime import datetime, timedelta
from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import hashlib
import hmac
from pathlib import Path

logger = logging.getLogger(__name__)

class EncryptionConfig:
    """Configuration for encryption settings"""
    
    # Key derivation settings
    PBKDF2_ITERATIONS = 100000
    SALT_LENGTH = 32
    
    # Key rotation settings
    KEY_ROTATION_INTERVAL = timedelta(days=90)  # 90 days
    MAX_KEY_AGE = timedelta(days=365)  # 1 year
    
    # Encryption algorithms
    SYMMETRIC_ALGORITHM = 'AES-256-GCM'
    ASYMMETRIC_KEY_SIZE = 2048
    
    # Key storage
    KEY_STORE_PATH = '/app/security/keys'
    BACKUP_KEY_STORE_PATH = '/app/security/keys_backup'
    
    # Field encryption settings
    ENCRYPTED_FIELDS = [
        'password_hash',
        'mfa_secret',
        'whatsapp_access_token',
        'encryption_key',
        'webhook_secret',
        'jwt_secret',
        'database_password',
        'smtp_password',
        'api_keys'
    ]

class KeyManager:
    """Secure key management with rotation and backup"""
    
    def __init__(self):
        self.key_store_path = Path(EncryptionConfig.KEY_STORE_PATH)
        self.backup_path = Path(EncryptionConfig.BACKUP_KEY_STORE_PATH)
        self.master_key = None
        self.current_keys = {}
        self.key_history = {}
        
        # Ensure directories exist
        self.key_store_path.mkdir(parents=True, exist_ok=True)
        self.backup_path.mkdir(parents=True, exist_ok=True)
        
        # Set restrictive permissions
        os.chmod(self.key_store_path, 0o700)
        os.chmod(self.backup_path, 0o700)
        
        # Initialize master key
        self._initialize_master_key()
    
    def _initialize_master_key(self):
        """Initialize or load master key"""
        try:
            master_key_file = self.key_store_path / 'master.key'
            
            if master_key_file.exists():
                # Load existing master key
                with open(master_key_file, 'rb') as f:
                    encrypted_master = f.read()
                
                # Derive key from environment variable or prompt
                password = os.getenv('MASTER_KEY_PASSWORD')
                if not password:
                    logger.error("Master key password not found in environment")
                    raise ValueError("Master key password required")
                
                self.master_key = self._derive_key_from_password(password, b'master_salt')
                
                # Verify master key by attempting to decrypt
                try:
                    cipher_suite = Fernet(self.master_key)
                    cipher_suite.decrypt(encrypted_master)
                    logger.info("Master key loaded successfully")
                except Exception:
                    logger.error("Failed to decrypt master key - invalid password")
                    raise ValueError("Invalid master key password")
            
            else:
                # Generate new master key
                self.master_key = Fernet.generate_key()
                password = os.getenv('MASTER_KEY_PASSWORD')
                
                if not password:
                    # Generate secure password
                    password = secrets.token_urlsafe(32)
                    logger.warning(f"Generated master key password: {password}")
                    logger.warning("Store this password securely - it's required to decrypt data")
                
                # Encrypt master key with password
                password_key = self._derive_key_from_password(password, b'master_salt')
                cipher_suite = Fernet(password_key)
                encrypted_master = cipher_suite.encrypt(self.master_key)
                
                # Save encrypted master key
                with open(master_key_file, 'wb') as f:
                    f.write(encrypted_master)
                
                os.chmod(master_key_file, 0o600)
                logger.info("New master key generated and saved")
                
        except Exception as e:
            logger.error(f"Error initializing master key: {e}")
            raise
    
    def _derive_key_from_password(self, password: str, salt: bytes) -> bytes:
        """Derive encryption key from password using PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=EncryptionConfig.PBKDF2_ITERATIONS,
            backend=default_backend()
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    
    def generate_data_key(self, purpose: str) -> bytes:
        """Generate new data encryption key"""
        try:
            # Generate new Fernet key
            data_key = Fernet.generate_key()
            
            # Encrypt with master key
            master_cipher = Fernet(self.master_key)
            encrypted_data_key = master_cipher.encrypt(data_key)
            
            # Store key with metadata
            key_metadata = {
                'purpose': purpose,
                'created_at': datetime.now().isoformat(),
                'key_id': secrets.token_urlsafe(16),
                'encrypted_key': base64.b64encode(encrypted_data_key).decode()
            }
            
            key_file = self.key_store_path / f"{purpose}_{key_metadata['key_id']}.json"
            with open(key_file, 'w') as f:
                json.dump(key_metadata, f)
            
            os.chmod(key_file, 0o600)
            
            # Store in current keys
            self.current_keys[purpose] = {
                'key': data_key,
                'metadata': key_metadata
            }
            
            logger.info(f"Generated new data key for purpose: {purpose}")
            return data_key
            
        except Exception as e:
            logger.error(f"Error generating data key: {e}")
            raise
    
    def get_data_key(self, purpose: str) -> bytes:
        """Get current data key for purpose"""
        try:
            # Check if key is already loaded
            if purpose in self.current_keys:
                key_data = self.current_keys[purpose]
                
                # Check if key needs rotation
                created_at = datetime.fromisoformat(key_data['metadata']['created_at'])
                if datetime.now() - created_at > EncryptionConfig.KEY_ROTATION_INTERVAL:
                    logger.info(f"Key rotation needed for purpose: {purpose}")
                    return self.rotate_key(purpose)
                
                return key_data['key']
            
            # Load key from storage
            key_files = list(self.key_store_path.glob(f"{purpose}_*.json"))
            if not key_files:
                # Generate new key if none exists
                return self.generate_data_key(purpose)
            
            # Load the most recent key
            latest_key_file = max(key_files, key=lambda f: f.stat().st_mtime)
            
            with open(latest_key_file, 'r') as f:
                key_metadata = json.load(f)
            
            # Decrypt data key
            encrypted_key = base64.b64decode(key_metadata['encrypted_key'])
            master_cipher = Fernet(self.master_key)
            data_key = master_cipher.decrypt(encrypted_key)
            
            # Store in current keys
            self.current_keys[purpose] = {
                'key': data_key,
                'metadata': key_metadata
            }
            
            # Check if key needs rotation
            created_at = datetime.fromisoformat(key_metadata['created_at'])
            if datetime.now() - created_at > EncryptionConfig.KEY_ROTATION_INTERVAL:
                logger.info(f"Key rotation needed for purpose: {purpose}")
                return self.rotate_key(purpose)
            
            return data_key
            
        except Exception as e:
            logger.error(f"Error getting data key for {purpose}: {e}")
            raise
    
    def rotate_key(self, purpose: str) -> bytes:
        """Rotate encryption key for purpose"""
        try:
            # Archive old key
            if purpose in self.current_keys:
                old_key_data = self.current_keys[purpose]
                
                # Move to history
                if purpose not in self.key_history:
                    self.key_history[purpose] = []
                
                self.key_history[purpose].append(old_key_data)
                
                # Keep only recent keys in history
                cutoff = datetime.now() - EncryptionConfig.MAX_KEY_AGE
                self.key_history[purpose] = [
                    key_data for key_data in self.key_history[purpose]
                    if datetime.fromisoformat(key_data['metadata']['created_at']) > cutoff
                ]
            
            # Generate new key
            new_key = self.generate_data_key(purpose)
            
            logger.info(f"Key rotated successfully for purpose: {purpose}")
            return new_key
            
        except Exception as e:
            logger.error(f"Error rotating key for {purpose}: {e}")
            raise
    
    def get_key_history(self, purpose: str) -> List[bytes]:
        """Get historical keys for decryption of old data"""
        try:
            keys = []
            
            # Add current key
            if purpose in self.current_keys:
                keys.append(self.current_keys[purpose]['key'])
            
            # Add historical keys
            if purpose in self.key_history:
                for key_data in self.key_history[purpose]:
                    keys.append(key_data['key'])
            
            # Load keys from storage
            key_files = list(self.key_store_path.glob(f"{purpose}_*.json"))
            
            for key_file in key_files:
                try:
                    with open(key_file, 'r') as f:
                        key_metadata = json.load(f)
                    
                    encrypted_key = base64.b64decode(key_metadata['encrypted_key'])
                    master_cipher = Fernet(self.master_key)
                    data_key = master_cipher.decrypt(encrypted_key)
                    
                    if data_key not in keys:
                        keys.append(data_key)
                        
                except Exception as e:
                    logger.warning(f"Could not load key from {key_file}: {e}")
            
            return keys
            
        except Exception as e:
            logger.error(f"Error getting key history for {purpose}: {e}")
            return []
    
    def backup_keys(self):
        """Create backup of all keys"""
        try:
            import shutil
            
            backup_dir = self.backup_path / datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_dir.mkdir(exist_ok=True)
            
            # Copy all key files
            for key_file in self.key_store_path.glob('*.json'):
                shutil.copy2(key_file, backup_dir)
            
            # Copy master key
            master_key_file = self.key_store_path / 'master.key'
            if master_key_file.exists():
                shutil.copy2(master_key_file, backup_dir)
            
            os.chmod(backup_dir, 0o700)
            
            logger.info(f"Keys backed up to {backup_dir}")
            
        except Exception as e:
            logger.error(f"Error backing up keys: {e}")
            raise

class FieldEncryption:
    """Field-level encryption service"""
    
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager
        self.encrypted_fields = set(EncryptionConfig.ENCRYPTED_FIELDS)
    
    def encrypt_field(self, field_name: str, value: str, context: str = 'default') -> str:
        """Encrypt a single field value"""
        try:
            if not value:
                return value
            
            # Get encryption key for this context
            encryption_key = self.key_manager.get_data_key(f"field_{context}")
            cipher_suite = Fernet(encryption_key)
            
            # Encrypt value
            encrypted_value = cipher_suite.encrypt(value.encode('utf-8'))
            
            # Encode for storage
            encoded_value = base64.b64encode(encrypted_value).decode('ascii')
            
            # Add encryption metadata
            metadata = {
                'encrypted': True,
                'field': field_name,
                'context': context,
                'timestamp': datetime.now().isoformat()
            }
            
            result = {
                'data': encoded_value,
                'metadata': metadata
            }
            
            return json.dumps(result)
            
        except Exception as e:
            logger.error(f"Error encrypting field {field_name}: {e}")
            raise
    
    def decrypt_field(self, field_name: str, encrypted_value: str, context: str = 'default') -> str:
        """Decrypt a single field value"""
        try:
            if not encrypted_value:
                return encrypted_value
            
            # Check if value is encrypted
            try:
                data = json.loads(encrypted_value)
                if not data.get('metadata', {}).get('encrypted'):
                    return encrypted_value  # Not encrypted
            except (json.JSONDecodeError, TypeError):
                return encrypted_value  # Not encrypted
            
            # Extract encrypted data
            encoded_value = data['data']
            encrypted_bytes = base64.b64decode(encoded_value)
            
            # Get all possible keys (for key rotation support)
            possible_keys = self.key_manager.get_key_history(f"field_{context}")
            
            # Try decryption with each key
            for key in possible_keys:
                try:
                    cipher_suite = Fernet(key)
                    decrypted_bytes = cipher_suite.decrypt(encrypted_bytes)
                    return decrypted_bytes.decode('utf-8')
                except Exception:
                    continue
            
            logger.error(f"Could not decrypt field {field_name} with any available key")
            raise ValueError("Decryption failed")
            
        except Exception as e:
            logger.error(f"Error decrypting field {field_name}: {e}")
            raise
    
    def encrypt_object(self, obj: Dict[str, Any], context: str = 'default') -> Dict[str, Any]:
        """Encrypt specified fields in an object"""
        try:
            result = obj.copy()
            
            for field_name, value in obj.items():
                if field_name in self.encrypted_fields and isinstance(value, str):
                    result[field_name] = self.encrypt_field(field_name, value, context)
            
            return result
            
        except Exception as e:
            logger.error(f"Error encrypting object: {e}")
            raise
    
    def decrypt_object(self, obj: Dict[str, Any], context: str = 'default') -> Dict[str, Any]:
        """Decrypt specified fields in an object"""
        try:
            result = obj.copy()
            
            for field_name, value in obj.items():
                if field_name in self.encrypted_fields and isinstance(value, str):
                    result[field_name] = self.decrypt_field(field_name, value, context)
            
            return result
            
        except Exception as e:
            logger.error(f"Error decrypting object: {e}")
            raise

class SecureStorage:
    """Secure storage service with encryption"""
    
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager
        self.field_encryption = FieldEncryption(key_manager)
    
    def store_sensitive_data(self, data: Dict[str, Any], storage_id: str) -> str:
        """Store sensitive data with encryption"""
        try:
            # Encrypt sensitive fields
            encrypted_data = self.field_encryption.encrypt_object(data, storage_id)
            
            # Add storage metadata
            storage_metadata = {
                'storage_id': storage_id,
                'created_at': datetime.now().isoformat(),
                'data_hash': self._calculate_hash(json.dumps(data, sort_keys=True)),
                'encrypted': True
            }
            
            storage_package = {
                'metadata': storage_metadata,
                'data': encrypted_data
            }
            
            # Encrypt entire package
            package_key = self.key_manager.get_data_key(f"storage_{storage_id}")
            cipher_suite = Fernet(package_key)
            
            serialized_package = json.dumps(storage_package).encode('utf-8')
            encrypted_package = cipher_suite.encrypt(serialized_package)
            
            return base64.b64encode(encrypted_package).decode('ascii')
            
        except Exception as e:
            logger.error(f"Error storing sensitive data: {e}")
            raise
    
    def retrieve_sensitive_data(self, encrypted_storage: str, storage_id: str) -> Dict[str, Any]:
        """Retrieve and decrypt sensitive data"""
        try:
            # Decode storage package
            encrypted_package = base64.b64decode(encrypted_storage)
            
            # Get all possible keys for decryption
            possible_keys = self.key_manager.get_key_history(f"storage_{storage_id}")
            
            # Try decryption with each key
            storage_package = None
            for key in possible_keys:
                try:
                    cipher_suite = Fernet(key)
                    decrypted_package = cipher_suite.decrypt(encrypted_package)
                    storage_package = json.loads(decrypted_package.decode('utf-8'))
                    break
                except Exception:
                    continue
            
            if not storage_package:
                raise ValueError("Could not decrypt storage package")
            
            # Extract and decrypt data
            encrypted_data = storage_package['data']
            decrypted_data = self.field_encryption.decrypt_object(encrypted_data, storage_id)
            
            # Verify data integrity
            metadata = storage_package['metadata']
            expected_hash = metadata.get('data_hash')
            if expected_hash:
                actual_hash = self._calculate_hash(json.dumps(decrypted_data, sort_keys=True))
                if actual_hash != expected_hash:
                    logger.warning("Data integrity check failed")
            
            return decrypted_data
            
        except Exception as e:
            logger.error(f"Error retrieving sensitive data: {e}")
            raise
    
    def _calculate_hash(self, data: str) -> str:
        """Calculate SHA-256 hash of data"""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

class AsymmetricEncryption:
    """Asymmetric encryption for key exchange and digital signatures"""
    
    def __init__(self):
        self.private_key = None
        self.public_key = None
        self._load_or_generate_keypair()
    
    def _load_or_generate_keypair(self):
        """Load existing keypair or generate new one"""
        try:
            key_path = Path(EncryptionConfig.KEY_STORE_PATH)
            private_key_file = key_path / 'private_key.pem'
            public_key_file = key_path / 'public_key.pem'
            
            if private_key_file.exists() and public_key_file.exists():
                # Load existing keys
                with open(private_key_file, 'rb') as f:
                    self.private_key = serialization.load_pem_private_key(
                        f.read(),
                        password=None,
                        backend=default_backend()
                    )
                
                with open(public_key_file, 'rb') as f:
                    self.public_key = serialization.load_pem_public_key(
                        f.read(),
                        backend=default_backend()
                    )
                
                logger.info("Loaded existing RSA keypair")
            
            else:
                # Generate new keypair
                self.private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=EncryptionConfig.ASYMMETRIC_KEY_SIZE,
                    backend=default_backend()
                )
                self.public_key = self.private_key.public_key()
                
                # Save keys
                private_pem = self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
                
                public_pem = self.public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                )
                
                with open(private_key_file, 'wb') as f:
                    f.write(private_pem)
                
                with open(public_key_file, 'wb') as f:
                    f.write(public_pem)
                
                os.chmod(private_key_file, 0o600)
                os.chmod(public_key_file, 0o644)
                
                logger.info("Generated new RSA keypair")
                
        except Exception as e:
            logger.error(f"Error with RSA keypair: {e}")
            raise
    
    def encrypt_with_public_key(self, data: bytes, public_key=None) -> bytes:
        """Encrypt data with public key"""
        try:
            key = public_key or self.public_key
            
            encrypted = key.encrypt(
                data,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            return encrypted
            
        except Exception as e:
            logger.error(f"Error encrypting with public key: {e}")
            raise
    
    def decrypt_with_private_key(self, encrypted_data: bytes) -> bytes:
        """Decrypt data with private key"""
        try:
            decrypted = self.private_key.decrypt(
                encrypted_data,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            return decrypted
            
        except Exception as e:
            logger.error(f"Error decrypting with private key: {e}")
            raise
    
    def sign_data(self, data: bytes) -> bytes:
        """Create digital signature"""
        try:
            signature = self.private_key.sign(
                data,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return signature
            
        except Exception as e:
            logger.error(f"Error signing data: {e}")
            raise
    
    def verify_signature(self, data: bytes, signature: bytes, public_key=None) -> bool:
        """Verify digital signature"""
        try:
            key = public_key or self.public_key
            
            key.verify(
                signature,
                data,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except Exception:
            return False

# Global instances
key_manager = KeyManager()
field_encryption = FieldEncryption(key_manager)
secure_storage = SecureStorage(key_manager)
asymmetric_encryption = AsymmetricEncryption()

def setup_encryption(app):
    """Initialize encryption for Flask app"""
    try:
        # Create security directory
        security_dir = Path('/app/security')
        security_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(security_dir, 0o700)
        
        # Set app configuration
        app.config['ENCRYPTION_ENABLED'] = True
        app.config['KEY_MANAGER'] = key_manager
        app.config['FIELD_ENCRYPTION'] = field_encryption
        app.config['SECURE_STORAGE'] = secure_storage
        
        logger.info("Encryption setup completed")
        
    except Exception as e:
        logger.error(f"Error setting up encryption: {e}")
        raise