"""
Serviço de Broadcast com Aprovação Manual
Integra com WhatsAppService e NotificationService existentes
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from ..database.broadcast_models import (
    BroadcastGroup, BroadcastCampaign, BroadcastApproval, BroadcastRecipient, 
    BroadcastStatus, ApprovalStatus, log_broadcast_action
)
from ..database.connection import get_db
from .whatsapp_service import get_whatsapp_service
from .notification_service import get_notification_service

logger = logging.getLogger(__name__)

@dataclass
class BroadcastRequest:
    """Request para criação de broadcast"""
    name: str
    message_content: str
    group_id: int
    scheduled_for: Optional[datetime] = None
    send_immediately: bool = False
    max_recipients: int = 50


@dataclass
class ApprovalRequest:
    """Request para aprovação/rejeição"""
    campaign_id: int
    action: str  # approve, reject, edit
    reason: Optional[str] = None
    edited_message: Optional[str] = None


class BroadcastService:
    """Serviço principal de broadcast com aprovação manual"""
    
    def __init__(self):
        self.whatsapp_service = get_whatsapp_service()
        self.notification_service = get_notification_service()
        
    async def create_campaign(
        self, 
        request: BroadcastRequest, 
        creator_username: str, 
        creator_role: str,
        db: Session
    ) -> Dict:
        """Criar nova campanha de broadcast"""
        try:
            # Validar grupo
            group = db.query(BroadcastGroup).filter(BroadcastGroup.id == request.group_id).first()
            if not group:
                return {"success": False, "error": "Grupo não encontrado"}
            
            if not group.active:
                return {"success": False, "error": "Grupo inativo"}
            
            # Calcular total de destinatários
            total_recipients = len(group.manual_contacts or [])
            if total_recipients == 0:
                return {"success": False, "error": "Grupo sem destinatários"}
            
            if total_recipients > request.max_recipients:
                return {"success": False, "error": f"Muitos destinatários ({total_recipients}). Máximo: {request.max_recipients}"}
            
            # Criar campanha
            campaign = BroadcastCampaign(
                name=request.name,
                message_content=request.message_content,
                group_id=request.group_id,
                scheduled_for=request.scheduled_for,
                send_immediately=request.send_immediately,
                max_recipients=request.max_recipients,
                created_by=creator_username,
                created_by_role=creator_role,
                total_recipients=total_recipients,
                status=BroadcastStatus.PENDING_APPROVAL,
                change_log=[{
                    "action": "created",
                    "timestamp": datetime.now().isoformat(),
                    "user": creator_username,
                    "data": asdict(request)
                }]
            )
            
            db.add(campaign)
            db.flush()  # Para obter o ID
            
            # Criar destinatários
            await self._create_recipients(campaign, group, db)
            
            # Log da ação
            log_broadcast_action(
                action_type="create",
                entity_type="campaign",
                entity_id=campaign.id,
                username=creator_username,
                description=f"Campanha '{request.name}' criada com {total_recipients} destinatários",
                user_role=creator_role,
                new_data={"status": "pending_approval", "recipients": total_recipients}
            )
            
            db.commit()
            
            # Notificar aprovadores
            await self._notify_approvers(campaign)
            
            return {
                "success": True,
                "campaign_id": campaign.id,
                "status": campaign.status.value,
                "total_recipients": total_recipients
            }
            
        except Exception as e:
            logger.error(f"Erro ao criar campanha: {e}")
            db.rollback()
            return {"success": False, "error": f"Erro interno: {str(e)}"}
    
    async def _create_recipients(self, campaign: BroadcastCampaign, group: BroadcastGroup, db: Session):
        """Criar registros de destinatários"""
        contacts = group.manual_contacts or []
        
        for contact in contacts:
            phone = contact.get("phone") if isinstance(contact, dict) else str(contact)
            name = contact.get("name", f"Contato {phone[-4:]}") if isinstance(contact, dict) else f"Contato {phone[-4:]}"
            
            recipient = BroadcastRecipient(
                campaign_id=campaign.id,
                phone_number=phone,
                contact_name=name,
                message_status="pending"
            )
            db.add(recipient)
    
    async def _notify_approvers(self, campaign: BroadcastCampaign):
        """Notificar usuários que podem aprovar"""
        try:
            # Aqui você enviaria notificações para managers/admins
            # Integrar com o notification_service existente
            
            message = f"""
            🔔 Nova campanha de broadcast para aprovação
            
            📊 Campanha: {campaign.name}
            👤 Criador: {campaign.created_by}
            📱 Destinatários: {campaign.total_recipients}
            
            Acesse /aprovacoes para revisar
            """
            
            # Enviar para admins/managers (implementar conforme necessário)
            logger.info(f"Notificação de aprovação enviada para campanha {campaign.id}")
            
        except Exception as e:
            logger.error(f"Erro ao notificar aprovadores: {e}")
    
    async def get_pending_approvals(
        self, 
        user_role: str, 
        username: str, 
        db: Session
    ) -> List[Dict]:
        """Obter campanhas pendentes de aprovação"""
        try:
            # Filtros baseados no role
            if user_role not in ["admin", "manager"]:
                return []
            
            campaigns = db.query(BroadcastCampaign).filter(
                BroadcastCampaign.status == BroadcastStatus.PENDING_APPROVAL
            ).order_by(desc(BroadcastCampaign.created_at)).all()
            
            result = []
            for campaign in campaigns:
                # Buscar aprovações existentes
                existing_approval = db.query(BroadcastApproval).filter(
                    and_(
                        BroadcastApproval.campaign_id == campaign.id,
                        BroadcastApproval.approver_username == username
                    )
                ).first()
                
                campaign_data = {
                    "id": campaign.id,
                    "name": campaign.name,
                    "message_content": campaign.message_content,
                    "created_by": campaign.created_by,
                    "created_by_role": campaign.created_by_role,
                    "created_at": campaign.created_at.isoformat(),
                    "total_recipients": campaign.total_recipients,
                    "scheduled_for": campaign.scheduled_for.isoformat() if campaign.scheduled_for else None,
                    "group_name": campaign.group.name if campaign.group else "Grupo desconhecido",
                    "priority": campaign.priority,
                    "can_approve": user_role in ["admin", "manager"],
                    "can_edit": user_role == "admin",
                    "already_voted": existing_approval is not None,
                    "my_vote": existing_approval.status.value if existing_approval else None
                }
                
                result.append(campaign_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao buscar aprovações pendentes: {e}")
            return []
    
    async def process_approval(
        self, 
        request: ApprovalRequest, 
        approver_username: str, 
        approver_role: str,
        user_ip: str,
        db: Session
    ) -> Dict:
        """Processar aprovação/rejeição/edição"""
        try:
            # Validar permissões
            if approver_role not in ["admin", "manager"]:
                return {"success": False, "error": "Permissão insuficiente"}
            
            if request.action == "edit" and approver_role != "admin":
                return {"success": False, "error": "Apenas admins podem editar"}
            
            # Buscar campanha
            campaign = db.query(BroadcastCampaign).filter(
                BroadcastCampaign.id == request.campaign_id
            ).first()
            
            if not campaign:
                return {"success": False, "error": "Campanha não encontrada"}
            
            if campaign.status != BroadcastStatus.PENDING_APPROVAL:
                return {"success": False, "error": f"Campanha não está pendente de aprovação (status: {campaign.status.value})"}
            
            # Verificar se já aprovou/rejeitou
            existing_approval = db.query(BroadcastApproval).filter(
                and_(
                    BroadcastApproval.campaign_id == request.campaign_id,
                    BroadcastApproval.approver_username == approver_username
                )
            ).first()
            
            if existing_approval and request.action != "edit":
                return {"success": False, "error": "Você já votou nesta campanha"}
            
            # Processar ação
            if request.action == "approve":
                return await self._approve_campaign(campaign, request, approver_username, approver_role, user_ip, db)
            elif request.action == "reject":
                return await self._reject_campaign(campaign, request, approver_username, approver_role, user_ip, db)
            elif request.action == "edit":
                return await self._edit_campaign(campaign, request, approver_username, approver_role, user_ip, db)
            else:
                return {"success": False, "error": "Ação inválida"}
                
        except Exception as e:
            logger.error(f"Erro ao processar aprovação: {e}")
            db.rollback()
            return {"success": False, "error": f"Erro interno: {str(e)}"}
    
    async def _approve_campaign(
        self, 
        campaign: BroadcastCampaign, 
        request: ApprovalRequest,
        approver_username: str,
        approver_role: str,
        user_ip: str,
        db: Session
    ) -> Dict:
        """Aprovar campanha"""
        # Criar registro de aprovação
        approval = BroadcastApproval(
            campaign_id=campaign.id,
            approver_username=approver_username,
            approver_role=approver_role,
            status=ApprovalStatus.APPROVED,
            decision_reason=request.reason,
            decided_at=datetime.now()
        )
        db.add(approval)
        
        # Atualizar status da campanha
        old_status = campaign.status.value
        campaign.status = BroadcastStatus.APPROVED
        campaign.updated_at = datetime.now()
        
        # Atualizar log de mudanças
        if not campaign.change_log:
            campaign.change_log = []
        
        campaign.change_log.append({
            "action": "approved",
            "timestamp": datetime.now().isoformat(),
            "user": approver_username,
            "role": approver_role,
            "reason": request.reason
        })
        
        # Log da ação
        log_broadcast_action(
            action_type="approve",
            entity_type="campaign",
            entity_id=campaign.id,
            username=approver_username,
            description=f"Campanha '{campaign.name}' aprovada",
            user_role=approver_role,
            user_ip=user_ip,
            old_data={"status": old_status},
            new_data={"status": "approved"},
            metadata={"reason": request.reason}
        )
        
        db.commit()
        
        # Se deve enviar imediatamente, agendar envio
        if campaign.send_immediately:
            await self._schedule_immediate_send(campaign)
        
        return {
            "success": True,
            "action": "approved",
            "campaign_id": campaign.id,
            "new_status": campaign.status.value
        }
    
    async def _reject_campaign(
        self, 
        campaign: BroadcastCampaign, 
        request: ApprovalRequest,
        approver_username: str,
        approver_role: str,
        user_ip: str,
        db: Session
    ) -> Dict:
        """Rejeitar campanha"""
        approval = BroadcastApproval(
            campaign_id=campaign.id,
            approver_username=approver_username,
            approver_role=approver_role,
            status=ApprovalStatus.REJECTED,
            decision_reason=request.reason,
            decided_at=datetime.now()
        )
        db.add(approval)
        
        old_status = campaign.status.value
        campaign.status = BroadcastStatus.REJECTED
        campaign.updated_at = datetime.now()
        
        if not campaign.change_log:
            campaign.change_log = []
        
        campaign.change_log.append({
            "action": "rejected",
            "timestamp": datetime.now().isoformat(),
            "user": approver_username,
            "role": approver_role,
            "reason": request.reason
        })
        
        log_broadcast_action(
            action_type="reject",
            entity_type="campaign",
            entity_id=campaign.id,
            username=approver_username,
            description=f"Campanha '{campaign.name}' rejeitada",
            user_role=approver_role,
            user_ip=user_ip,
            old_data={"status": old_status},
            new_data={"status": "rejected"},
            metadata={"reason": request.reason}
        )
        
        db.commit()
        
        return {
            "success": True,
            "action": "rejected",
            "campaign_id": campaign.id,
            "new_status": campaign.status.value
        }
    
    async def _edit_campaign(
        self, 
        campaign: BroadcastCampaign, 
        request: ApprovalRequest,
        approver_username: str,
        approver_role: str,
        user_ip: str,
        db: Session
    ) -> Dict:
        """Editar e aprovar campanha (apenas admin)"""
        if not request.edited_message:
            return {"success": False, "error": "Mensagem editada é obrigatória"}
        
        # Salvar versão original
        original_message = campaign.message_content
        
        # Criar/atualizar aprovação
        approval = db.query(BroadcastApproval).filter(
            and_(
                BroadcastApproval.campaign_id == campaign.id,
                BroadcastApproval.approver_username == approver_username
            )
        ).first()
        
        if not approval:
            approval = BroadcastApproval(
                campaign_id=campaign.id,
                approver_username=approver_username,
                approver_role=approver_role
            )
            db.add(approval)
        
        approval.status = ApprovalStatus.APPROVED
        approval.decision_reason = request.reason
        approval.original_message = original_message
        approval.edited_message = request.edited_message
        approval.decided_at = datetime.now()
        
        # Atualizar campanha
        campaign.message_content = request.edited_message
        campaign.status = BroadcastStatus.APPROVED
        campaign.updated_at = datetime.now()
        
        if not campaign.change_log:
            campaign.change_log = []
        
        campaign.change_log.append({
            "action": "edited_and_approved",
            "timestamp": datetime.now().isoformat(),
            "user": approver_username,
            "role": approver_role,
            "reason": request.reason,
            "original_message": original_message,
            "edited_message": request.edited_message
        })
        
        log_broadcast_action(
            action_type="edit_and_approve",
            entity_type="campaign",
            entity_id=campaign.id,
            username=approver_username,
            description=f"Campanha '{campaign.name}' editada e aprovada",
            user_role=approver_role,
            user_ip=user_ip,
            old_data={"status": "pending_approval", "message": original_message},
            new_data={"status": "approved", "message": request.edited_message},
            metadata={"reason": request.reason}
        )
        
        db.commit()
        
        return {
            "success": True,
            "action": "edited_and_approved",
            "campaign_id": campaign.id,
            "new_status": campaign.status.value,
            "original_message": original_message,
            "edited_message": request.edited_message
        }
    
    async def _schedule_immediate_send(self, campaign: BroadcastCampaign):
        """Agendar envio imediato (implementar conforme necessário)"""
        try:
            # Aqui você implementaria o agendamento real
            # Por exemplo, usando Celery, RQ, ou similar
            logger.info(f"Agendando envio imediato para campanha {campaign.id}")
            
            # Para a fase de testes, apenas logar
            # await self._execute_broadcast(campaign.id)
            
        except Exception as e:
            logger.error(f"Erro ao agendar envio: {e}")
    
    async def get_campaign_history(
        self, 
        user_role: str, 
        username: str, 
        db: Session,
        limit: int = 50
    ) -> List[Dict]:
        """Obter histórico de campanhas"""
        try:
            query = db.query(BroadcastCampaign)
            
            # Filtros baseados no role
            if user_role == "operator":
                # Operadores só veem suas próprias campanhas
                query = query.filter(BroadcastCampaign.created_by == username)
            
            campaigns = query.order_by(desc(BroadcastCampaign.created_at)).limit(limit).all()
            
            result = []
            for campaign in campaigns:
                # Buscar aprovações
                approvals = db.query(BroadcastApproval).filter(
                    BroadcastApproval.campaign_id == campaign.id
                ).all()
                
                campaign_data = {
                    "id": campaign.id,
                    "name": campaign.name,
                    "status": campaign.status.value,
                    "created_by": campaign.created_by,
                    "created_at": campaign.created_at.isoformat(),
                    "total_recipients": campaign.total_recipients,
                    "messages_sent": campaign.messages_sent,
                    "messages_delivered": campaign.messages_delivered,
                    "messages_failed": campaign.messages_failed,
                    "approvals": [
                        {
                            "approver": approval.approver_username,
                            "status": approval.status.value,
                            "decided_at": approval.decided_at.isoformat() if approval.decided_at else None,
                            "reason": approval.decision_reason
                        }
                        for approval in approvals
                    ]
                }
                
                result.append(campaign_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao buscar histórico: {e}")
            return []


# Instância global do serviço
broadcast_service = None

def get_broadcast_service() -> BroadcastService:
    """Obter instância do serviço de broadcast"""
    global broadcast_service
    if broadcast_service is None:
        broadcast_service = BroadcastService()
    return broadcast_service