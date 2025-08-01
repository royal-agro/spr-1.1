"""
FastAPI WhatsApp webhook signature verification and security
Versão compatível com FastAPI
"""

import hmac
import hashlib
import logging
import time
from typing import Dict, Optional, Any
from functools import wraps
from fastapi import Request, HTTPException
import json
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WebhookVerifier:
    """Verificador de segurança para webhooks"""
    
    def __init__(self, webhook_secret: str = None):
        self.webhook_secret = webhook_secret or os.getenv('WEBHOOK_SECRET', 'dev-webhook-secret')
    
    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verificar assinatura do webhook"""
        try:
            # Calcular hash esperado
            expected_signature = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Comparar assinaturas
            return hmac.compare_digest(f"sha256={expected_signature}", signature)
            
        except Exception as e:
            logger.error(f"Erro na verificação de assinatura: {e}")
            return False
    
    def verify_timestamp(self, timestamp_header: str) -> bool:
        """Verificar se timestamp é válido (previne replay attacks)"""
        try:
            timestamp = int(timestamp_header)
            current_time = int(time.time())
            
            # Verificar se não é muito antigo (5 minutos)
            return abs(current_time - timestamp) <= 300
            
        except (ValueError, TypeError):
            return False

# Instância global
webhook_verifier = WebhookVerifier()

def verify_whatsapp_webhook(require_ip_validation: bool = False):
    """Decorator para verificação de webhook do WhatsApp"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            try:
                # Para desenvolvimento, permitir bypass
                if os.getenv('SPR_ENVIRONMENT', 'dev') == 'dev':
                    logger.info("🔧 Modo desenvolvimento: verificação de webhook desabilitada")
                    return await func(request, *args, **kwargs)
                
                # Obter headers
                signature = request.headers.get('X-Hub-Signature-256')
                timestamp = request.headers.get('X-Hub-Timestamp')
                
                if not signature:
                    logger.warning("❌ Assinatura de webhook ausente")
                    raise HTTPException(status_code=401, detail="Assinatura ausente")
                
                # Obter payload
                payload = await request.body()
                
                # Verificar assinatura
                if not webhook_verifier.verify_signature(payload, signature):
                    logger.warning("❌ Assinatura de webhook inválida")
                    raise HTTPException(status_code=401, detail="Assinatura inválida")
                
                # Verificar timestamp se fornecido
                if timestamp and not webhook_verifier.verify_timestamp(timestamp):
                    logger.warning("❌ Timestamp de webhook inválido")
                    raise HTTPException(status_code=401, detail="Timestamp inválido")
                
                # Sanitizar payload JSON
                try:
                    json_payload = json.loads(payload.decode('utf-8'))
                    setattr(request, 'sanitized_payload', json_payload)
                except json.JSONDecodeError:
                    logger.warning("❌ Payload JSON inválido")
                    raise HTTPException(status_code=400, detail="JSON inválido")
                
                logger.info("✅ Webhook verificado com sucesso")
                return await func(request, *args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"❌ Erro na verificação de webhook: {e}")
                raise HTTPException(status_code=500, detail="Erro interno")
        
        return wrapper
    return decorator