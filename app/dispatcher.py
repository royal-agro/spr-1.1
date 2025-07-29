# dispatcher.py
# 📦 SPR 1.1 – Gateway de Comunicação WhatsApp
# Responsável pela comunicação entre Python e servidor Node.js

import os
import json
import logging
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

class WhatsAppDispatcher:
    """
    Dispatcher para comunicação com servidor WhatsApp Node.js
    
    Funcionalidades:
    - Envio de mensagens de texto
    - Envio de mídias (imagens, documentos, áudios)
    - Consulta de status
    - Gerenciamento de contatos
    - Monitoramento de conexão
    """
    
    def __init__(self):
        # Configurações do servidor WhatsApp
        self.base_url = os.getenv('WHATSAPP_SERVER_URL', 'http://localhost:3000')
        self.api_key = os.getenv('WHATSAPP_API_KEY', '')
        self.timeout = int(os.getenv('WHATSAPP_TIMEOUT', '30'))
        
        # Configurações de retry
        self.max_retries = int(os.getenv('WHATSAPP_MAX_RETRIES', '3'))
        self.retry_delay = int(os.getenv('WHATSAPP_RETRY_DELAY', '5'))
        
        # Debug mode
        self.debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
        
        # Headers padrão
        self.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'SPR-WhatsApp-Dispatcher/1.1'
        }
        
        if self.api_key:
            self.headers['Authorization'] = f'Bearer {self.api_key}'
        
        logger.info(f"WhatsApp Dispatcher inicializado - URL: {self.base_url}")
    
    def send_message(self, contact: str, message: str, message_type: str = 'text') -> Dict[str, Any]:
        """
        Envia mensagem via WhatsApp
        
        Args:
            contact: Número do contato (com ou sem código do país)
            message: Conteúdo da mensagem
            message_type: Tipo da mensagem (text, image, document, audio)
            
        Returns:
            Dict com resultado do envio
        """
        try:
            # Normalizar número do contato
            normalized_contact = self._normalize_contact(contact)
            
            # Preparar payload
            payload = {
                'number': normalized_contact,
                'message': message,
                'type': message_type,
                'timestamp': datetime.now().isoformat()
            }
            
            # Log da operação
            logger.info(f"📤 Enviando mensagem para {normalized_contact}: {message[:50]}...")
            
            if self.debug_mode:
                logger.info(f"[DEBUG] Payload: {json.dumps(payload, indent=2)}")
                return {
                    'success': True,
                    'message_id': f'debug_{datetime.now().timestamp()}',
                    'contact': normalized_contact,
                    'status': 'sent',
                    'debug': True
                }
            
            # Fazer requisição
            response = requests.post(
                f"{self.base_url}/api/send",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            
            # Processar resposta
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Mensagem enviada com sucesso - ID: {result.get('messageId', 'N/A')}")
                return {
                    'success': True,
                    'message_id': result.get('messageId'),
                    'contact': normalized_contact,
                    'status': 'sent',
                    'response': result
                }
            else:
                logger.error(f"❌ Erro no envio - Status: {response.status_code}, Resposta: {response.text}")
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'contact': normalized_contact,
                    'status': 'failed'
                }
                
        except Exception as e:
            logger.error(f"❌ Erro ao enviar mensagem: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'contact': contact,
                'status': 'error'
            }
    
    def send_media(self, contact: str, media_path: str, caption: str = '', media_type: str = 'image') -> Dict[str, Any]:
        """
        Envia mídia via WhatsApp
        
        Args:
            contact: Número do contato
            media_path: Caminho do arquivo ou URL
            caption: Legenda da mídia
            media_type: Tipo da mídia (image, document, audio, video)
            
        Returns:
            Dict com resultado do envio
        """
        try:
            normalized_contact = self._normalize_contact(contact)
            
            payload = {
                'number': normalized_contact,
                'media': media_path,
                'caption': caption,
                'type': media_type,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"📎 Enviando mídia para {normalized_contact}: {media_type}")
            
            if self.debug_mode:
                logger.info(f"[DEBUG] Mídia simulada: {media_path}")
                return {
                    'success': True,
                    'message_id': f'debug_media_{datetime.now().timestamp()}',
                    'contact': normalized_contact,
                    'status': 'sent',
                    'debug': True
                }
            
            response = requests.post(
                f"{self.base_url}/api/send-media",
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Mídia enviada com sucesso")
                return {
                    'success': True,
                    'message_id': result.get('messageId'),
                    'contact': normalized_contact,
                    'status': 'sent',
                    'response': result
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'contact': normalized_contact,
                    'status': 'failed'
                }
                
        except Exception as e:
            logger.error(f"❌ Erro ao enviar mídia: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'contact': contact,
                'status': 'error'
            }
    
    def get_status(self) -> Dict[str, Any]:
        """
        Consulta status do servidor WhatsApp
        
        Returns:
            Dict com status da conexão
        """
        try:
            response = requests.get(
                f"{self.base_url}/status",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                status = response.json()
                logger.info(f"📊 Status obtido: {status}")
                return {
                    'success': True,
                    'status': status,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Erro ao consultar status: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_contacts(self) -> Dict[str, Any]:
        """
        Obtém lista de contatos
        
        Returns:
            Dict com lista de contatos
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/contacts",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                contacts = response.json()
                logger.info(f"📱 {len(contacts)} contatos obtidos")
                return {
                    'success': True,
                    'contacts': contacts,
                    'count': len(contacts),
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Erro ao obter contatos: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_messages(self, limit: int = 100) -> Dict[str, Any]:
        """
        Obtém mensagens recentes
        
        Args:
            limit: Número máximo de mensagens
            
        Returns:
            Dict com mensagens
        """
        try:
            response = requests.get(
                f"{self.base_url}/api/messages",
                params={'limit': limit},
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                messages = response.json()
                logger.info(f"💬 {len(messages)} mensagens obtidas")
                return {
                    'success': True,
                    'messages': messages,
                    'count': len(messages),
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Erro ao obter mensagens: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def health_check(self) -> Dict[str, Any]:
        """
        Verifica saúde do servidor WhatsApp
        
        Returns:
            Dict com status de saúde
        """
        try:
            response = requests.get(
                f"{self.base_url}/health",
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                health = response.json()
                logger.info(f"🔍 Health check OK: {health}")
                return {
                    'success': True,
                    'health': health,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Erro no health check: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _normalize_contact(self, contact: str) -> str:
        """
        Normaliza número do contato
        
        Args:
            contact: Número original
            
        Returns:
            Número normalizado
        """
        # Remove caracteres não numéricos
        clean_contact = ''.join(filter(str.isdigit, contact))
        
        # Adiciona código do país se necessário (Brasil = 55)
        if len(clean_contact) == 11 and clean_contact.startswith('0'):
            clean_contact = '55' + clean_contact[1:]
        elif len(clean_contact) == 11 and not clean_contact.startswith('55'):
            clean_contact = '55' + clean_contact
        elif len(clean_contact) == 10:
            clean_contact = '55' + clean_contact
        elif len(clean_contact) == 9:
            clean_contact = '5511' + clean_contact
        
        return clean_contact

# Instância global do dispatcher
dispatcher = WhatsAppDispatcher()

# Função compatível com código existente
def send_via_gateway(contact: str, message: str, message_type: str = 'text') -> bool:
    """
    Função de compatibilidade para código existente
    
    Args:
        contact: Número do contato
        message: Mensagem a ser enviada
        message_type: Tipo da mensagem
        
    Returns:
        True se enviada com sucesso
    """
    result = dispatcher.send_message(contact, message, message_type)
    return result.get('success', False) 