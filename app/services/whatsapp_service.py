"""
Serviço de integração com WhatsApp Business API
Responsável por gerenciar conexões, mensagens e contatos do WhatsApp
"""

import asyncio
import json
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from cryptography.fernet import Fernet
import websockets
import base64
import os
# from flask import current_app  # TODO: Remover dependência do Flask

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class WhatsAppMessage:
    """Estrutura de dados para mensagens do WhatsApp"""
    id: str
    from_number: str
    to_number: str
    content: str
    message_type: str  # text, image, document, audio, video
    timestamp: datetime
    status: str  # sent, delivered, read, failed
    is_from_me: bool
    media_url: Optional[str] = None
    media_filename: Optional[str] = None
    reply_to: Optional[str] = None

@dataclass
class WhatsAppContact:
    """Estrutura de dados para contatos do WhatsApp"""
    phone: str
    name: str
    profile_picture: Optional[str] = None
    last_seen: Optional[datetime] = None
    is_online: bool = False
    is_blocked: bool = False
    tags: List[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []

class WhatsAppService:
    """Serviço principal para integração com WhatsApp Business"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_url = config.get('whatsapp_api_url', 'https://graph.facebook.com/v18.0')
        self.access_token = config.get('whatsapp_access_token')
        self.phone_number_id = config.get('whatsapp_phone_number_id')
        self.webhook_verify_token = config.get('whatsapp_webhook_verify_token')
        self.business_account_id = config.get('whatsapp_business_account_id')
        
        # Configurar criptografia
        self.encryption_key = config.get('encryption_key', Fernet.generate_key())
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Cache de mensagens e contatos
        self.messages_cache: Dict[str, List[WhatsAppMessage]] = {}
        self.contacts_cache: Dict[str, WhatsAppContact] = {}
        
        # WebSocket para tempo real
        self.websocket_clients: List[Any] = []
        
        # Headers para API
        self.headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

    async def initialize(self):
        """Inicializar o serviço WhatsApp"""
        try:
            logger.info("Inicializando serviço WhatsApp...")
            
            # Verificar conexão com API
            await self.verify_api_connection()
            
            # Sincronizar contatos
            await self.sync_contacts()
            
            # Configurar webhook
            await self.setup_webhook()
            
            logger.info("Serviço WhatsApp inicializado com sucesso!")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao inicializar serviço WhatsApp: {e}")
            return False

    async def verify_api_connection(self):
        """Verificar conexão com a API do WhatsApp"""
        try:
            url = f"{self.api_url}/{self.phone_number_id}"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                logger.info("Conexão com API WhatsApp verificada")
                return True
            else:
                logger.error(f"Erro na conexão com API: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao verificar conexão: {e}")
            return False

    async def send_message(self, to_number: str, message: str, message_type: str = "text", media_url: str = None) -> bool:
        """Enviar mensagem via WhatsApp Business API"""
        try:
            url = f"{self.api_url}/{self.phone_number_id}/messages"
            
            # Preparar payload baseado no tipo de mensagem
            payload = {
                "messaging_product": "whatsapp",
                "to": to_number,
                "type": message_type
            }
            
            if message_type == "text":
                payload["text"] = {"body": message}
            elif message_type == "image":
                payload["image"] = {"link": media_url, "caption": message}
            elif message_type == "document":
                payload["document"] = {"link": media_url, "caption": message}
            elif message_type == "audio":
                payload["audio"] = {"link": media_url}
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code == 200:
                response_data = response.json()
                message_id = response_data.get('messages', [{}])[0].get('id')
                
                # Criar objeto de mensagem
                whatsapp_message = WhatsAppMessage(
                    id=message_id,
                    from_number=self.phone_number_id,
                    to_number=to_number,
                    content=message,
                    message_type=message_type,
                    timestamp=datetime.now(),
                    status="sent",
                    is_from_me=True,
                    media_url=media_url
                )
                
                # Adicionar ao cache
                await self.add_message_to_cache(whatsapp_message)
                
                # Notificar clientes WebSocket
                await self.notify_websocket_clients("message_sent", asdict(whatsapp_message))
                
                logger.info(f"Mensagem enviada com sucesso: {message_id}")
                return True
            else:
                logger.error(f"Erro ao enviar mensagem: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem: {e}")
            return False

    async def handle_incoming_message(self, webhook_data: Dict[str, Any]):
        """Processar mensagem recebida via webhook"""
        try:
            entry = webhook_data.get('entry', [{}])[0]
            changes = entry.get('changes', [{}])[0]
            value = changes.get('value', {})
            
            # Processar mensagens
            messages = value.get('messages', [])
            for message_data in messages:
                message = await self.parse_incoming_message(message_data)
                if message:
                    await self.process_incoming_message(message)
            
            # Processar status de mensagens
            statuses = value.get('statuses', [])
            for status_data in statuses:
                await self.update_message_status(status_data)
                
        except Exception as e:
            logger.error(f"Erro ao processar mensagem recebida: {e}")

    async def parse_incoming_message(self, message_data: Dict[str, Any]) -> Optional[WhatsAppMessage]:
        """Converter dados do webhook em objeto WhatsAppMessage"""
        try:
            message_id = message_data.get('id')
            from_number = message_data.get('from')
            timestamp = datetime.fromtimestamp(int(message_data.get('timestamp')))
            message_type = message_data.get('type')
            
            content = ""
            media_url = None
            media_filename = None
            
            # Extrair conteúdo baseado no tipo
            if message_type == "text":
                content = message_data.get('text', {}).get('body', '')
            elif message_type == "image":
                image_data = message_data.get('image', {})
                content = image_data.get('caption', '')
                media_url = image_data.get('id')  # ID da mídia para download
            elif message_type == "document":
                doc_data = message_data.get('document', {})
                content = doc_data.get('caption', '')
                media_url = doc_data.get('id')
                media_filename = doc_data.get('filename')
            elif message_type == "audio":
                audio_data = message_data.get('audio', {})
                media_url = audio_data.get('id')
                content = "[Áudio]"
            
            return WhatsAppMessage(
                id=message_id,
                from_number=from_number,
                to_number=self.phone_number_id,
                content=content,
                message_type=message_type,
                timestamp=timestamp,
                status="received",
                is_from_me=False,
                media_url=media_url,
                media_filename=media_filename
            )
            
        except Exception as e:
            logger.error(f"Erro ao parsear mensagem: {e}")
            return None

    async def process_incoming_message(self, message: WhatsAppMessage):
        """Processar mensagem recebida e gerar resposta automática se necessário"""
        try:
            # Adicionar ao cache
            await self.add_message_to_cache(message)
            
            # Atualizar informações do contato
            await self.update_contact_info(message.from_number)
            
            # Verificar se é uma consulta de preço
            response = await self.generate_auto_response(message)
            if response:
                await self.send_message(message.from_number, response)
            
            # Notificar clientes WebSocket
            await self.notify_websocket_clients("message_received", asdict(message))
            
            logger.info(f"Mensagem processada: {message.id}")
            
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {e}")

    async def generate_auto_response(self, message: WhatsAppMessage) -> Optional[str]:
        """Gerar resposta automática baseada no conteúdo da mensagem"""
        try:
            content = message.content.lower()
            
            # Verificar horário comercial
            if not self.is_business_hours():
                return self.config.get('auto_reply_message', 
                    'Obrigado pela mensagem! Responderemos em breve no horário comercial.')
            
            # Respostas para commodities
            commodity_responses = {
                'soja': 'O preço da soja hoje está R$ 127,50/saca (alta de 2,3%). Posso ajudar com mais informações?',
                'milho': 'O preço do milho hoje está R$ 65,80/saca (baixa de 1,2%). Precisa de mais detalhes?',
                'café': 'O preço do café hoje está R$ 890,00/saca (alta de 4,7%). Quer saber sobre outras commodities?',
                'algodão': 'O preço do algodão hoje está R$ 156,30/saca (alta de 0,8%). Posso fornecer mais dados?',
                'boi': 'O preço do boi hoje está R$ 298,50/arroba (baixa de 0,5%). Precisa de análise detalhada?'
            }
            
            for commodity, response in commodity_responses.items():
                if commodity in content:
                    return response
            
            # Saudações
            greetings = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite']
            if any(greeting in content for greeting in greetings):
                return 'Olá! Sou o assistente da Royal Negócios Agrícolas. Como posso ajudar com informações sobre commodities?'
            
            return None
            
        except Exception as e:
            logger.error(f"Erro ao gerar resposta automática: {e}")
            return None

    def is_business_hours(self) -> bool:
        """Verificar se está no horário comercial"""
        try:
            now = datetime.now()
            business_config = self.config.get('business_hours', {})
            
            if not business_config.get('enabled', False):
                return True
            
            start_time = datetime.strptime(business_config.get('start', '09:00'), '%H:%M').time()
            end_time = datetime.strptime(business_config.get('end', '18:00'), '%H:%M').time()
            
            return start_time <= now.time() <= end_time
            
        except Exception as e:
            logger.error(f"Erro ao verificar horário comercial: {e}")
            return True

    async def sync_contacts(self):
        """Sincronizar contatos do WhatsApp Business"""
        try:
            # Implementar sincronização de contatos
            # Por enquanto, usar dados mockados
            logger.info("Sincronização de contatos iniciada...")
            
            # Aqui você implementaria a lógica real de sincronização
            # com a API do WhatsApp Business
            
            logger.info("Sincronização de contatos concluída")
            
        except Exception as e:
            logger.error(f"Erro ao sincronizar contatos: {e}")

    async def setup_webhook(self):
        """Configurar webhook para receber mensagens"""
        try:
            # Configurar webhook URL
            webhook_url = self.config.get('webhook_url')
            if webhook_url:
                logger.info(f"Webhook configurado: {webhook_url}")
            
        except Exception as e:
            logger.error(f"Erro ao configurar webhook: {e}")

    async def add_message_to_cache(self, message: WhatsAppMessage):
        """Adicionar mensagem ao cache"""
        try:
            contact_key = message.from_number if not message.is_from_me else message.to_number
            
            if contact_key not in self.messages_cache:
                self.messages_cache[contact_key] = []
            
            self.messages_cache[contact_key].append(message)
            
            # Limitar tamanho do cache (últimas 100 mensagens por contato)
            if len(self.messages_cache[contact_key]) > 100:
                self.messages_cache[contact_key] = self.messages_cache[contact_key][-100:]
                
        except Exception as e:
            logger.error(f"Erro ao adicionar mensagem ao cache: {e}")

    async def update_contact_info(self, phone_number: str):
        """Atualizar informações do contato"""
        try:
            if phone_number not in self.contacts_cache:
                # Buscar informações do contato na API
                contact = WhatsAppContact(
                    phone=phone_number,
                    name=f"Contato {phone_number[-4:]}",
                    last_seen=datetime.now(),
                    is_online=True
                )
                self.contacts_cache[phone_number] = contact
            else:
                # Atualizar última visualização
                self.contacts_cache[phone_number].last_seen = datetime.now()
                self.contacts_cache[phone_number].is_online = True
                
        except Exception as e:
            logger.error(f"Erro ao atualizar informações do contato: {e}")

    async def update_message_status(self, status_data: Dict[str, Any]):
        """Atualizar status da mensagem"""
        try:
            message_id = status_data.get('id')
            status = status_data.get('status')
            
            # Procurar mensagem no cache e atualizar status
            for contact_messages in self.messages_cache.values():
                for message in contact_messages:
                    if message.id == message_id:
                        message.status = status
                        
                        # Notificar clientes WebSocket
                        await self.notify_websocket_clients("message_status_updated", {
                            'message_id': message_id,
                            'status': status
                        })
                        break
                        
        except Exception as e:
            logger.error(f"Erro ao atualizar status da mensagem: {e}")

    async def notify_websocket_clients(self, event_type: str, data: Dict[str, Any]):
        """Notificar clientes WebSocket sobre eventos"""
        try:
            if not self.websocket_clients:
                return
            
            message = {
                'type': event_type,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            
            # Enviar para todos os clientes conectados
            disconnected_clients = []
            for client in self.websocket_clients:
                try:
                    await client.send(json.dumps(message))
                except:
                    disconnected_clients.append(client)
            
            # Remover clientes desconectados
            for client in disconnected_clients:
                self.websocket_clients.remove(client)
                
        except Exception as e:
            logger.error(f"Erro ao notificar clientes WebSocket: {e}")

    async def add_websocket_client(self, websocket):
        """Adicionar cliente WebSocket"""
        self.websocket_clients.append(websocket)

    async def remove_websocket_client(self, websocket):
        """Remover cliente WebSocket"""
        if websocket in self.websocket_clients:
            self.websocket_clients.remove(websocket)

    def get_messages_for_contact(self, contact_phone: str) -> List[Dict[str, Any]]:
        """Obter mensagens de um contato específico"""
        try:
            messages = self.messages_cache.get(contact_phone, [])
            return [asdict(msg) for msg in messages]
        except Exception as e:
            logger.error(f"Erro ao obter mensagens do contato: {e}")
            return []

    def get_all_contacts(self) -> List[Dict[str, Any]]:
        """Obter todos os contatos"""
        try:
            return [asdict(contact) for contact in self.contacts_cache.values()]
        except Exception as e:
            logger.error(f"Erro ao obter contatos: {e}")
            return []

    def encrypt_message(self, message: str) -> str:
        """Criptografar mensagem"""
        try:
            encrypted = self.cipher_suite.encrypt(message.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Erro ao criptografar mensagem: {e}")
            return message

    def decrypt_message(self, encrypted_message: str) -> str:
        """Descriptografar mensagem"""
        try:
            encrypted_bytes = base64.b64decode(encrypted_message.encode())
            decrypted = self.cipher_suite.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Erro ao descriptografar mensagem: {e}")
            return encrypted_message

# Instância global do serviço
whatsapp_service = None

def get_whatsapp_service() -> WhatsAppService:
    """Obter instância do serviço WhatsApp"""
    global whatsapp_service
    if whatsapp_service is None:
        config = {
            'whatsapp_api_url': os.getenv('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0'),
            'whatsapp_access_token': os.getenv('WHATSAPP_ACCESS_TOKEN'),
            'whatsapp_phone_number_id': os.getenv('WHATSAPP_PHONE_NUMBER_ID'),
            'whatsapp_webhook_verify_token': os.getenv('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
            'whatsapp_business_account_id': os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID'),
            'webhook_url': os.getenv('WEBHOOK_URL'),
            'encryption_key': os.getenv('ENCRYPTION_KEY'),
            'business_hours': {
                'enabled': True,
                'start': '09:00',
                'end': '18:00'
            },
            'auto_reply_message': 'Obrigado pela mensagem! Responderemos em breve no horário comercial.'
        }
        whatsapp_service = WhatsAppService(config)
    return whatsapp_service 