# SPR 1.1 - Sistema de Pipeline de Dados Agropecuários

> **Pipeline end-to-end** para coleta, processamento e análise de dados agropecuários brasileiros

## 🌾 Visão Geral

O SPR 1.1 é um sistema integrado para ingestão de dados de três fontes principais:

- **🌡️ INMET**: Dados meteorológicos (estações, séries temporais, normais climatológicas)
- **🌾 MAPA-CKAN**: Datasets agrícolas (ZARC, Agrofit, SIPEAGRO, SIGEF, CNPO, SIF)
- **💰 CONAB**: Preços agropecuários, safras, PGPM, custos, estoques e armazenagem

### Produtos Cobertos

**Grãos**: Soja, Milho, Sorgo, Trigo, Arroz  
**Proteínas**: Boi Gordo, Frango, Suíno, Leite, Ovos

## 🚀 Instalação Rápida

```bash
# 1. Clone e configure
git clone <repo-url>
cd SPR1.1

# 2. Crie ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# 3. Instale dependências
pip install -e .

# 4. Inicialize estrutura
spr init

# 5. Verifique status
spr status
```

## 📋 Uso Básico

### Sincronização Completa (Recomendado)

```bash
# Sincroniza tudo (2014-2025, MT para INMET)
spr sync-all --inicio 2014-01-01

# Personalizado
spr sync-all --inicio 2020-01-01 --fim 2025-07-26 --skip-mapa
```

### Comandos por Conector

#### INMET - Meteorologia
```bash
# Estações meteorológicas
spr inmet sync-estacoes

# Séries temporais
spr inmet sync-series --inicio 2024-01-01 --fim 2024-12-31 --freq H --uf MT

# Normais climatológicas
spr inmet sync-normais

# Features derivadas
spr inmet process-features

# Resumo meteorológico
spr inmet weather-summary A001 2024-07-26
```

#### MAPA - Datasets Agrícolas
```bash
# Descobre datasets disponíveis
spr mapa discover

# Downloads individuais
spr mapa sync-zarc      # Zoneamento de Risco Climático
spr mapa sync-agrofit   # Defensivos agrícolas
spr mapa sync-sipeagro  # Estabelecimentos
spr mapa sync-sigef     # Produção de sementes
spr mapa sync-cnpo      # Produtores orgânicos
spr mapa sync-sif       # Frigoríficos e abates

# Todos de uma vez
spr mapa sync-all
```

#### CONAB - Preços e Safras
```bash
# Safras de grãos
spr conab sync-safras

# Preços agropecuários (janela de 4 semanas, auto-paginado)
spr conab sync-precos \
  --produto soja,milho,sorgo,boi,frango,suino,leite,ovos \
  --nivel produtor,atacado,varejo \
  --inicio 2024-01-01 \
  --fim 2024-07-26

# Preços mínimos (PGPM)
spr conab sync-pgpm

# Monitor de situação PGPM
spr conab monitor-pgpm --uf MT --produto soja

# Custos, estoques, armazenagem
spr conab sync-custos
spr conab sync-estoques
spr conab sync-armazenagem
```

### Análise e Relatórios

```bash
# Relatório consolidado
spr report

# Validação de integridade
spr validate
```

## 📊 Estrutura de Dados

### Diretórios
```
SPR1.1/
├── data/
│   ├── raw/          # Arquivos originais (JSON, CSV, XLSX)
│   ├── staging/      # Dados normalizados linha a linha
│   ├── curated/      # Tabelas finais (Parquet)
│   └── metadata/     # Manifests, hashes, proveniência
├── logs/             # Logs estruturados (JSON + humano)
├── core/             # Configurações, schemas, utilitários
├── connectors/       # Clientes específicos por fonte
└── jobs/             # CLI e agendamento
```

### Tabelas Principais (Curated)

#### INMET
- `inmet_estacoes.parquet` - Catálogo de estações
- `inmet_series_horarias.parquet` - Séries horárias
- `inmet_series_diarias.parquet` - Séries diárias
- `inmet_series_diarias_features.parquet` - Com features derivadas
- `inmet_normais.parquet` - Normais climatológicas

