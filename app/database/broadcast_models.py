"""
Modelos de dados para o sistema de Broadcast com Aprovação Manual
Integração com o sistema existente de SQLAlchemy
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .connection import Base
import uuid
from datetime import datetime
from typing import Optional
import enum


class BroadcastStatus(enum.Enum):
    """Status dos broadcasts"""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ApprovalStatus(enum.Enum):
    """Status das aprovações"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class BroadcastGroup(Base):
    """Grupos de destinatários para broadcast"""
    __tablename__ = "broadcast_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    
    # Critérios de seleção
    contact_filter = Column(JSON)  # Filtros para seleção automática de contatos
    manual_contacts = Column(JSON)  # Lista manual de contatos/telefones
    
    # Configurações
    auto_approve = Column(Boolean, default=False)  # Para automação futura
    active = Column(Boolean, default=True)
    
    # Metadados
    created_by = Column(String(100))  # Username do criador
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    broadcasts = relationship("BroadcastCampaign", back_populates="group")
    
    def __repr__(self):
        return f"<BroadcastGroup(name='{self.name}', contacts={len(self.manual_contacts or [])})>"


class BroadcastCampaign(Base):
    """Campanhas de broadcast"""
    __tablename__ = "broadcast_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificação
    name = Column(String(200), nullable=False)
    message_content = Column(Text, nullable=False)
    
    # Relacionamentos
    group_id = Column(Integer, ForeignKey("broadcast_groups.id"), nullable=False)
    
    # Status e controle
    status = Column(Enum(BroadcastStatus), default=BroadcastStatus.DRAFT, index=True)
    priority = Column(String(20), default="medium")  # low, medium, high
    
    # Agendamento
    scheduled_for = Column(DateTime(timezone=True))
    send_immediately = Column(Boolean, default=False)
    
    # Configurações de envio
    max_recipients = Column(Integer, default=50)  # Limite de segurança
    send_interval_minutes = Column(Integer, default=1)  # Intervalo entre envios
    
    # Dados do criador
    created_by = Column(String(100), nullable=False)  # Username
    created_by_role = Column(String(50))  # Role do criador no momento
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    sent_at = Column(DateTime(timezone=True))
    
    # Estatísticas de envio
    total_recipients = Column(Integer, default=0)
    messages_sent = Column(Integer, default=0)
    messages_delivered = Column(Integer, default=0)
    messages_failed = Column(Integer, default=0)
    
    # Logs de alterações
    change_log = Column(JSON)  # Log de todas as alterações
    
    # Relacionamentos
    group = relationship("BroadcastGroup", back_populates="broadcasts")
    approvals = relationship("BroadcastApproval", back_populates="campaign")
    recipients = relationship("BroadcastRecipient", back_populates="campaign")
    
    # Índices compostos
    __table_args__ = (
        Index('idx_status_created', 'status', 'created_at'),
        Index('idx_creator_status', 'created_by', 'status'),
        Index('idx_scheduled_status', 'scheduled_for', 'status'),
    )
    
    def __repr__(self):
        return f"<BroadcastCampaign(name='{self.name}', status='{self.status.value}', recipients={self.total_recipients})>"


class BroadcastApproval(Base):
    """Sistema de aprovações para broadcasts"""
    __tablename__ = "broadcast_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("broadcast_campaigns.id"), nullable=False)
    
    # Dados do aprovador
    approver_username = Column(String(100), nullable=False)
    approver_role = Column(String(50), nullable=False)
    
    # Status e decisão
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    decision_reason = Column(Text)  # Motivo da aprovação/rejeição
    
    # Alterações feitas (se admin editou)
    original_message = Column(Text)  # Mensagem original antes da edição
    edited_message = Column(Text)    # Mensagem após edição
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    decided_at = Column(DateTime(timezone=True))
    
    # Relacionamentos
    campaign = relationship("BroadcastCampaign", back_populates="approvals")
    
    # Índices
    __table_args__ = (
        Index('idx_campaign_status', 'campaign_id', 'status'),
        Index('idx_approver_status', 'approver_username', 'status'),
        Index('idx_status_created', 'status', 'created_at'),
    )
    
    def __repr__(self):
        return f"<BroadcastApproval(campaign_id={self.campaign_id}, approver='{self.approver_username}', status='{self.status.value}')>"


