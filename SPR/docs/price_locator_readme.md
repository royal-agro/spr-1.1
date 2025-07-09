# 📦 SPR 1.1 - Price Locator (Localizador de Preços Ótimos)

## 🎯 Visão Geral

O **Price Locator** é um módulo avançado do SPR 1.1 que encontra os melhores locais para comprar produtos agrícolas no Brasil, considerando preço, frete, tempo de entrega e qualidade. Seguindo as **premissas estratégicas do SPR**, o módulo oferece análise diferenciada, rigor analítico e automação máxima.

## 🏗️ Arquitetura

### Componentes Principais

```
Price Locator/
├── app/precificacao/price_locator.py          # Módulo principal
├── app/routers/price_locator.py               # API REST
├── app/services/whatsapp_price_locator.py     # Integração WhatsApp
├── tests/test_price_locator.py                # Testes unitários
├── examples/price_locator_example.py          # Exemplos de uso
└── docs/price_locator_readme.md              # Esta documentação
```

### Classes Principais

- **`PriceLocator`**: Classe principal com lógica de busca e otimização
- **`LocationData`**: Dados de localização processados
- **`ProductPrice`**: Preços de produtos por região
- **`FreightData`**: Dados de frete calculados
- **`PriceChoice`**: Opções de compra otimizadas
- **`WhatsAppPriceLocatorService`**: Serviço de integração WhatsApp

## 🚀 Funcionalidades

### 1. Busca de Preços Otimizada
- Coleta preços de múltiplas fontes (CEPEA, CONAB, Mercado Livre)
- Cálculo automático de frete por distância
- Score composto personalizável
- Cache inteligente para performance

### 2. Processamento de Localização
- Suporte a CEP (com ou sem hífen)
- Coordenadas geográficas (lat, lon)
- Cálculo de distância Haversine
- Validação automática de entrada

### 3. Algoritmo de Otimização
- Pesos configuráveis: preço, tempo, qualidade
- Normalização de métricas
- Ranking por score composto
- Múltiplas opções ordenadas

### 4. Integração WhatsApp
- Processamento de linguagem natural
- Comandos intuitivos em português
- Respostas formatadas
- Atualizações programadas

## 📊 Produtos Suportados

Conforme **premissa estratégica #4** (commodities do SPR):

- **Soja** - Oleaginosa principal
- **Milho** - Cereal básico
- **Café** - Commodity de exportação
- **Algodão** - Fibra têxtil
- **Boi** - Proteína animal

## 🗺️ Regiões Cobertas

- **MT** - Mato Grosso (maior produtor)
- **GO** - Goiás (centro-oeste)
- **RS** - Rio Grande do Sul (sul)
- **PR** - Paraná (sul)
- **MG** - Minas Gerais (sudeste)
- **SP** - São Paulo (sudeste)
- **BA** - Bahia (nordeste)
- **MS** - Mato Grosso do Sul (centro-oeste)

## 🔧 Instalação e Configuração

### Dependências
```bash
pip install pandas numpy requests geopy fastapi pydantic
```

### Configuração Básica
```python
from app.precificacao.price_locator import PriceLocator

# Criar instância
locator = PriceLocator()

# Buscar preços
result = locator.find_best_prices(
    buyer_location="01310-100",
    product_id="soja",
    volume=1000
)
```

## 📝 Exemplos de Uso

### 1. Busca Básica
```python
locator = PriceLocator()

result = locator.find_best_prices(
    buyer_location="01310-100",  # CEP São Paulo
    product_id="soja",
    volume=1000  # kg
)

if 'error' not in result:
    best = result['best_choice']
    print(f"Melhor opção: {best['origin_region']}")
    print(f"Preço total: R$ {best['total_cost']:.2f}")
    print(f"Prazo: {best['delivery_days']} dias")
```

### 2. Pesos Personalizados
```python
# Priorizar preço baixo
result = locator.find_best_prices(
    buyer_location="01310-100",
    product_id="milho",
    weights={'price': 0.8, 'time': 0.1, 'quality': 0.1}
)

# Priorizar velocidade
result = locator.find_best_prices(
    buyer_location="01310-100",
    product_id="milho",
    weights={'price': 0.2, 'time': 0.7, 'quality': 0.1}
)
```

### 3. Coordenadas Geográficas
```python
result = locator.find_best_prices(
    buyer_location="-15.6014, -56.0979",  # Cuiabá, MT
    product_id="cafe",
    volume=500
)
```

### 4. Via WhatsApp
```python
from app.services.whatsapp_price_locator import WhatsAppPriceLocatorService

whatsapp = WhatsAppPriceLocatorService()

# Processar mensagem
success = whatsapp.process_whatsapp_message(
    contact="5511999999999",
    message="preço soja em 01310-100"
)
```

## 🌐 API REST

### Endpoints Disponíveis

#### POST /price-locator/search
Busca os melhores preços para um produto.

**Request:**
```json
{
    "buyer_location": "01310-100",
    "product_id": "soja",
    "volume": 1000,
    "weights": {
        "price": 0.5,
        "time": 0.3,
        "quality": 0.2
    }
}
```