#### MAPA
- `zarc_tabuas.parquet` - Tábuas de risco ZARC
- `agrofit_produtos.parquet` - Defensivos registrados
- `sipeagro_estabelecimentos.parquet` - Estabelecimentos
- `sigef_campos.parquet` - Campos de sementes
- `cnpo_produtores.parquet` - Produtores orgânicos
- `sif_estabelecimentos.parquet` - Frigoríficos
- `sif_abates.parquet` - Relatórios de abate

#### CONAB
- `conab_safras_graos.parquet` - Safras por UF
- `conab_precos_semanal.parquet` - Preços semanais
- `conab_precos_mensal.parquet` - Preços mensais
- `conab_pgpm.parquet` - Preços mínimos
- `conab_pgpm_monitor.parquet` - Monitor de situação
- `conab_custos.parquet` - Custos de produção
- `conab_estoques_publicos.parquet` - Estoques governamentais
- `conab_armazenagem.parquet` - Capacidade estática

## 🔧 Configuração

### Arquivo .env
```bash
# Geral
SPR_ROOT=./SPR1.1
SPR_TZ=America/Cuiaba
SPR_USER_AGENT=SPR-1.1/Conectores (+seu-email@exemplo.com)

# Timeouts e retry
HTTP_TIMEOUT=60
HTTP_MAX_RETRIES=5
HTTP_BACKOFF_MIN=1
HTTP_BACKOFF_MAX=30

# APIs
INMET_BASE=https://apitempo.inmet.gov.br
MAPA_CKAN_BASE=https://dados.agricultura.gov.br
CONAB_PORTAL_BASE=https://portaldeinformacoes.conab.gov.br
CONAB_CONSULTA_PRECOS=https://consultaprecosdemercado.conab.gov.br

# Logs
LOG_LEVEL=INFO
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5
```

## ⏰ Agendamento (Cron Sugerido)

```bash
# /etc/crontab

# INMET - Estações diário 03:00 UTC
0 3 * * * user cd /path/SPR1.1 && spr inmet sync-estacoes

# INMET - Séries a cada 6h (varrer últimas 48h)
0 */6 * * * user cd /path/SPR1.1 && spr inmet sync-series --inicio $(date -d '2 days ago' +%Y-%m-%d) --fim $(date +%Y-%m-%d) --freq H --uf MT

# MAPA - Semanal domingo 04:00 UTC
0 4 * * 0 user cd /path/SPR1.1 && spr mapa sync-all

# CONAB - Preços semanal segunda 08:00 (UTC-4 = 12:00 local)
0 12 * * 1 user cd /path/SPR1.1 && spr conab sync-precos --produto soja,milho,boi,frango --nivel produtor,atacado --inicio $(date -d '4 weeks ago' +%Y-%m-%d) --fim $(date +%Y-%m-%d)

# CONAB - Safras mensal dia 03 08:00 (UTC-4 = 12:00 local)
0 12 3 * * user cd /path/SPR1.1 && spr conab sync-safras

# Relatório semanal
0 6 * * 1 user cd /path/SPR1.1 && spr report > /var/log/spr_report.log
```

## 🧪 Features Avançadas

### Features Meteorológicas Derivadas
- **Graus-dia acumulados** para soja, milho, trigo (bases térmicas específicas)
- **Índice de estresse hídrico** (precipitação vs ET₀ simplificada)
- **Anomalias climáticas** vs normais 1991-2020
- **Detecção de geadas** e unidades de frio
- **Índice SPI** (Standardized Precipitation Index) 90 dias

### Monitor PGPM
- **Situação automática**: desfavorável/alerta/favorável
- **Comparação** preço observado vs preço mínimo por UF/produto
- **Alertas** quando preços estão abaixo dos mínimos