class BroadcastRecipient(Base):
    """Destinatários específicos de cada broadcast"""
    __tablename__ = "broadcast_recipients"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("broadcast_campaigns.id"), nullable=False)
    
    # Dados do destinatário
    phone_number = Column(String(20), nullable=False, index=True)
    contact_name = Column(String(100))
    
    # Status de envio
    message_status = Column(String(20), default="pending")  # pending, sent, delivered, read, failed
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    read_at = Column(DateTime(timezone=True))
    
    # Dados da mensagem
    whatsapp_message_id = Column(String(100))  # ID retornado pelo WhatsApp
    error_message = Column(Text)  # Erro em caso de falha
    
    # Tentativas de envio
    send_attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime(timezone=True))
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    campaign = relationship("BroadcastCampaign", back_populates="recipients")
    
    # Índices compostos
    __table_args__ = (
        Index('idx_campaign_status', 'campaign_id', 'message_status'),
        Index('idx_phone_status', 'phone_number', 'message_status'),
        Index('idx_campaign_sent', 'campaign_id', 'sent_at'),
    )
    
    def __repr__(self):
        return f"<BroadcastRecipient(campaign_id={self.campaign_id}, phone='{self.phone_number}', status='{self.message_status}')>"


class BroadcastLog(Base):
    """Log detalhado de todas as ações do sistema de broadcast"""
    __tablename__ = "broadcast_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificação
    action_type = Column(String(50), nullable=False, index=True)  # create, approve, reject, edit, send, etc.
    entity_type = Column(String(50), nullable=False)  # campaign, group, approval
    entity_id = Column(Integer, nullable=False)
    
    # Dados do usuário
    username = Column(String(100), nullable=False)
    user_role = Column(String(50))
    user_ip = Column(String(45))  # IPv4/IPv6
    
    # Dados da ação
    description = Column(Text, nullable=False)
    old_data = Column(JSON)  # Estado anterior (para alterações)
    new_data = Column(JSON)  # Estado posterior (para alterações)
    
    # Contexto adicional
    log_metadata = Column(JSON)  # Dados extras como user-agent, etc.
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Índices compostos
    __table_args__ = (
        Index('idx_action_entity', 'action_type', 'entity_type', 'entity_id'),
        Index('idx_user_action', 'username', 'action_type'),
        Index('idx_entity_created', 'entity_type', 'entity_id', 'created_at'),
    )
    
    def __repr__(self):
        return f"<BroadcastLog(action='{self.action_type}', user='{self.username}', entity={self.entity_type}:{self.entity_id})>"


# Função de conveniência para logging
def log_broadcast_action(
    action_type: str,
    entity_type: str,
    entity_id: int,
    username: str,
    description: str,
    user_role: str = None,
    user_ip: str = None,
    old_data: dict = None,
    new_data: dict = None,
    metadata: dict = None
):
    """
    Função helper para criar logs de ações do broadcast
    
    Exemplo de uso:
    log_broadcast_action(
        action_type="approve",
        entity_type="campaign",
        entity_id=123,
        username="cadu",
        description="Campanha aprovada após revisão",
        user_role="admin",
        old_data={"status": "pending_approval"},
        new_data={"status": "approved"}
    )
    """
    from .connection import get_db_session
    
    try:
        db = next(get_db_session())
        
        log_entry = BroadcastLog(
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            username=username,
            user_role=user_role,
            user_ip=user_ip,
            description=description,
            old_data=old_data,
            new_data=new_data,
            metadata=metadata or {}
        )
        
        db.add(log_entry)
        db.commit()
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao criar log de broadcast: {e}")