"""
FastAPI Input validation and sanitization middleware for SPR system
Compatível com FastAPI ao invés de Flask
"""

import re
import html
import json
import logging
from typing import Any, Dict, List, Optional, Union
from functools import wraps
from fastapi import Request, HTTPException
from pydantic import BaseModel, Field, validator
from datetime import datetime

logger = logging.getLogger(__name__)

# Schema para validação de mensagens WhatsApp
class WhatsAppMessageSchema(BaseModel):
    to_number: str = Field(..., min_length=10, max_length=20, pattern=r'^\+?[1-9]\d{1,14}$')
    message: str = Field(..., min_length=1, max_length=4000)
    message_type: str = Field(default="text", pattern=r'^(text|image|document|audio|video)$')
    
    @validator('to_number')
    def validate_phone(cls, v):
        # Remove caracteres não numéricos
        cleaned = re.sub(r'[^\d+]', '', v)
        if not cleaned.startswith('+'):
            cleaned = '+55' + cleaned  # Assume Brasil se não especificado
        return cleaned
    
    @validator('message')
    def sanitize_message(cls, v):
        # Sanitizar HTML e caracteres perigosos
        return html.escape(v.strip())

# Schema para validação de dados de broadcast
class BroadcastSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    message_content: str = Field(..., min_length=10, max_length=4000)
    group_id: int = Field(..., gt=0)
    max_recipients: int = Field(default=50, ge=1, le=100)
    
    @validator('name', 'message_content')
    def sanitize_strings(cls, v):
        return html.escape(v.strip()) if v else v

class InputSanitizer:
    """Serviço para sanitização de entrada"""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitizar string básica"""
        if not value:
            return ""
        
        # Remover caracteres perigosos
        sanitized = html.escape(value.strip())
        
        # Limitar comprimento
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validar número de telefone"""
        phone_pattern = r'^\+?[1-9]\d{1,14}$'
        cleaned = re.sub(r'[^\d+]', '', phone)
        return bool(re.match(phone_pattern, cleaned))

def validate_request_data(schema_class):
    """Decorator para validar dados de request"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            
            # Encontrar o objeto request nos argumentos
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                # Se não encontrou request nos args, procurar nos kwargs
                request = kwargs.get('request')
            
            if request:
                try:
                    # Obter dados JSON do request
                    request_data = await request.json()
                    
                    # Validar com schema
                    validated_data = schema_class(**request_data)
                    
                    # Adicionar dados validados ao request
                    setattr(request, 'validated_data', validated_data.dict())
                    
                except Exception as e:
                    logger.error(f"Erro na validação: {e}")
                    raise HTTPException(status_code=400, detail=f"Dados inválidos: {str(e)}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Instância global
input_sanitizer = InputSanitizer()

# Schema padrão para mensagens WhatsApp
WHATSAPP_MESSAGE_SCHEMA = WhatsAppMessageSchema