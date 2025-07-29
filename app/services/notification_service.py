"""
Serviço de notificações para SPR
Gerencia envio de emails e mensagens WhatsApp para eventos da agenda
"""

import smtplib
import asyncio
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum
import requests
import json
import schedule
import time
from threading import Thread

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    BOTH = "both"

class NotificationPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class NotificationStatus(Enum):
    SCHEDULED = "scheduled"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class NotificationData:
    id: str
    type: NotificationType
    recipients: List[str]
    subject: str
    message: str
    priority: NotificationPriority
    scheduled_for: Optional[datetime] = None
    event_id: Optional[str] = None
    status: NotificationStatus = NotificationStatus.SCHEDULED
    created_at: datetime = None
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None

class EmailService:
    """Serviço de envio de emails usando SMTP"""
    
    def __init__(self, smtp_host: str, smtp_port: int, username: str, password: str):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        
    async def send_email(self, 
                        recipients: List[str], 
                        subject: str, 
                        html_content: str, 
                        text_content: str = None) -> bool:
        """Enviar email para lista de destinatários"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.username
            msg['To'] = ', '.join(recipients)
            
            # Adicionar versão texto
            if text_content:
                part1 = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(part1)
            
            # Adicionar versão HTML
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part2)
            
            # Conectar e enviar
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.username, self.password)
            
            text = msg.as_string()
            server.sendmail(self.username, recipients, text)
            server.quit()
            
            logger.info(f"Email enviado com sucesso para {len(recipients)} destinatários")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar email: {str(e)}")
            return False

class WhatsAppService:
    """Serviço de envio de mensagens WhatsApp"""
    
    def __init__(self, api_url: str = "http://localhost:3001/api"):
        self.api_url = api_url
        
    async def send_message(self, 
                          recipients: List[str], 
                          message: str, 
                          buttons: List[Dict] = None) -> bool:
        """Enviar mensagem WhatsApp para lista de destinatários"""
        try:
            success_count = 0
            
            for recipient in recipients:
                # Converter email para número de telefone se necessário
                phone_number = self._email_to_phone(recipient)
                
                if not phone_number:
                    logger.warning(f"Não foi possível converter {recipient} para número de telefone")
                    continue
                
                payload = {
                    "number": phone_number,
                    "message": message
                }
                
                if buttons:
                    payload["buttons"] = buttons
                
                response = requests.post(
                    f"{self.api_url}/whatsapp/send-message",
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    success_count += 1
                    logger.info(f"Mensagem WhatsApp enviada para {phone_number}")
                else:
                    logger.error(f"Erro ao enviar WhatsApp para {phone_number}: {response.text}")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Erro ao enviar WhatsApp: {str(e)}")
            return False
    
    def _email_to_phone(self, email: str) -> Optional[str]:
        """Converter email para número de telefone (implementar conforme necessidade)"""
        # Aqui você implementaria a lógica para converter email em número
        # Por exemplo, consultar banco de dados de contatos
        
        # Exemplo básico - remover após implementar lógica real
        phone_mapping = {
            "admin@royalnegociosagricolas.com.br": "5511999999999",
            "clientes@royalnegociosagricolas.com.br": "5511888888888"
        }
        
        return phone_mapping.get(email)

class NotificationService:
    """Serviço principal de notificações"""
    
    def __init__(self, email_service: EmailService, whatsapp_service: WhatsAppService):
        self.email_service = email_service
        self.whatsapp_service = whatsapp_service
        self.scheduled_notifications: Dict[str, NotificationData] = {}
        self.notification_history: List[NotificationData] = []
        
        # Iniciar thread para processar notificações agendadas
        self._start_scheduler()
    
    def _start_scheduler(self):
        """Iniciar scheduler para processar notificações agendadas"""
        def run_scheduler():
            schedule.every(1).minutes.do(self._process_scheduled_notifications)
            while True:
                schedule.run_pending()
                time.sleep(60)
        
        scheduler_thread = Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        logger.info("Scheduler de notificações iniciado")
    
    async def send_notification(self, notification: NotificationData) -> bool:
        """Enviar notificação imediatamente"""
        try:
            success = False
            
            if notification.type in [NotificationType.EMAIL, NotificationType.BOTH]:
                email_success = await self.email_service.send_email(
                    notification.recipients,
                    notification.subject,
                    notification.message
                )
                success = email_success or success
            
            if notification.type in [NotificationType.WHATSAPP, NotificationType.BOTH]:
                whatsapp_success = await self.whatsapp_service.send_message(
                    notification.recipients,
                    notification.message
                )
                success = whatsapp_success or success
            
            # Atualizar status
            notification.status = NotificationStatus.SENT if success else NotificationStatus.FAILED
            notification.sent_at = datetime.now()
            
            # Adicionar ao histórico
            self.notification_history.append(notification)
            
            logger.info(f"Notificação {notification.id} {'enviada' if success else 'falhou'}")
            return success
            
        except Exception as e:
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            logger.error(f"Erro ao enviar notificação {notification.id}: {str(e)}")
            return False
    
    def schedule_notification(self, notification: NotificationData) -> str:
        """Agendar notificação para envio futuro"""
        if not notification.scheduled_for:
            notification.scheduled_for = datetime.now()
        
        if not notification.created_at:
            notification.created_at = datetime.now()
        
        self.scheduled_notifications[notification.id] = notification
        logger.info(f"Notificação {notification.id} agendada para {notification.scheduled_for}")
        
        return notification.id
    
    def _process_scheduled_notifications(self):
        """Processar notificações agendadas que devem ser enviadas"""
        now = datetime.now()
        to_send = []
        
        for notification_id, notification in list(self.scheduled_notifications.items()):
            if notification.scheduled_for <= now:
                to_send.append(notification)
                del self.scheduled_notifications[notification_id]
        
        for notification in to_send:
            asyncio.create_task(self.send_notification(notification))
    
    def cancel_notification(self, notification_id: str) -> bool:
        """Cancelar notificação agendada"""
        if notification_id in self.scheduled_notifications:
            notification = self.scheduled_notifications[notification_id]
            notification.status = NotificationStatus.CANCELLED
            self.notification_history.append(notification)
            del self.scheduled_notifications[notification_id]
            logger.info(f"Notificação {notification_id} cancelada")
            return True
        return False
    
    def cancel_event_notifications(self, event_id: str) -> int:
        """Cancelar todas as notificações de um evento"""
        cancelled_count = 0
        
        for notification_id, notification in list(self.scheduled_notifications.items()):
            if notification.event_id == event_id:
                self.cancel_notification(notification_id)
                cancelled_count += 1
        
        logger.info(f"{cancelled_count} notificações canceladas para evento {event_id}")
        return cancelled_count
    
    def get_notification_history(self, limit: int = 50) -> List[NotificationData]:
        """Obter histórico de notificações"""
        return sorted(
            self.notification_history, 
            key=lambda x: x.created_at or datetime.min, 
            reverse=True
        )[:limit]
    
    def get_scheduled_notifications(self) -> List[NotificationData]:
        """Obter notificações agendadas"""
        return list(self.scheduled_notifications.values())

# Templates de notificação
class NotificationTemplates:
    """Templates para diferentes tipos de notificação"""
    
    @staticmethod
    def get_meeting_reminder_email(title: str, date: str, time: str, location: str, description: str) -> str:
        return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🏢 Royal Negócios Agrícolas</h2>
            <h3>Lembrete de Reunião</h3>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #1f2937;">{title}</h4>
                <p style="margin: 5px 0;"><strong>📅 Data:</strong> {date}</p>
                <p style="margin: 5px 0;"><strong>🕐 Horário:</strong> {time}</p>
                <p style="margin: 5px 0;"><strong>📍 Local:</strong> {location}</p>
            </div>
            <div style="margin: 20px 0;">
                <h4>Descrição:</h4>
                <p>{description}</p>
            </div>
        </div>
        """
    
    @staticmethod
    def get_meeting_reminder_whatsapp(title: str, date: str, time: str, location: str, description: str) -> str:
        return f"""🏢 *Royal Negócios Agrícolas*

📅 *Lembrete de Reunião*

*{title}*

📅 Data: {date}
🕐 Horário: {time}
📍 Local: {location}

📝 {description}

⏰ Não esqueça de participar!"""

# Instância global do serviço
notification_service: Optional[NotificationService] = None

def initialize_notification_service(
    smtp_host: str = "smtp.gmail.com",
    smtp_port: int = 587,
    email_username: str = "",
    email_password: str = "",
    whatsapp_api_url: str = "http://localhost:3001/api"
) -> NotificationService:
    """Inicializar serviço de notificações"""
    global notification_service
    
    email_service = EmailService(smtp_host, smtp_port, email_username, email_password)
    whatsapp_service = WhatsAppService(whatsapp_api_url)
    
    notification_service = NotificationService(email_service, whatsapp_service)
    logger.info("Serviço de notificações inicializado")
    
    return notification_service

def get_notification_service() -> NotificationService:
    """Obter instância do serviço de notificações"""
    if notification_service is None:
        raise RuntimeError("Serviço de notificações não foi inicializado")
    return notification_service 