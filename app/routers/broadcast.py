"""
Router para APIs de Broadcast com Aprovação Manual
Integrado com sistema de autenticação existente
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from ..database.connection import get_db
from ..database.broadcast_models import BroadcastGroup, BroadcastCampaign, BroadcastStatus, BroadcastApproval, BroadcastRecipient
from ..services.broadcast_service import (
    get_broadcast_service, BroadcastRequest, ApprovalRequest
)
from ..middleware.auth_fastapi import requires_auth, requires_permission, requires_role, get_current_user
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/spr/broadcast", tags=["broadcast"])

# Schemas Pydantic para validação
class CreateBroadcastSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=200, description="Nome da campanha")
    message_content: str = Field(..., min_length=10, max_length=4000, description="Conteúdo da mensagem")
    group_id: int = Field(..., gt=0, description="ID do grupo de destinatários")
    scheduled_for: Optional[datetime] = Field(None, description="Data/hora para envio (opcional)")
    send_immediately: bool = Field(False, description="Enviar imediatamente após aprovação")
    max_recipients: int = Field(50, ge=1, le=100, description="Máximo de destinatários")

class ApprovalActionSchema(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|edit)$", description="Ação a ser executada")
    reason: Optional[str] = Field(None, max_length=500, description="Motivo da decisão")
    edited_message: Optional[str] = Field(None, max_length=4000, description="Mensagem editada (apenas para edit)")

class CreateGroupSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, description="Nome do grupo")
    description: Optional[str] = Field(None, max_length=500, description="Descrição do grupo")
    manual_contacts: List[dict] = Field(..., min_items=1, max_items=100, description="Lista de contatos")

# ENDPOINTS PARA GRUPOS

@router.get("/test")
async def test_endpoint():
    """Endpoint de teste simples"""
    return {"message": "Teste funcionando - v7", "status": "ok", "timestamp": "2025-01-31"}

@router.get("/groups")  
def list_groups():
    """Listar grupos de broadcast disponíveis"""
    try:
        # Teste directo com conexão de banco
        from ..database.connection import db_manager
        with db_manager.get_session() as db:
            # Consultar grupos com SQL direto
            from sqlalchemy import text
            rows = db.execute(text("""
                SELECT id, name, description, manual_contacts, created_by, created_at, auto_approve 
                FROM broadcast_groups 
                WHERE active = 1
                ORDER BY created_at DESC
            """)).fetchall()
            
            result = []
            for row in rows:
                # Processar manual_contacts JSON
                contacts = row.manual_contacts or "[]"
                if isinstance(contacts, str):
                    import json
                    try:
                        contacts = json.loads(contacts)
                    except:
                        contacts = []
                
                group_data = {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "contact_count": len(contacts or []),
                    "created_by": row.created_by,
                    "created_at": str(row.created_at) if row.created_at else None,
                    "auto_approve": bool(row.auto_approve)
                }
                result.append(group_data)
            
            return {
                "success": True,
                "message": f"Grupos carregados do banco de dados",
                "groups": result,
                "total": len(result)
            }
        
    except Exception as e:
        logger.error(f"Erro ao listar grupos: {e}")
        return {
            "success": False,
            "message": f"Erro ao consultar banco: {str(e)}",
            "groups": [],
            "total": 0
        }

@router.post("/groups")
# Autenticação via get_current_user dependency
async def create_group(
    group_data: CreateGroupSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Criar novo grupo de broadcast"""
    try:
        # Verificar se nome já existe
        existing = db.query(BroadcastGroup).filter(BroadcastGroup.name == group_data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Nome do grupo já existe")
        
        # Validar contatos
        if not group_data.manual_contacts:
            raise HTTPException(status_code=400, detail="Lista de contatos não pode estar vazia")
        
        # Criar grupo
        group = BroadcastGroup(
            name=group_data.name,
            description=group_data.description,
            manual_contacts=group_data.manual_contacts,
            created_by=current_user.get('username'),
            auto_approve=False  # Sempre manual na fase de testes
        )
        
        db.add(group)
        db.commit()
        db.refresh(group)
        
        return {
            "success": True,
            "group_id": group.id,
            "message": f"Grupo '{group.name}' criado com {len(group_data.manual_contacts)} contatos"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar grupo: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ENDPOINTS PARA CAMPANHAS

@router.post("/campaigns")
# Autenticação via get_current_user dependency
async def create_campaign(
    campaign_data: CreateBroadcastSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Criar nova campanha de broadcast"""
    try:
        broadcast_service = get_broadcast_service()
        
        # Converter para BroadcastRequest
        broadcast_request = BroadcastRequest(
            name=campaign_data.name,
            message_content=campaign_data.message_content,
            group_id=campaign_data.group_id,
            scheduled_for=campaign_data.scheduled_for,
            send_immediately=campaign_data.send_immediately,
            max_recipients=campaign_data.max_recipients
        )
        
        # Criar campanha
        result = await broadcast_service.create_campaign(
            request=broadcast_request,
            creator_username=current_user.get('username'),
            creator_role=current_user.get('roles', ['operator'])[0],
            db=db
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "campaign_id": result["campaign_id"],
            "status": result["status"],
            "total_recipients": result["total_recipients"],
            "message": "Campanha criada e enviada para aprovação"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar campanha: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/campaigns/pending")
# Autenticação via get_current_user dependency
async def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obter campanhas pendentes de aprovação"""
    try:
        broadcast_service = get_broadcast_service()
        
        campaigns = await broadcast_service.get_pending_approvals(
            user_role=current_user.get('roles', ['viewer'])[0],
            username=current_user.get('username'),
            db=db
        )
        
        return {
            "success": True,
            "campaigns": campaigns,
            "total": len(campaigns)
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar aprovações pendentes: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.post("/campaigns/{campaign_id}/approve")
# Autenticação via get_current_user dependency
async def process_approval(
    campaign_id: int,
    approval_data: ApprovalActionSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Processar aprovação/rejeição de campanha"""
    try:
        broadcast_service = get_broadcast_service()
        
        # Validações específicas para edição
        if approval_data.action == "edit":
            if current_user.get('roles', ['viewer'])[0] != "admin":
                raise HTTPException(status_code=403, detail="Apenas administradores podem editar campanhas")
            
            if not approval_data.edited_message:
                raise HTTPException(status_code=400, detail="Mensagem editada é obrigatória para edição")
        
        # Converter para ApprovalRequest
        approval_request = ApprovalRequest(
            campaign_id=campaign_id,
            action=approval_data.action,
            reason=approval_data.reason,
            edited_message=approval_data.edited_message
        )
        
        # Processar aprovação
        result = await broadcast_service.process_approval(
            request=approval_request,
            approver_username=current_user.get('username'),
            approver_role=current_user.get('roles', ['viewer'])[0],
            user_ip=request.client.host,
            db=db
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "action": result["action"],
            "campaign_id": result["campaign_id"],
            "new_status": result["new_status"],
            "message": f"Campanha {result['action']} com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar aprovação: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/campaigns/history")
# Autenticação via get_current_user dependency
async def get_campaign_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obter histórico de campanhas"""
    try:
        broadcast_service = get_broadcast_service()
        
        campaigns = await broadcast_service.get_campaign_history(
            user_role=current_user.get('roles', ['viewer'])[0],
            username=current_user.get('username'),
            limit=min(limit, 100),  # Máximo 100
            db=db
        )
        
        return {
            "success": True,
            "campaigns": campaigns,
            "total": len(campaigns)
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.get("/campaigns/{campaign_id}")
# Autenticação via get_current_user dependency
async def get_campaign_details(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obter detalhes de uma campanha específica"""
    try:
        campaign = db.query(BroadcastCampaign).filter(BroadcastCampaign.id == campaign_id).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campanha não encontrada")
        
        # Verificar permissões
        user_role = current_user.get('roles', ['viewer'])[0]
        username = current_user.get('username')
        
        if user_role == "operator" and campaign.created_by != username:
            raise HTTPException(status_code=403, detail="Acesso negado")
        
        # Buscar aprovações
        approvals = db.query(BroadcastApproval).filter(
            BroadcastApproval.campaign_id == campaign_id
        ).all()
        
        # Buscar destinatários (resumo)
        recipients_stats = db.query(BroadcastRecipient).filter(
            BroadcastRecipient.campaign_id == campaign_id
        ).all()
        
        return {
            "success": True,
            "campaign": {
                "id": campaign.id,
                "name": campaign.name,
                "message_content": campaign.message_content,
                "status": campaign.status.value,
                "created_by": campaign.created_by,
                "created_at": campaign.created_at.isoformat(),
                "updated_at": campaign.updated_at.isoformat() if campaign.updated_at else None,
                "total_recipients": campaign.total_recipients,
                "messages_sent": campaign.messages_sent,
                "messages_delivered": campaign.messages_delivered,
                "messages_failed": campaign.messages_failed,
                "change_log": campaign.change_log or [],
                "approvals": [
                    {
                        "id": approval.id,
                        "approver": approval.approver_username,
                        "status": approval.status.value,
                        "reason": approval.decision_reason,
                        "decided_at": approval.decided_at.isoformat() if approval.decided_at else None,
                        "original_message": approval.original_message,
                        "edited_message": approval.edited_message
                    }
                    for approval in approvals
                ],
                "recipients_summary": {
                    "total": len(recipients_stats),
                    "pending": len([r for r in recipients_stats if r.message_status == "pending"]),
                    "sent": len([r for r in recipients_stats if r.message_status == "sent"]),
                    "delivered": len([r for r in recipients_stats if r.message_status == "delivered"]),
                    "failed": len([r for r in recipients_stats if r.message_status == "failed"])
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes da campanha: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ENDPOINT DE STATUS GERAL

@router.get("/status")
# Autenticação via get_current_user dependency
async def get_broadcast_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Obter status geral do sistema de broadcast"""
    try:
        # Estatísticas gerais
        total_campaigns = db.query(BroadcastCampaign).count()
        pending_approvals = db.query(BroadcastCampaign).filter(
            BroadcastCampaign.status == BroadcastStatus.PENDING_APPROVAL
        ).count()
        
        # Estatísticas por usuário
        user_role = current_user.get('roles', ['viewer'])[0]
        username = current_user.get('username')
        
        my_campaigns = db.query(BroadcastCampaign)
        if user_role == "operator":
            my_campaigns = my_campaigns.filter(BroadcastCampaign.created_by == username)
        my_campaigns_count = my_campaigns.count()
        
        # Grupos ativos
        active_groups = db.query(BroadcastGroup).filter(BroadcastGroup.active == True).count()
        
        return {
            "success": True,
            "status": {
                "total_campaigns": total_campaigns,
                "pending_approvals": pending_approvals,
                "my_campaigns": my_campaigns_count,
                "active_groups": active_groups,
                "user_permissions": {
                    "can_create_campaigns": "write:whatsapp" in current_user.get('permissions', []),
                    "can_approve": "manage:whatsapp" in current_user.get('permissions', []),
                    "can_edit": user_role == "admin",
                    "can_create_groups": "manage:whatsapp" in current_user.get('permissions', [])
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar status do broadcast: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")