### Controle de Qualidade
- **Idempotência**: re-execuções não duplicam dados
- **Validação de schemas** com Pydantic
- **Detecção de outliers** (método IQR)
- **Controle de proveniência** (hash, timestamps, URLs)

## 🛠️ Desenvolvimento

### Estrutura do Código
```python
# Exemplo de uso programático
from connectors.inmet.client import InmetClient
from connectors.conab.ingest import ConabIngester
from core.schemas import ConabPrecos

# Cliente INMET
client = InmetClient()
estacoes = client.get_estacoes_por_uf("MT")

# Ingestão CONAB
ingester = ConabIngester()
count, file_path = ingester.sync_precos(
    produtos=["soja", "milho"],
    niveis=["produtor"],
    data_inicio=date(2024, 1, 1),
    data_fim=date(2024, 7, 26)
)

# Validação com schema
df = pd.read_parquet(file_path)
for _, row in df.iterrows():
    ConabPrecos(**row.to_dict())  # Valida schema
```

### Testes
```bash
# Executa todos os testes
pytest

# Com cobertura
pytest --cov=core --cov=connectors --cov=jobs

# Testes específicos
pytest connectors/inmet/tests/
pytest connectors/conab/tests/
```

### Qualidade de Código
```bash
# Lint
ruff check .

# Type checking
mypy core/ connectors/ jobs/

# Formatação
ruff format .
```

## 📚 Documentação Técnica

### Schemas de Dados
Todos os dados seguem schemas Pydantic rigorosos. Exemplos:

```python
# Preço CONAB
class ConabPrecos(BaseSchema):
    data: date
    produto: str
    nivel: str  # produtor/atacado/varejo
    uf: str
    municipio: Optional[str]
    preco: float
    unidade_original: str
    preco_rs_kg: float  # Normalizado para R$/kg
```

### Rate Limiting e Retry
- **Retry exponencial** com jitter
- **Respeito aos termos de uso** das APIs
- **Paginação automática** para APIs com limitação de janela (CONAB: 4 semanas)

### Normalização de Unidades
- **Automática** para kg/tonelada
- **Fatores configuráveis**: saca soja = 60kg, arroba boi = 15kg, etc.
- **Preservação** das unidades originais

## ⚠️ Limitações e Observações

### CONAB Preços
- **Dados disponíveis**: a partir de 2014
- **Janela máxima**: 4 semanas por consulta
- **Paginação automática**: implementada no cliente

### INMET
- **Endpoints em evolução**: cliente adaptável a mudanças de URL
- **Agregação fallback**: séries diárias calculadas das horárias se necessário

### MAPA-CKAN
- **Discovery automático**: busca por palavras-chave
- **Múltiplos formatos**: prioriza CSV > XLSX > JSON

## 🆘 Solução de Problemas

### Erros Comuns

**"Nenhuma estação encontrada"**
```bash
# Verifique conectividade
spr status

# Force refresh do cache
spr inmet sync-estacoes
```

**"Período muito longo" (CONAB)**
```bash
# Use períodos menores ou deixe o sistema paginar automaticamente
spr conab sync-precos --produto soja --nivel produtor --inicio 2024-01-01 --fim 2024-03-31
```

**"Dataset não encontrado" (MAPA)**
```bash
# Descubra datasets disponíveis
spr mapa discover

# Verifique se palavras-chave estão corretas no código
```

**"Arquivo corrompido"**
```bash
# Valide integridade
spr validate

# Force novo download
rm data/curated/[arquivo].parquet
spr [comando-sincronizacao]
```

### Logs Detalhados
```bash
# Logs estruturados em JSON
tail -f logs/spr.log | jq '.'

# Por módulo específico
tail -f logs/spr.log | jq 'select(.logger | contains("inmet"))'

# Apenas erros
tail -f logs/spr.log | jq 'select(.level == "ERROR")'
```

## 📄 Licença e Citação

### Uso dos Dados
Os dados coletados pertencem às respectivas fontes:
- **INMET**: Instituto Nacional de Meteorologia
- **MAPA**: Ministério da Agricultura, Pecuária e Abastecimento  
- **CONAB**: Companhia Nacional de Abastecimento

