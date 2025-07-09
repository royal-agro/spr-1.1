# Estrutura do Projeto SPR 1.1

## Visão Geral
Este documento apresenta a estrutura completa do projeto SPR 1.1, organizado por módulos e funcionalidades.

## Estrutura de Diretórios

```
SPR 1.1/
├── Analise/
│   ├── Alertas_Automatizados/
│   │   └── modulo_alertas_automatizados.txt
│   ├── Analise_sentimento/
│   │   └── modulo_analise_sentimento.txt
│   ├── Comparativos_Precificacao/
│   │   └── modulo_comparativos_precificacao.txt
│   ├── Dashboard_interativo/
│   │   └── modulo_dashboard_interativo.txt
│   ├── Noticias e Sentimentos/
│   │   └── modulo_noticias_sentimento.txt
│   └── Relatorios_Mercadologicos/
│       └── modulo_relatorios_mercadologicos.txt
│
├── Precificacao/
│   ├── Cambio/
│   │   └── modulo_cambio.txt
│   ├── Clima_Ndvi/
│   │   └── modulo_clima_ndvi.txt
│   ├── Custos/
│   │   └── modulo_custos.txt
│   ├── Mercado_Interno_externo/
│   │   └── modulo_mercado_interno_externo.txt
│   └── Precos/
│       └── modulo_precos.txt
│
├── Suporte_Tecnico/
│   ├── backup_logs/
│   │   └── modulo_backup_logs.txt
│   ├── claude_sync/
│   │   └── modulo_claude_sync.txt
│   ├── Clientes/
│   │   └── modulo_clientes.txt
│   ├── Deploy_Ci_Cd/
│   │   └── modulo_deploy_ci_cd.txt
│   ├── Painel_Nspr/
│   │   └── modulo_painel_nspr.txt
│   ├── Posicao_Clientes/
│   │   └── modulo_posicao_clientes.txt
│   └── Whatsapp_login/
│       └── modulo_whatsapp_login.txt
│
├── SPR/
│   ├── main.py
│   └── .pytest_cache/
│
├── scripts/
│   ├── generate_github_token.py
│   └── generate_github_token_debug.py
│
├── credenciais/
│   ├── github_pulso_app.json
│   └── github_pulso_private_key.pem
│
├── logs/
│   ├── log_20250707_232310.json
│   ├── migracao_spr.log
│   └── quick_232346.json
│
├── DadosLuiz/
│
└── Arquivos de Configuração
    ├── auth_github_spr.py
    ├── docker-compose.yml
    ├── Dockerfile
    ├── github_pulso_app.json
    ├── migrar_spr_pastas.py
    ├── spr_config_example.json
    ├── spr_instructions.md
    ├── spr_main.py
    ├── spr_setup_files.sh
    ├── spr_sync_script.py
    └── TESTE_PUSH.md

## Descrição dos Módulos

### 1. Análise
- **Alertas Automatizados**: Sistema de alertas automáticos
- **Análise de Sentimento**: Processamento de sentimento de mercado
- **Comparativos de Precificação**: Análise comparativa de preços
- **Dashboard Interativo**: Interface de visualização de dados
- **Notícias e Sentimentos**: Análise de notícias e impacto
- **Relatórios Mercadológicos**: Geração de relatórios de mercado

### 2. Precificação
- **Câmbio**: Análise e impacto cambial
- **Clima e NDVI**: Análise climática e índice de vegetação
- **Custos**: Gestão e análise de custos
- **Mercado Interno/Externo**: Análise de mercados
- **Preços**: Gestão e análise de preços

### 3. Suporte Técnico
- **Backup e Logs**: Sistema de backup e registro
- **Claude Sync**: Sincronização com IA Claude
- **Clientes**: Gestão de clientes
- **Deploy CI/CD**: Pipeline de integração contínua
- **Painel NSPR**: Interface administrativa
- **Posição Clientes**: Gestão de posições
- **WhatsApp Login**: Autenticação via WhatsApp

### 4. Infraestrutura
- **SPR**: Módulo principal
- **Scripts**: Utilitários e automações
- **Credenciais**: Gestão de autenticação
- **Logs**: Registro de atividades 