**Response:**
```json
{
    "product_id": "soja",
    "buyer_location": "São Paulo, SP",
    "total_options_found": 16,
    "best_choice": {
        "origin_region": "MT–Mato Grosso",
        "product_price": 145.50,
        "freight_cost": 32.80,
        "delivery_days": 3,
        "quality_score": 0.85,
        "total_cost": 178.30,
        "composite_score": 0.312
    },
    "choices": [...]
}
```

#### GET /price-locator/products
Lista produtos suportados.

#### GET /price-locator/regions
Lista regiões cobertas.

#### GET /price-locator/search/{product_id}
Busca rápida via query parameters.

## 📱 Comandos WhatsApp

### Busca de Preços
- `"preço soja em 01310-100"`
- `"onde comprar milho para 12345-678"`
- `"buscar café barato em SP"`
- `"valor algodão em MT 1000 kg"`

### Informações
- `"produtos"` - Lista produtos disponíveis
- `"regiões"` - Lista regiões suportadas
- `"ajuda"` - Mostra comandos disponíveis

### Modificadores de Prioridade
- `"barato"` - Prioriza preço baixo
- `"rápido"` - Prioriza entrega rápida
- `"qualidade"` - Prioriza qualidade alta

## ⚙️ Configurações Avançadas

### Pesos do Score Composto
```python
weights = {
    'price': 0.5,    # Peso do preço (0.0 - 1.0)
    'time': 0.3,     # Peso do tempo (0.0 - 1.0)
    'quality': 0.2   # Peso da qualidade (0.0 - 1.0)
}
# Soma deve ser 1.0
```

### Cache de Performance
```python
locator = PriceLocator()

# Cache automático por 1 hora
# Limpar cache manualmente
locator.clear_cache()
```

### Configuração de APIs
```python
locator.apis_config = {
    'cepea': {'url': 'https://cepea.esalq.usp.br/api/v1/prices', 'timeout': 30},
    'conab': {'url': 'https://consultaweb.conab.gov.br/api/v1/precos', 'timeout': 30},
    'mercadolivre': {'url': 'https://api.mercadolibre.com/sites/MLB/search', 'timeout': 30}
}
```

## 🧪 Testes

### Executar Testes
```bash
# Testes unitários
pytest tests/test_price_locator.py -v

# Testes com cobertura
pytest tests/test_price_locator.py --cov=app.precificacao.price_locator --cov-report=html
```

### Testes Incluídos
- ✅ Inicialização da classe
- ✅ Processamento de localização
- ✅ Coleta de preços regionais
- ✅ Cálculo de frete
- ✅ Score composto
- ✅ Integração WhatsApp
- ✅ Tratamento de erros
- ✅ Performance do cache

## 🔍 Algoritmo de Otimização

### 1. Coleta de Dados
```python
# Múltiplas fontes
sources = ['CEPEA', 'CONAB', 'MercadoLivre']
prices = collect_from_all_sources(product_id)
```

### 2. Cálculo de Frete
```python
# Fórmula: Diesel × Km × Peso
distance = haversine(origin, destination)
freight_cost = distance * diesel_price * consumption * weight_factor
delivery_days = max(1, int(distance / 500))  # ~500km/dia
```

### 3. Score Composto
```python
# Normalização 0-1
price_norm = min(total_cost / 200.0, 1.0)
time_norm = min(delivery_days / 10.0, 1.0)
quality_norm = 1.0 - quality_score  # Inverter

# Score final (menor é melhor)
composite_score = (
    weights['price'] * price_norm +
    weights['time'] * time_norm +
    weights['quality'] * quality_norm
)
```

## 📈 Performance

### Métricas Típicas
- **Tempo de resposta**: < 2 segundos
- **Fontes consultadas**: 3 (CEPEA, CONAB, ML)
- **Regiões analisadas**: 8 principais
- **Opções retornadas**: 10-20 por consulta
- **Cache hit rate**: > 80%

### Otimizações
- Cache inteligente (1 hora)
- Consultas paralelas às APIs
- Normalização eficiente
- Cálculos vetorizados

## 🚨 Tratamento de Erros

### Erros Comuns
- **Produto não suportado**: Retorna lista de produtos válidos
- **Localização inválida**: Sugere formatos corretos
- **Pesos inválidos**: Valida soma = 1.0
- **API indisponível**: Usa fallback ou cache

### Logs Estruturados
```python
logger.info(f"🔍 Buscando preços para {product_id}")
logger.error(f"❌ Erro na API: {error}")
logger.warning(f"⚠️ Cache expirado para {key}")
```

## 🔮 Roadmap

### Versão 1.2
- [ ] Integração com mais APIs
- [ ] Previsão de preços futuros
- [ ] Análise de tendências
- [ ] Dashboard web

### Versão 1.3
- [ ] Machine Learning para otimização
- [ ] Alertas automáticos
- [ ] Histórico de preços
- [ ] Relatórios personalizados

## 📞 Suporte

### Contato
- **Email**: suporte@spr.com.br
- **WhatsApp**: +55 11 99999-9999
- **GitHub**: https://github.com/spr/price-locator

### Documentação
- **API Docs**: `/docs` (Swagger)
- **Exemplos**: `/examples/price_locator_example.py`
- **Testes**: `/tests/test_price_locator.py`

---

**🤖 SPR 1.1 - Sistema de Precificação Rural**  
*Seguindo as premissas estratégicas: Pensamento diferenciado, Rigor analítico, Automação máxima* 