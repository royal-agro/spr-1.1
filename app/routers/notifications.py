"""
Rotas FastAPI para gerenciamento de notificações
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging

from ..services.notification_service import (
    NotificationService,
    NotificationData,
    NotificationType,
    NotificationPriority,
    NotificationStatus,
    NotificationTemplates,
    get_notification_service
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])

# Modelos Pydantic
class NotificationRequest(BaseModel):
    type: str  # "email", "whatsapp", "both"
    recipients: List[str]
    subject: str
    message: str
    priority: str = "medium"
    scheduled_for: Optional[datetime] = None
    event_id: Optional[str] = None

class EventReminderRequest(BaseModel):
    event_id: str
    title: str
    description: str
    date: datetime
    location: str
    attendees: List[EmailStr]
    reminder_type: str = "1hour"  # "now", "1hour", "1day"
    event_type: str = "meeting"  # "meeting", "webinar", "report"
    join_url: Optional[str] = None
    whatsapp_notification: bool = True
    email_notification: bool = True

class NotificationResponse(BaseModel):
    id: str
    status: str
    message: str

class NotificationHistoryResponse(BaseModel):
    id: str
    type: str
    status: str
    recipients: List[str]
    subject: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    event_id: Optional[str] = None

@router.post("/send", response_model=NotificationResponse)
async def send_notification(
    request: NotificationRequest,
    background_tasks: BackgroundTasks
):
    """Enviar notificação imediatamente"""
    try:
        service = get_notification_service()
        
        notification = NotificationData(
            id=str(uuid.uuid4()),
            type=NotificationType(request.type),
            recipients=request.recipients,
            subject=request.subject,
            message=request.message,
            priority=NotificationPriority(request.priority),
            event_id=request.event_id,
            created_at=datetime.now()
        )
        
        # Enviar em background
        background_tasks.add_task(service.send_notification, notification)
        
        return NotificationResponse(
            id=notification.id,
            status="sending",
            message="Notificação sendo enviada"
        )
        
    except Exception as e:
        logger.error(f"Erro ao enviar notificação: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/schedule", response_model=NotificationResponse)
async def schedule_notification(request: NotificationRequest):
    """Agendar notificação para envio futuro"""
    try:
        service = get_notification_service()
        
        if not request.scheduled_for:
            raise HTTPException(status_code=400, detail="scheduled_for é obrigatório")
        
        notification = NotificationData(
            id=str(uuid.uuid4()),
            type=NotificationType(request.type),
            recipients=request.recipients,
            subject=request.subject,
            message=request.message,
            priority=NotificationPriority(request.priority),
            scheduled_for=request.scheduled_for,
            event_id=request.event_id,
            created_at=datetime.now()
        )
        
        notification_id = service.schedule_notification(notification)
        
        return NotificationResponse(
            id=notification_id,
            status="scheduled",
            message=f"Notificação agendada para {request.scheduled_for}"
        )
        
    except Exception as e:
        logger.error(f"Erro ao agendar notificação: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/event-reminder", response_model=NotificationResponse)
async def send_event_reminder(
    request: EventReminderRequest,
    background_tasks: BackgroundTasks
):
    """Enviar lembrete de evento com templates personalizados"""
    try:
        service = get_notification_service()
        
        # Formatar data e hora
        date_str = request.date.strftime("%d/%m/%Y")
        time_str = request.date.strftime("%H:%M")
        
        # Determinar quando enviar
        scheduled_for = None
        if request.reminder_type == "1hour":
            scheduled_for = request.date - timedelta(hours=1)
        elif request.reminder_type == "1day":
            scheduled_for = request.date - timedelta(days=1)
        else:
            scheduled_for = datetime.now()
        
        notifications_sent = []
        
        # Enviar email se solicitado
        if request.email_notification:
            email_content = NotificationTemplates.get_meeting_reminder_email(
                title=request.title,
                date=date_str,
                time=time_str,
                location=request.location,
                description=request.description
            )
            
            email_notification = NotificationData(
                id=str(uuid.uuid4()),
                type=NotificationType.EMAIL,
                recipients=[str(email) for email in request.attendees],
                subject=f"📅 Lembrete: {request.title}",
                message=email_content,
                priority=NotificationPriority.MEDIUM,
                scheduled_for=scheduled_for,
                event_id=request.event_id,
                created_at=datetime.now()
            )
            
            if scheduled_for <= datetime.now():
                background_tasks.add_task(service.send_notification, email_notification)
            else:
                service.schedule_notification(email_notification)
            
            notifications_sent.append(email_notification.id)
        
        # Enviar WhatsApp se solicitado
        if request.whatsapp_notification:
            whatsapp_content = NotificationTemplates.get_meeting_reminder_whatsapp(
                title=request.title,
                date=date_str,
                time=time_str,
                location=request.location,
                description=request.description
            )
            
            whatsapp_notification = NotificationData(
                id=str(uuid.uuid4()),
                type=NotificationType.WHATSAPP,
                recipients=[str(email) for email in request.attendees],
                subject=request.title,
                message=whatsapp_content,
                priority=NotificationPriority.MEDIUM,
                scheduled_for=scheduled_for,
                event_id=request.event_id,
                created_at=datetime.now()
            )
            
            if scheduled_for <= datetime.now():
                background_tasks.add_task(service.send_notification, whatsapp_notification)
            else:
                service.schedule_notification(whatsapp_notification)
            
            notifications_sent.append(whatsapp_notification.id)
        
        return NotificationResponse(
            id=request.event_id,
            status="scheduled" if scheduled_for > datetime.now() else "sending",
            message=f"{len(notifications_sent)} notificações criadas"
        )
        
    except Exception as e:
        logger.error(f"Erro ao enviar lembrete: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cancel/{notification_id}")
async def cancel_notification(notification_id: str):
    """Cancelar notificação agendada"""
    try:
        service = get_notification_service()
        
        success = service.cancel_notification(notification_id)
        
        if success:
            return {"message": "Notificação cancelada com sucesso"}
        else:
            raise HTTPException(status_code=404, detail="Notificação não encontrada")
            
    except Exception as e:
        logger.error(f"Erro ao cancelar notificação: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cancel-event/{event_id}")
async def cancel_event_notifications(event_id: str):
    """Cancelar todas as notificações de um evento"""
    try:
        service = get_notification_service()
        
        cancelled_count = service.cancel_event_notifications(event_id)
        
        return {
            "message": f"{cancelled_count} notificações canceladas",
            "cancelled_count": cancelled_count
        }
        
    except Exception as e:
        logger.error(f"Erro ao cancelar notificações do evento: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[NotificationHistoryResponse])
async def get_notification_history(limit: int = 50):
    """Obter histórico de notificações"""
    try:
        service = get_notification_service()
        
        history = service.get_notification_history(limit)
        
        return [
            NotificationHistoryResponse(
                id=notification.id,
                type=notification.type.value,
                status=notification.status.value,
                recipients=notification.recipients,
                subject=notification.subject,
                created_at=notification.created_at,
                sent_at=notification.sent_at,
                event_id=notification.event_id
            )
            for notification in history
        ]
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scheduled", response_model=List[NotificationHistoryResponse])
async def get_scheduled_notifications():
    """Obter notificações agendadas"""
    try:
        service = get_notification_service()
        
        scheduled = service.get_scheduled_notifications()
        
        return [
            NotificationHistoryResponse(
                id=notification.id,
                type=notification.type.value,
                status=notification.status.value,
                recipients=notification.recipients,
                subject=notification.subject,
                created_at=notification.created_at,
                sent_at=notification.sent_at,
                event_id=notification.event_id
            )
            for notification in scheduled
        ]
        
    except Exception as e:
        logger.error(f"Erro ao buscar notificações agendadas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-email")
async def test_email_notification(
    recipients: List[EmailStr],
    background_tasks: BackgroundTasks
):
    """Testar envio de email"""
    try:
        service = get_notification_service()
        
        test_notification = NotificationData(
            id=str(uuid.uuid4()),
            type=NotificationType.EMAIL,
            recipients=[str(email) for email in recipients],
            subject="🧪 Teste de Email - SPR",
            message="""
            <h2>Teste de Email - Royal Negócios Agrícolas</h2>
            <p>Este é um email de teste do sistema SPR.</p>
            <p>Se você recebeu esta mensagem, o sistema de notificações está funcionando corretamente!</p>
            <p>Data do teste: {}</p>
            """.format(datetime.now().strftime("%d/%m/%Y %H:%M:%S")),
            priority=NotificationPriority.LOW,
            created_at=datetime.now()
        )
        
        background_tasks.add_task(service.send_notification, test_notification)
        
        return {
            "message": "Email de teste sendo enviado",
            "notification_id": test_notification.id
        }
        
    except Exception as e:
        logger.error(f"Erro ao enviar email de teste: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-whatsapp")
async def test_whatsapp_notification(
    recipients: List[str],
    background_tasks: BackgroundTasks
):
    """Testar envio de WhatsApp"""
    try:
        service = get_notification_service()
        
        test_notification = NotificationData(
            id=str(uuid.uuid4()),
            type=NotificationType.WHATSAPP,
            recipients=recipients,
            subject="Teste WhatsApp",
            message="""🧪 *Teste de WhatsApp - SPR*

🏢 *Royal Negócios Agrícolas*

Este é um teste do sistema de notificações via WhatsApp.

Se você recebeu esta mensagem, o sistema está funcionando corretamente! ✅

📅 Data do teste: {}""".format(datetime.now().strftime("%d/%m/%Y %H:%M:%S")),
            priority=NotificationPriority.LOW,
            created_at=datetime.now()
        )
        
        background_tasks.add_task(service.send_notification, test_notification)
        
        return {
            "message": "Mensagem WhatsApp de teste sendo enviada",
            "notification_id": test_notification.id
        }
        
    except Exception as e:
        logger.error(f"Erro ao enviar WhatsApp de teste: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 