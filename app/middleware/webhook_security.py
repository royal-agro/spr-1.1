"""
WhatsApp webhook signature verification and security middleware
Implements Meta's webhook signature verification for secure communication
"""

import hmac
import hashlib
import logging
import time
from typing import Dict, Optional, Any
from functools import wraps
from flask import request, jsonify, current_app
import json
import base64
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WebhookSecurityConfig:
    """Configuration for webhook security"""
    
    # Signature verification
    SIGNATURE_HEADER = 'X-Hub-Signature-256'
    SIGNATURE_PREFIX = 'sha256='
    
    # Timestamp verification (prevent replay attacks)
    TIMESTAMP_HEADER = 'X-Hub-Timestamp'
    MAX_TIMESTAMP_AGE = timedelta(minutes=5)  # 5 minutes tolerance
    
    # Rate limiting for webhooks
    MAX_WEBHOOK_REQUESTS_PER_MINUTE = 100
    
    # Allowed IP ranges for Meta/Facebook webhooks
    META_IP_RANGES = [
        '173.252.74.0/24',
        '173.252.75.0/24',
        '173.252.76.0/24',
        '173.252.77.0/24',
        '173.252.78.0/24',
        '173.252.79.0/24',
        '31.13.24.0/21',
        '31.13.64.0/18',
        '66.220.144.0/20',
        '69.63.176.0/20',
        '69.171.224.0/19',
        '74.119.76.0/22',
        '103.4.96.0/22',
        '129.134.0.0/17',
        '157.240.0.0/17',
        '173.252.64.0/18',
        '179.60.192.0/22',
        '185.60.216.0/22',
        '204.15.20.0/22'
    ]

