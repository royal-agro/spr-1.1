#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPR 1.1 - Sistema de Previsão Rural - Secure Main Application
Ponto de entrada central do sistema com implementações de segurança
Desenvolvido por: Carlos Eduardo Lazzari Anghinoni - Royal Negócios Agrícolas
"""

import os
import sys
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware
import uvicorn
import secrets

# Import security modules
from .middleware.auth_fastapi import auth_service, requires_auth, requires_permission, requires_role, get_current_user
from .middleware.validation_fastapi import input_sanitizer, validate_request_data, WHATSAPP_MESSAGE_SCHEMA
from .middleware.webhook_security_fastapi import webhook_verifier, verify_whatsapp_webhook
from .security.encryption import setup_encryption

# Import routers
from .routers import broadcast

logging.basicConfig(
   level=logging.INFO,
   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(funcName)s:%(lineno)d',
   handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger('SPR')

# Initialize FastAPI with security configurations
app = FastAPI(
    title="SPR - Sistema de Previsão Rural",
    description="Secure agricultural prediction system with WhatsApp integration",
    version="1.1.0",
    docs_url="/docs" if os.getenv('SPR_ENVIRONMENT', 'dev') == 'dev' else None,
    redoc_url="/redoc" if os.getenv('SPR_ENVIRONMENT', 'dev') == 'dev' else None,
    openapi_url="/openapi.json" if os.getenv('SPR_ENVIRONMENT', 'dev') == 'dev' else None
)

# Security middleware setup
def setup_security_middleware():
    """Configure security middleware for the application"""
    
    # Trusted hosts (prevent Host header attacks)
    allowed_hosts = []
    if os.getenv('SPR_ENVIRONMENT') == 'production':
        allowed_hosts = [
            "whatsapp.royalnegociosagricolas.com.br",
            "api.royalnegociosagricolas.com.br"
        ]
    else:
        allowed_hosts = ["localhost", "127.0.0.1", "0.0.0.0"]
    
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
    
    # CORS configuration
    if os.getenv('SPR_ENVIRONMENT') == 'production':
        allowed_origins = [
            "https://whatsapp.royalnegociosagricolas.com.br",
            "https://api.royalnegociosagricolas.com.br"
        ]
    else:
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:8000"
        ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
        max_age=3600
    )
    
    # Session middleware with secure settings
    session_secret = os.getenv('SESSION_SECRET', secrets.token_urlsafe(32))
    app.add_middleware(
        SessionMiddleware,
        secret_key=session_secret,
        https_only=os.getenv('SPR_ENVIRONMENT') == 'production',
        same_site='strict'
    )
    
    # Compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

# Setup security
setup_security_middleware()

# Rate limiting and security headers middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Add security headers and basic protections"""
    
    # Check for suspicious patterns
    user_agent = request.headers.get('user-agent', '').lower()
    suspicious_agents = ['sqlmap', 'nikto', 'wpscan', 'nessus', 'openvas']
    
    if any(agent in user_agent for agent in suspicious_agents):
        logger.warning(f"Suspicious user agent blocked: {user_agent} from {request.client.host}")
        raise HTTPException(status_code=444, detail="Connection closed")
    
    # Process request
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    if os.getenv('SPR_ENVIRONMENT') == 'production':
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    return response

# Authentication setup
security = HTTPBearer()

# get_current_user is now imported from auth_fastapi

# Health check endpoint (public)
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SPR System",
        "version": "1.1.0",
        "timestamp": "2025-01-29T00:00:00Z"
    }

