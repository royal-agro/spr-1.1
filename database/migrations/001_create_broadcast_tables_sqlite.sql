-- Migration 001: Criar tabelas para sistema de broadcast (SQLite)
-- Data: 2025-01-31
-- Autor: Claude (Sistema SPR)

-- 1. Tabela de grupos de broadcast
CREATE TABLE IF NOT EXISTS broadcast_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    contact_filter TEXT, -- JSON como TEXT no SQLite
    manual_contacts TEXT, -- JSON como TEXT no SQLite
    auto_approve BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- 2. Tabela de campanhas de broadcast
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    message_content TEXT NOT NULL,
    group_id INTEGER NOT NULL REFERENCES broadcast_groups(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 
        'scheduled', 'sending', 'sent', 'failed', 'cancelled'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    scheduled_for DATETIME,
    send_immediately BOOLEAN DEFAULT 0,
    max_recipients INTEGER DEFAULT 50,
    created_by VARCHAR(100) NOT NULL,
    created_by_role VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    sent_at DATETIME,
    total_recipients INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    change_log TEXT -- JSON como TEXT no SQLite
);

-- 3. Tabela de aprovações
CREATE TABLE IF NOT EXISTS broadcast_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    approver_username VARCHAR(100) NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled'
    )),
    decision_reason TEXT,
    original_message TEXT,
    edited_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME,
    
    -- Constraint único
    UNIQUE (campaign_id, approver_username)
);

-- 4. Tabela de destinatários
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(100),
    message_status VARCHAR(20) DEFAULT 'pending' CHECK (message_status IN (
        'pending', 'sent', 'delivered', 'read', 'failed'
    )),
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    whatsapp_message_id VARCHAR(100),
    error_message TEXT,
    send_attempts INTEGER DEFAULT 0,
    last_attempt_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- 5. Tabela de logs de broadcast
CREATE TABLE IF NOT EXISTS broadcast_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(50),
    user_ip VARCHAR(45),
    description TEXT NOT NULL,
    old_data TEXT, -- JSON como TEXT no SQLite
    new_data TEXT, -- JSON como TEXT no SQLite
    metadata TEXT, -- JSON como TEXT no SQLite
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status_created 
    ON broadcast_campaigns(status, created_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_creator_status 
    ON broadcast_campaigns(created_by, status);

CREATE INDEX IF NOT EXISTS idx_broadcast_approvals_campaign_status 
    ON broadcast_approvals(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign_status 
    ON broadcast_recipients(campaign_id, message_status);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_action_entity 
    ON broadcast_logs(action_type, entity_type, entity_id);

-- Inserir grupos padrão
INSERT OR IGNORE INTO broadcast_groups (name, description, manual_contacts, created_by, auto_approve) VALUES
(
    'Produtores de Soja',
    'Produtores especializados em soja',
    '[
        {"phone": "5511999999001", "name": "João Silva - Fazenda Santa Maria"},
        {"phone": "5511999999002", "name": "Maria Santos - Cooperativa Agrícola"},
        {"phone": "5511999999003", "name": "Pedro Oliveira - Agropecuária PO"}
    ]',
    'admin',
    0
),
(
    'Produtores de Milho',
    'Produtores especializados em milho',
    '[
        {"phone": "5511999999004", "name": "Ana Costa - Fazenda Boa Vista"},
        {"phone": "5511999999005", "name": "Carlos Lima - Grupo Agrícola CL"},
        {"phone": "5511999999006", "name": "Lucia Torres - LT Agronegócios"}
    ]',
    'admin',
    0
),
(
    'Grupo Teste',
    'Grupo para testes do sistema (números fictícios)',
    '[
        {"phone": "5511000000001", "name": "Teste Admin - Administrador"},
        {"phone": "5511000000002", "name": "Teste Manager - Gerente"},
        {"phone": "5511000000003", "name": "Teste Operator - Operador"}
    ]',
    'admin',
    0
);

-- Log da migração
INSERT INTO broadcast_logs (
    action_type, 
    entity_type, 
    entity_id, 
    username, 
    description, 
    metadata
) VALUES (
    'migration',
    'system',
    1,
    'system',
    'Tabelas de broadcast criadas e dados iniciais inseridos (SQLite)',
    '{"migration": "001_create_broadcast_tables_sqlite", "date": "2025-01-31"}'
);