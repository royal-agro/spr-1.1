-- Migration 001: Criar tabelas para sistema de broadcast
-- Data: 2025-01-31
-- Autor: Claude (Sistema SPR)

-- 1. Tabela de grupos de broadcast
CREATE TABLE IF NOT EXISTS broadcast_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    contact_filter JSONB,
    manual_contacts JSONB,
    auto_approve BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT broadcast_groups_name_unique UNIQUE (name)
);

-- 2. Tabela de campanhas de broadcast
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    message_content TEXT NOT NULL,
    group_id INTEGER NOT NULL REFERENCES broadcast_groups(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 
        'scheduled', 'sending', 'sent', 'failed', 'cancelled'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    send_immediately BOOLEAN DEFAULT FALSE,
    max_recipients INTEGER DEFAULT 50,
    created_by VARCHAR(100) NOT NULL,
    created_by_role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    change_log JSONB
);

-- 3. Tabela de aprovações
CREATE TABLE IF NOT EXISTS broadcast_approvals (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    approver_username VARCHAR(100) NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled'
    )),
    decision_reason TEXT,
    original_message TEXT,
    edited_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decided_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT broadcast_approvals_unique_per_campaign_user 
        UNIQUE (campaign_id, approver_username)
);

-- 4. Tabela de destinatários
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES broadcast_campaigns(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(100),
    message_status VARCHAR(20) DEFAULT 'pending' CHECK (message_status IN (
        'pending', 'sent', 'delivered', 'read', 'failed'
    )),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    whatsapp_message_id VARCHAR(100),
    error_message TEXT,
    send_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 5. Tabela de logs de broadcast
CREATE TABLE IF NOT EXISTS broadcast_logs (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(50),
    user_ip VARCHAR(45),
    description TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status_created 
    ON broadcast_campaigns(status, created_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_creator_status 
    ON broadcast_campaigns(created_by, status);

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_scheduled_status 
    ON broadcast_campaigns(scheduled_for, status);

CREATE INDEX IF NOT EXISTS idx_broadcast_approvals_campaign_status 
    ON broadcast_approvals(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_broadcast_approvals_approver_status 
    ON broadcast_approvals(approver_username, status);

CREATE INDEX IF NOT EXISTS idx_broadcast_approvals_status_created 
    ON broadcast_approvals(status, created_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign_status 
    ON broadcast_recipients(campaign_id, message_status);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_phone_status 
    ON broadcast_recipients(phone_number, message_status);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign_sent 
    ON broadcast_recipients(campaign_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_action_entity 
    ON broadcast_logs(action_type, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_user_action 
    ON broadcast_logs(username, action_type);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_entity_created 
    ON broadcast_logs(entity_type, entity_id, created_at);

-- Inserir grupos padrão
INSERT INTO broadcast_groups (name, description, manual_contacts, created_by, auto_approve) VALUES
(
    'Produtores de Soja',
    'Produtores especializados em soja',
    '[
        {"phone": "5511999999001", "name": "João Silva - Fazenda Santa Maria"},
        {"phone": "5511999999002", "name": "Maria Santos - Cooperativa Agrícola"},
        {"phone": "5511999999003", "name": "Pedro Oliveira - Agropecuária PO"}
    ]'::jsonb,
    'admin',
    false
),
(
    'Produtores de Milho',
    'Produtores especializados em milho',
    '[
        {"phone": "5511999999004", "name": "Ana Costa - Fazenda Boa Vista"},
        {"phone": "5511999999005", "name": "Carlos Lima - Grupo Agrícola CL"},
        {"phone": "5511999999006", "name": "Lucia Torres - LT Agronegócios"}
    ]'::jsonb,
    'admin',
    false
),
(
    'Cooperativas',
    'Cooperativas agrícolas parceiras',
    '[
        {"phone": "5511999999007", "name": "Cooperativa Central - Diretor"},
        {"phone": "5511999999008", "name": "Coop Agrícola Sul - Presidente"},
        {"phone": "5511999999009", "name": "União dos Produtores - Secretário"}
    ]'::jsonb,
    'admin',
    false
),
(
    'Clientes Premium',
    'Clientes com contratos premium',
    '[
        {"phone": "5511999999010", "name": "Agribusiness Corp - CEO"},
        {"phone": "5511999999011", "name": "Fazendas Reunidas - Diretor"},
        {"phone": "5511999999012", "name": "Grupo Agro Plus - Gerente"}
    ]'::jsonb,
    'admin',
    false
),
(
    'Corretores',
    'Corretores e intermediários',
    '[
        {"phone": "5511999999013", "name": "Corretora Prime - Analista"},
        {"phone": "5511999999014", "name": "Agro Invest - Corretor Senior"},
        {"phone": "5511999999015", "name": "Rural Trade - Especialista"}
    ]'::jsonb,
    'admin',
    false
),
(
    'Grupo Teste',
    'Grupo para testes do sistema (números fictícios)',
    '[
        {"phone": "5511000000001", "name": "Teste Admin - Administrador"},
        {"phone": "5511000000002", "name": "Teste Manager - Gerente"},
        {"phone": "5511000000003", "name": "Teste Operator - Operador"}
    ]'::jsonb,
    'admin',
    false
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
    'Tabelas de broadcast criadas e dados iniciais inseridos',
    '{"migration": "001_create_broadcast_tables", "date": "2025-01-31"}'::jsonb
);

-- Comentários para documentação
COMMENT ON TABLE broadcast_groups IS 'Grupos de destinatários para campanhas de broadcast';
COMMENT ON TABLE broadcast_campaigns IS 'Campanhas de broadcast com aprovação manual';
COMMENT ON TABLE broadcast_approvals IS 'Aprovações/rejeições de campanhas pelos gestores';
COMMENT ON TABLE broadcast_recipients IS 'Destinatários específicos e status de entrega';
COMMENT ON TABLE broadcast_logs IS 'Log detalhado de todas as ações do sistema';

COMMENT ON COLUMN broadcast_campaigns.status IS 'Status da campanha: draft, pending_approval, approved, rejected, scheduled, sending, sent, failed, cancelled';
COMMENT ON COLUMN broadcast_campaigns.priority IS 'Prioridade: low, medium, high';
COMMENT ON COLUMN broadcast_campaigns.change_log IS 'Log JSON de todas as alterações na campanha';

COMMENT ON COLUMN broadcast_approvals.status IS 'Status da aprovação: pending, approved, rejected, cancelled';
COMMENT ON COLUMN broadcast_approvals.original_message IS 'Mensagem original antes da edição (apenas para edições)';
COMMENT ON COLUMN broadcast_approvals.edited_message IS 'Mensagem após edição pelo admin';

COMMENT ON COLUMN broadcast_recipients.message_status IS 'Status da mensagem: pending, sent, delivered, read, failed';
COMMENT ON COLUMN broadcast_recipients.send_attempts IS 'Número de tentativas de envio';

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
    RAISE NOTICE 'Migration 001 executada com sucesso!';
    RAISE NOTICE 'Tabelas criadas: broadcast_groups, broadcast_campaigns, broadcast_approvals, broadcast_recipients, broadcast_logs';
    RAISE NOTICE 'Grupos padrão inseridos: % grupos', (SELECT COUNT(*) FROM broadcast_groups);
    RAISE NOTICE 'Sistema de broadcast pronto para uso com aprovação manual';
END $$;