class WebhookVerifier:
    """Service for verifying webhook signatures and security"""
    
    def __init__(self):
        self.webhook_tokens = {}  # Store webhook verify tokens
        self.rate_limit_tracker = {}
        
    def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """
        Verify WhatsApp webhook signature
        
        Args:
            payload: Raw request body as bytes
            signature: Signature from X-Hub-Signature-256 header
            secret: Webhook secret from Meta app settings
            
        Returns:
            bool: True if signature is valid
        """
        try:
            if not signature:
                logger.warning("Missing webhook signature")
                return False
            
            if not signature.startswith(WebhookSecurityConfig.SIGNATURE_PREFIX):
                logger.warning("Invalid signature format")
                return False
            
            # Extract signature hash
            signature_hash = signature[len(WebhookSecurityConfig.SIGNATURE_PREFIX):]
            
            # Calculate expected signature
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Use secure comparison to prevent timing attacks
            is_valid = hmac.compare_digest(signature_hash, expected_signature)
            
            if not is_valid:
                logger.warning(f"Invalid webhook signature. Expected: {expected_signature}, Got: {signature_hash}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False
    
    def verify_timestamp(self, timestamp_header: str) -> bool:
        """
        Verify webhook timestamp to prevent replay attacks
        
        Args:
            timestamp_header: Timestamp from X-Hub-Timestamp header
            
        Returns:
            bool: True if timestamp is within acceptable range
        """
        try:
            if not timestamp_header:
                logger.warning("Missing webhook timestamp")
                return False
            
            # Parse timestamp
            webhook_timestamp = datetime.fromtimestamp(int(timestamp_header))
            current_time = datetime.now()
            
            # Check if timestamp is within acceptable range
            time_diff = abs(current_time - webhook_timestamp)
            
            if time_diff > WebhookSecurityConfig.MAX_TIMESTAMP_AGE:
                logger.warning(f"Webhook timestamp too old: {time_diff}")
                return False
            
            return True
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Invalid webhook timestamp format: {e}")
            return False
        except Exception as e:
            logger.error(f"Error verifying timestamp: {e}")
            return False
    
    def verify_ip_address(self, ip_address: str) -> bool:
        """
        Verify if request comes from allowed IP ranges (Meta/Facebook)
        
        Args:
            ip_address: Client IP address
            
        Returns:
            bool: True if IP is from allowed range
        """
        try:
            import ipaddress
            
            client_ip = ipaddress.ip_address(ip_address)
            
            for ip_range in WebhookSecurityConfig.META_IP_RANGES:
                network = ipaddress.ip_network(ip_range)
                if client_ip in network:
                    return True
            
            logger.warning(f"Webhook request from unauthorized IP: {ip_address}")
            return False
            
        except Exception as e:
            logger.error(f"Error verifying IP address: {e}")
            return False
    
    def handle_webhook_verification(self, mode: str, token: str, challenge: str, app_name: str) -> Optional[str]:
        """
        Handle webhook verification challenge from Meta
        
        Args:
            mode: Verification mode
            token: Verify token
            challenge: Challenge string to echo back
            app_name: Application name for token lookup
            
        Returns:
            str: Challenge if verification succeeds, None otherwise
        """
        try:
            if mode != 'subscribe':
                logger.warning(f"Invalid webhook verification mode: {mode}")
                return None
            
            # Get expected verify token for this app
            expected_token = self.webhook_tokens.get(app_name)
            if not expected_token:
                expected_token = current_app.config.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
            
            if not expected_token:
                logger.error("No webhook verify token configured")
                return None
            
            if not hmac.compare_digest(token, expected_token):
                logger.warning("Invalid webhook verify token")
                return None
            
            logger.info("Webhook verification successful")
            return challenge
            
        except Exception as e:
            logger.error(f"Error handling webhook verification: {e}")
            return None
    
    def check_webhook_rate_limit(self, identifier: str) -> bool:
        """Check rate limiting for webhook requests"""
        try:
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
            
            # Check limit
            current_requests = len(self.rate_limit_tracker[identifier])
            if current_requests >= WebhookSecurityConfig.MAX_WEBHOOK_REQUESTS_PER_MINUTE:
                logger.warning(f"Webhook rate limit exceeded for {identifier}")
                return False
            
            # Add current request
            self.rate_limit_tracker[identifier].append(now)
            return True
            
        except Exception as e:
            logger.error(f"Error checking webhook rate limit: {e}")
            return False
    
    def validate_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate webhook payload structure and content
        
        Args:
            payload: Webhook payload data
            
        Returns:
            dict: Validation result with 'valid' status and sanitized data
        """
        try:
            # Check required fields for WhatsApp webhook
            if 'object' not in payload:
                return {'valid': False, 'error': 'Missing object field'}
            
            if payload['object'] != 'whatsapp_business_account':
                return {'valid': False, 'error': 'Invalid object type'}
            
            if 'entry' not in payload:
                return {'valid': False, 'error': 'Missing entry field'}
            
            entries = payload['entry']
            if not isinstance(entries, list):
                return {'valid': False, 'error': 'Entry must be a list'}
            
            sanitized_entries = []
            
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                
                # Validate entry structure
                if 'id' not in entry or 'changes' not in entry:
                    continue
                
                sanitized_entry = {
                    'id': str(entry['id']),
                    'changes': []
                }
                
                for change in entry.get('changes', []):
                    if not isinstance(change, dict):
                        continue
                    
                    sanitized_change = {
                        'value': change.get('value', {}),
                        'field': str(change.get('field', ''))
                    }
                    
                    # Validate message content if present
                    value = change.get('value', {})
                    if 'messages' in value:
                        sanitized_messages = []
                        for message in value['messages']:
                            sanitized_message = self._sanitize_message_data(message)
                            if sanitized_message:
                                sanitized_messages.append(sanitized_message)
                        sanitized_change['value']['messages'] = sanitized_messages
                    
                    sanitized_entry['changes'].append(sanitized_change)
                
                sanitized_entries.append(sanitized_entry)
            
            return {
                'valid': True,
                'sanitized_payload': {
                    'object': payload['object'],
                    'entry': sanitized_entries
                }
            }
            
        except Exception as e:
            logger.error(f"Error validating webhook payload: {e}")
            return {'valid': False, 'error': 'Payload validation failed'}
    
    def _sanitize_message_data(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Sanitize individual message data"""
        try:
            if not isinstance(message, dict):
                return None
            
            sanitized = {
                'id': str(message.get('id', '')),
                'from': str(message.get('from', '')),
                'timestamp': str(message.get('timestamp', '')),
                'type': str(message.get('type', 'text'))
            }
            
            # Sanitize message content based on type
            message_type = sanitized['type']
            
            if message_type == 'text':
                text_data = message.get('text', {})
                sanitized['text'] = {
                    'body': str(text_data.get('body', ''))[:4096]  # Limit message length
                }
            
            elif message_type == 'image':
                image_data = message.get('image', {})
                sanitized['image'] = {
                    'id': str(image_data.get('id', '')),
                    'mime_type': str(image_data.get('mime_type', '')),
                    'caption': str(image_data.get('caption', ''))[:1000]
                }
            
            elif message_type == 'document':
                doc_data = message.get('document', {})
                sanitized['document'] = {
                    'id': str(doc_data.get('id', '')),
                    'filename': str(doc_data.get('filename', ''))[:255],
                    'mime_type': str(doc_data.get('mime_type', '')),
                    'caption': str(doc_data.get('caption', ''))[:1000]
                }
            
            elif message_type == 'audio':
                audio_data = message.get('audio', {})
                sanitized['audio'] = {
                    'id': str(audio_data.get('id', '')),
                    'mime_type': str(audio_data.get('mime_type', ''))
                }
            
            return sanitized
            
        except Exception as e:
            logger.error(f"Error sanitizing message data: {e}")
            return None
    
    def register_webhook_token(self, app_name: str, token: str):
        """Register webhook verify token for an app"""
        self.webhook_tokens[app_name] = token

# Global webhook verifier instance
webhook_verifier = WebhookVerifier()

def verify_whatsapp_webhook(require_ip_validation: bool = True):
    """
    Decorator to verify WhatsApp webhook requests
    
    Args:
        require_ip_validation: Whether to validate IP address against Meta ranges
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Handle webhook verification challenge
                if request.method == 'GET':
                    mode = request.args.get('hub.mode')
                    token = request.args.get('hub.verify_token')
                    challenge = request.args.get('hub.challenge')
                    
                    if mode and token and challenge:
                        result = webhook_verifier.handle_webhook_verification(
                            mode, token, challenge, 'whatsapp'
                        )
                        if result:
                            return result
                        else:
                            return 'Verification failed', 403
                
                # Verify webhook signature for POST requests
                if request.method == 'POST':
                    # Get raw request body
                    raw_body = request.get_data()
                    
                    # Get signature from header
                    signature = request.headers.get(WebhookSecurityConfig.SIGNATURE_HEADER)
                    
                    # Get webhook secret
                    webhook_secret = current_app.config.get('WHATSAPP_WEBHOOK_SECRET')
                    if not webhook_secret:
                        logger.error("Webhook secret not configured")
                        return jsonify({'error': 'Webhook not configured'}), 500
                    
                    # Verify signature
                    if not webhook_verifier.verify_webhook_signature(raw_body, signature, webhook_secret):
                        logger.warning("Webhook signature verification failed")
                        return jsonify({'error': 'Invalid signature'}), 401
                    
                    # Verify timestamp if provided
                    timestamp = request.headers.get(WebhookSecurityConfig.TIMESTAMP_HEADER)
                    if timestamp and not webhook_verifier.verify_timestamp(timestamp):
                        logger.warning("Webhook timestamp verification failed")
                        return jsonify({'error': 'Invalid timestamp'}), 401
                    
                    # Verify IP address if required
                    if require_ip_validation:
                        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
                        if client_ip:
                            # Handle multiple IPs in X-Forwarded-For
                            client_ip = client_ip.split(',')[0].strip()
                            
                            if not webhook_verifier.verify_ip_address(client_ip):
                                logger.warning(f"Webhook request from unauthorized IP: {client_ip}")
                                return jsonify({'error': 'Unauthorized IP'}), 403
                    
                    # Check rate limiting
                    identifier = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
                    if not webhook_verifier.check_webhook_rate_limit(identifier):
                        return jsonify({'error': 'Rate limit exceeded'}), 429
                    
                    # Validate and sanitize payload
                    try:
                        payload = request.get_json()
                        if payload:
                            validation_result = webhook_verifier.validate_webhook_payload(payload)
                            if not validation_result['valid']:
                                logger.warning(f"Invalid webhook payload: {validation_result['error']}")
                                return jsonify({'error': 'Invalid payload'}), 400
                            
                            # Store sanitized payload in request context
                            request.sanitized_payload = validation_result['sanitized_payload']
                    
                    except Exception as e:
                        logger.error(f"Error parsing webhook payload: {e}")
                        return jsonify({'error': 'Invalid JSON payload'}), 400
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Webhook verification error: {e}")
                return jsonify({'error': 'Webhook verification failed'}), 500
        
        return decorated_function
    return decorator

def setup_webhook_security(app, webhook_secret: str, verify_token: str):
    """
    Initialize webhook security configuration
    
    Args:
        app: Flask application instance
        webhook_secret: Secret for signature verification
        verify_token: Token for webhook verification
    """
    try:
        # Set configuration
        app.config['WHATSAPP_WEBHOOK_SECRET'] = webhook_secret
        app.config['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] = verify_token
        
        # Register webhook token
        webhook_verifier.register_webhook_token('whatsapp', verify_token)
        
        logger.info("Webhook security configured successfully")
        
    except Exception as e:
        logger.error(f"Error setting up webhook security: {e}")
        raise

def create_webhook_secret() -> str:
    """Generate a secure webhook secret"""
    import secrets
    return secrets.token_urlsafe(32)

def validate_webhook_url(webhook_url: str) -> bool:
    """Validate webhook URL format and security"""
    try:
        from urllib.parse import urlparse
        
        parsed = urlparse(webhook_url)
        
        # Must use HTTPS in production
        if parsed.scheme != 'https':
            logger.warning("Webhook URL must use HTTPS")
            return False
        
        # Must have valid hostname
        if not parsed.hostname:
            logger.warning("Invalid webhook URL hostname")
            return False
        
        # Check for suspicious patterns
        suspicious_patterns = ['localhost', '127.0.0.1', '0.0.0.0', '10.', '192.168.', '172.']
        hostname = parsed.hostname.lower()
        
        for pattern in suspicious_patterns:
            if pattern in hostname:
                logger.warning(f"Suspicious hostname in webhook URL: {hostname}")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error validating webhook URL: {e}")
        return False