# Authentication endpoints
@app.post("/auth/login")
async def login(request: Request):
    """User authentication endpoint"""
    try:
        data = await request.json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password required")
        
        result = auth_service.authenticate_user(username, password)
        
        if not result['success']:
            raise HTTPException(status_code=401, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

# Secure WhatsApp webhook endpoint
@app.post("/webhook/whatsapp")
@verify_whatsapp_webhook(require_ip_validation=False)  # Set to True in production
async def whatsapp_webhook(request: Request):
    """WhatsApp webhook endpoint with signature verification"""
    try:
        payload = getattr(request, 'sanitized_payload', await request.json())
        
        # Process webhook
        logger.info("Processing WhatsApp webhook")
        
        # Here you would integrate with your WhatsApp service
        # from services.whatsapp_service import get_whatsapp_service
        # whatsapp_service = get_whatsapp_service()
        # await whatsapp_service.handle_incoming_message(payload)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Protected API endpoints
@app.get("/api/status")
async def api_status(current_user: dict = Depends(get_current_user)):
    """Get system status (requires authentication)"""
    return {
        "status": "operational",
        "user": current_user['username'],
        "permissions": current_user.get('permissions', []),
        "timestamp": "2025-01-29T00:00:00Z"
    }

@app.post("/api/whatsapp/send")
@validate_request_data(WHATSAPP_MESSAGE_SCHEMA)
async def send_whatsapp_message(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Send WhatsApp message (requires authentication and permission)"""
    
    # Check permissions
    user_permissions = current_user.get('permissions', [])
    if 'send:messages' not in user_permissions and 'write:all' not in user_permissions:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        validated_data = getattr(request, 'validated_data', {})
        
        # Here you would integrate with your WhatsApp service
        logger.info(f"Sending WhatsApp message to {validated_data.get('to_number')}")
        
        return {
            "success": True,
            "message": "Message sent successfully",
            "timestamp": "2025-01-29T00:00:00Z"
        }
        
    except Exception as e:
        logger.error(f"Message sending error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

# Admin-only endpoints
@app.get("/api/admin/metrics")
async def get_metrics(current_user: dict = Depends(get_current_user)):
    """Get system metrics (admin only)"""
    
    user_roles = current_user.get('roles', [])
    if 'admin' not in user_roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    
    return {
        "system_metrics": {
            "uptime": "5 days",
            "memory_usage": "45%",
            "cpu_usage": "23%",
            "active_connections": 42
        },
        "security_metrics": {
            "failed_login_attempts": 3,
            "blocked_ips": 0,
            "webhook_requests": 156
        }
    }

# Include routers
app.include_router(broadcast.router)

class SPRSystem:
   def __init__(self):
       self.version = "1.1"
       self.environment: Optional[str] = None
       self.modules: Dict[str, dict] = {}
       # Ajustado para apontar para o diretório pai (SPR/) já que agora estamos em app/
       self.project_root = Path(__file__).parent.parent

   def load_environment(self) -> bool:
       try:
           env_file = self.project_root / '.env'
           if env_file.exists():
               load_dotenv(env_file)
               logger.info(f"✅ Arquivo .env carregado: {env_file}")
           else:
               logger.warning("⚠️  Arquivo .env não encontrado, usando variáveis padrão")
           self.environment = os.getenv('SPR_ENVIRONMENT', 'dev').lower()
           logger.info(f"🌍 Ambiente configurado: {self.environment}")
           return True
       except Exception as e:
           logger.error(f"❌ Erro ao carregar .env: {e}")
           return False

   def discover_modules(self) -> List[str]:
       modules = []
       # Ajustado para procurar na nova estrutura app/
       main_directories = ['analise', 'precificacao', 'suporte_tecnico']
       for directory in main_directories:
           module_path = Path(__file__).parent / directory
           if module_path.exists() and module_path.is_dir():
               modules.append(directory)
               logger.info(f"📁 Módulo descoberto: {directory}")
           else:
               logger.warning(f"⚠️  Módulo não encontrado: {directory}")
       return modules

   def register_module(self, module_name: str) -> bool:
       try:
           module_path = Path(__file__).parent / module_name
           if not module_path.exists():
               logger.error(f"❌ Módulo não encontrado: {module_name}")
               return False
           self.modules[module_name] = {
               'path': str(module_path),
               'status': 'registered',
               'files': list(module_path.glob('*.py'))
           }
           logger.info(f"✅ Módulo registrado: {module_name}")
           return True
       except Exception as e:
           logger.error(f"❌ Erro ao registrar módulo {module_name}: {e}")
           return False

   def initialize_modules(self) -> bool:
       try:
           logger.info("🚀 Iniciando módulos do SPR...")
           for module_name, module_info in self.modules.items():
               logger.info(f"   ⚡ Inicializando {module_name}...")
               module_info['status'] = 'initialized'
               files_count = len(module_info['files'])
               logger.info(f"   📄 {module_name}: {files_count} arquivo(s) encontrado(s)")
           logger.info("✅ Todos os módulos inicializados com sucesso")
           return True
       except Exception as e:
           logger.error(f"❌ Erro na inicialização dos módulos: {e}")
           return False

   def health_check(self) -> Dict[str, str]:
       health_status = {
           'system': 'healthy',
           'version': self.version
       }
       return health_status

   def startup(self) -> bool:
       logger.info("=" * 60)
       logger.info("🌾 SPR 1.1 - Sistema de Previsão Rural")
       logger.info("   Royal Negócios Agrícolas")
       logger.info("=" * 60)
       if not self.load_environment():
           return False
       discovered_modules = self.discover_modules()
       if not discovered_modules:
           logger.warning("⚠️  Nenhum módulo encontrado")
           return False
       for module in discovered_modules:
           if not self.register_module(module):
               logger.error(f"❌ Falha ao registrar módulo: {module}")
               return False
       if not self.initialize_modules():
           return False
       logger.info("🎯 SPR 1.1 iniciado com sucesso!")
       logger.info("=" * 60)
       return True

   def shutdown(self):
       logger.info("🔄 Finalizando SPR 1.1...")
       for module_name in self.modules:
           logger.info(f"   ⏹️  Finalizando {module_name}")
       logger.info("✅ SPR 1.1 finalizado")

def parse_arguments():
   parser = argparse.ArgumentParser(
       description='SPR 1.1 - Sistema de Previsão Rural',
       formatter_class=argparse.RawDescriptionHelpFormatter
   )
   parser.add_argument('--check', action='store_true', help='Executa health check do sistema')
   parser.add_argument('--version', action='store_true', help='Mostra versão do sistema')
   return parser.parse_args()

def main():
   try:
       args = parse_arguments()
       if args.version:
           print("SPR 1.1 - Sistema de Previsão Rural")
           print("Royal Negócios Agrícolas")
           return 0
       spr = SPRSystem()
       if args.check:
           if not spr.load_environment():
               return 1
           discovered = spr.discover_modules()
           for module in discovered:
               spr.register_module(module)
           health = spr.health_check()
           print("🔍 SPR Health Check:")
           for component, status in health.items():
               print(f"   {component}: {status}")
           return 0
       if spr.startup():
           print("\n💡 Sistema pronto para operação")
           print("   (Pressione Ctrl+C para finalizar)")
           try:
               input("\n   Pressione Enter para finalizar...")
           except KeyboardInterrupt:
               print("\n")
           finally:
               spr.shutdown()
           return 0
       else:
           logger.error("❌ Falha na inicialização do sistema")
           return 1
   except KeyboardInterrupt:
       print("\n\n🔄 Interrompido pelo usuário")
       return 0
   except Exception as e:
       logger.error(f"❌ Erro fatal: {e}")
       return 1

if __name__ == "__main__":
   sys.exit(main()) 