### Citação Sugerida
```
SPR 1.1 - Sistema de Pipeline de Dados Agropecuários. 
Dados de: INMET, MAPA, CONAB. 
Processado em: [data]. 
Disponível em: [url-do-projeto]
```

### Responsabilidade
- **Respeite** os termos de uso das APIs originais
- **Cite as fontes** em relatórios e análises
- **Não redistribua** dados sem autorização das fontes

## 🤝 Contribuição

### Reportar Problemas
1. Verifique logs: `spr validate`
2. Teste conectividade: `spr status`
3. Abra issue com logs relevantes

### Adicionar Novos Conectores
```python
# 1. Crie cliente em connectors/[fonte]/
class NovoClient:
    def get_data(self): ...

# 2. Adicione schema em core/schemas/
class NovoSchema(BaseSchema):
    campo: str = Field(...)

# 3. Implemente ingestão
class NovoIngester:
    def sync_data(self): ...

# 4. Adicione comandos CLI em jobs/cli.py
@novo_app.command("sync")
def novo_sync(): ...
```

## 📊 Casos de Uso

### 1. Análise de Safra
```python
import pandas as pd

# Carrega dados
safras = pd.read_parquet("data/curated/conab_safras_graos.parquet")
precos = pd.read_parquet("data/curated/conab_precos_mensal.parquet")
clima = pd.read_parquet("data/curated/inmet_series_diarias_features.parquet")

# Análise integrada: produtividade vs clima vs preços
# ... seu código de análise
```

### 2. Monitor de Mercado
```python
from connectors.conab.ingest import ConabIngester

# Atualização diária de preços
ingester = ConabIngester()
count, _ = ingester.sync_precos(
    produtos=["soja", "milho"],
    niveis=["produtor"],
    data_inicio=date.today() - timedelta(days=7),
    data_fim=date.today()
)

# Gera alertas PGPM
count, _ = ingester.generate_pgpm_monitor()
```

### 3. Zoneamento Climático
```python
from connectors.inmet.transform import InmetTransformer

# Calcula graus-dia para soja
transformer = InmetTransformer()
df_clima = pd.read_parquet("data/curated/inmet_series_diarias.parquet")
df_clima['graus_dia_soja'] = transformer.calculate_degree_days(df_clima, crop='soja_grao')

# Cruza com tábuas ZARC
zarc = pd.read_parquet("data/curated/zarc_tabuas.parquet")
# ... análise de adequação climática
```

## 🔮 Roadmap

### v1.2 (Próxima)
- [ ] **PROHORT**: Dados de hortifrúti e Ceasas
- [ ] **IBGE PAM**: Produção Agrícola Municipal
- [ ] **IBGE PPM**: Produção Pecuária Municipal
- [ ] **API REST**: Endpoint para consulta dos dados processados

### v1.3 (Futuro)
- [ ] **Machine Learning**: Modelos preditivos de preços
- [ ] **Alertas**: Notificações automáticas por email/WhatsApp
- [ ] **Dashboard**: Interface web para visualização
- [ ] **Exportação**: Conectores para bancos de dados

### Melhorias Contínuas
- [ ] **Performance**: Processamento paralelo com Dask
- [ ] **Qualidade**: Mais validações e testes de integração
- [ ] **Docs**: Notebooks com exemplos de análise
- [ ] **Deploy**: Containers Docker + Kubernetes

## 📞 Suporte

### Documentação
- **README Conectores**: Ver `connectors/*/README.md`
- **Schemas**: Documentação inline nos modelos Pydantic
- **Exemplos**: Diretório `examples/` (quando disponível)

### Contato
- **Issues**: [GitHub Issues]
- **Discussões**: [GitHub Discussions]
- **Email**: [contato@exemplo.com]

---

**SPR 1.1** - Sistema robusto, escalável e transparente para dados agropecuários brasileiros.

*Desenvolvido com ❤️ para o agronegócio nacional.*