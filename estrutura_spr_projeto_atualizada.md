# Estrutura do Projeto SPR 1.1 - ATUALIZADA

## Visão Geral
Este documento apresenta a estrutura ATUALIZADA do projeto SPR 1.1, incluindo os novos módulos para inteligência geográfica e otimização de compras por localização.

## Estrutura de Diretórios Atualizada

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
│   ├── Noticias_e_Sentimentos/
│   │   └── modulo_noticias_sentimento.txt
│   ├── Relatorios_Mercadologicos/
│   │   └── modulo_relatorios_mercadologicos.txt
│   └── Inteligencia_Geografica/                     [NOVO]
│       └── modulo_inteligencia_geografica.txt
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
│   ├── Precos/
│   │   └── modulo_precos.txt
│   ├── Impostos_Tributarios/                        [NOVO]
│   │   └── modulo_impostos_tributarios.txt
│   ├── Logistica_Otimizada/                         [NOVO]
│   │   └── modulo_logistica_otimizada.txt
│   └── Otimizacao_Compras/                          [NOVO]
│       └── modulo_otimizacao_compras.txt
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
│   ├── Whatsapp_login/
│   │   └── modulo_whatsapp_login.txt
│   └── Geolocalizacao_Clientes/                     [NOVO]
│       └── modulo_geolocalizacao_clientes.txt
│
├── Banco_Dados/                                     [NOVO]
│   ├── Dados_Geograficos/
│   │   ├── estados_brasileiros.txt
│   │   ├── municipios_produtores.txt
│   │   └── fazendas_cadastradas.txt
│   ├── Impostos_Por_Regiao/
│   │   ├── icms_por_estado.txt
│   │   ├── pis_cofins.txt
│   │   └── tributos_municipais.txt
│   └── Custos_Logisticos/
│       ├── tabela_fretes.txt
│       ├── custos_armazenagem.txt
│       └── rotas_otimizadas.txt
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

### 1. Análise (Expandido)
- **Alertas Automatizados**: Sistema de alertas automáticos
- **Análise de Sentimento**: Processamento de sentimento de mercado por região
- **Comparativos de Precificação**: Análise comparativa de preços por localização
- **Dashboard Interativo**: Interface de visualização com mapas geográficos
- **Notícias e Sentimentos**: Análise de notícias regionais e impacto local
- **Relatórios Mercadológicos**: Relatórios por estado, região e município
- **🆕 Inteligência Geográfica**: Análise de padrões de preços por localização

### 2. Precificação (Expandido)
- **Câmbio**: Análise e impacto cambial por região
- **Clima e NDVI**: Dados climáticos específicos por localização
- **Custos**: Gestão de custos por região e fazenda
- **Mercado Interno/Externo**: Análise comparativa regional
- **Preços**: Histórico e tendências por localização específica
- **🆕 Impostos Tributários**: ICMS, PIS/COFINS por estado e município
- **🆕 Logística Otimizada**: Cálculo de fretes e rotas ótimas
- **🆕 Otimização de Compras**: Identifica melhores locais de compra

### 3. Suporte Técnico (Expandido)
- **Backup e Logs**: Sistema de backup e registro
- **Claude Sync**: Sincronização com IA Claude
- **Clientes**: Gestão de clientes com geolocalização
- **Deploy CI/CD**: Pipeline de integração contínua
- **Painel NSPR**: Interface administrativa com mapas
- **Posição Clientes**: Gestão de posições por localização
- **WhatsApp Login**: Autenticação via WhatsApp
- **🆕 Geolocalização Clientes**: Cadastro e gestão de localizações

### 4. 🆕 Banco de Dados (Novo Módulo)
- **Dados Geográficos**: Estados, municípios e fazendas do Brasil
- **Impostos por Região**: Tabelas tributárias por localização
- **Custos Logísticos**: Fretes, armazenagem e rotas otimizadas

### 5. Infraestrutura (Mantido)
- **SPR**: Módulo principal
- **Scripts**: Utilitários e automações
- **Credenciais**: Gestão de autenticação
- **Logs**: Registro de atividades

## Funcionalidades Principais Adicionadas

### 🎯 Inteligência de Localização
- Identificação dos melhores locais de compra por commodity
- Análise de custo total: preço + impostos + logística
- Otimização de rotas e distâncias
- Comparação entre regiões, estados e municípios

### 📊 Saídas Obrigatórias
1. **Ranking de Menores Preços** por localização
2. **Melhor Região/Cidade** para compra otimizada
3. **Análise Completa** de custos por componente
4. **Sugestões de Fazendas** específicas quando disponível

### 🗺️ Granularidade Geográfica
- **País**: Brasil (visão macro)
- **Região**: Norte, Nordeste, Centro-Oeste, Sudeste, Sul
- **Estado**: Todos os 26 estados + DF
- **Município**: Principais cidades produtoras
- **Fazenda**: Localização específica com coordenadas

## Exemplos de Consultas Suportadas

- "Onde comprar soja mais barata para entregar em São Paulo?"
- "Qual o melhor estado para comprar milho considerando impostos?"
- "Fazendas em Mato Grosso com melhor custo-benefício para algodão?"
- "Comparar custos totais: Goiás vs Mato Grosso do Sul para café?"

---

**Esta estrutura atualizada garante que o SPR 1.1 atenda plenamente à nova diretriz de Inteligência Geográfica e Otimização de Compras.** 