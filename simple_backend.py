"""
SPR - Sistema Preditivo Royal (Versão Desenvolvimento Simplificada)
Backend simplificado para teste e desenvolvimento
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uvicorn

# Criar aplicação FastAPI
app = FastAPI(
    title="SPR - Sistema Preditivo Royal",
    description="APIs para análise de commodities agrícolas (Desenvolvimento)",
    version="1.1.0-dev"
)

# CORS para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dados simulados
commodities_data = [
    {"id": 1, "symbol": "SOJA", "name": "Soja em Grão", "category": "grains", "unit": "saca_60kg", "active": True},
    {"id": 2, "symbol": "MILHO", "name": "Milho", "category": "grains", "unit": "saca_60kg", "active": True},
    {"id": 3, "symbol": "BOI", "name": "Boi Gordo", "category": "livestock", "unit": "arroba_15kg", "active": True},
    {"id": 4, "symbol": "CAFE", "name": "Café Arábica", "category": "grains", "unit": "saca_60kg", "active": True},
    {"id": 5, "symbol": "ACUCAR", "name": "Açúcar Cristal", "category": "grains", "unit": "saca_50kg", "active": True},
]

prices_data = [
    {"id": 1, "commodity_id": 1, "price": 150.50, "region": "Rondonópolis", "state": "MT", "timestamp": "2024-07-29T00:00:00", "source": "CEPEA"},
    {"id": 2, "commodity_id": 2, "price": 75.25, "region": "Rondonópolis", "state": "MT", "timestamp": "2024-07-29T00:00:00", "source": "CEPEA"},
    {"id": 3, "commodity_id": 3, "price": 280.00, "region": "Campo Grande", "state": "MS", "timestamp": "2024-07-29T00:00:00", "source": "CEPEA"},
    {"id": 4, "commodity_id": 4, "price": 850.75, "region": "São Paulo", "state": "SP", "timestamp": "2024-07-29T00:00:00", "source": "B3"},
]

# ============= ENDPOINTS =============

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "🌾 SPR - Sistema Preditivo Royal",
        "version": "1.1.0-dev",
        "status": "running",
        "mode": "development",
        "timestamp": datetime.now().isoformat(),
        "agents": {
            "database_engineer": "simulated",
            "backend_python": "active",
            "financial_modeling": "simulated", 
            "business_intelligence": "simulated",
            "agritech_data": "simulated",
            "whatsapp_specialist": "simulated"
        }
    }

@app.get("/health")
async def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "service": "SPR Backend",
        "version": "1.1.0-dev",
        "timestamp": datetime.now().isoformat(),
        "database": "memory",
        "agents": "6 simulated"
    }

@app.get("/commodities/")
async def get_commodities():
    """Lista commodities"""
    return {
        "data": commodities_data,
        "count": len(commodities_data),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/commodities/{commodity_id}")
async def get_commodity(commodity_id: int):
    """Detalhes de uma commodity"""
    commodity = next((c for c in commodities_data if c["id"] == commodity_id), None)
    if not commodity:
        return {"error": "Commodity não encontrada"}
    
    commodity_prices = [p for p in prices_data if p["commodity_id"] == commodity_id]
    
    return {
        "commodity": commodity,
        "latest_prices": commodity_prices,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/commodities/{commodity_id}/prices")
async def get_commodity_prices(commodity_id: int):
    """Preços de uma commodity"""
    commodity_prices = [p for p in prices_data if p["commodity_id"] == commodity_id]
    return {
        "data": commodity_prices,
        "count": len(commodity_prices),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/predictions/")
async def get_predictions():
    """Previsões de preços"""
    predictions = [
        {"id": 1, "commodity_id": 1, "commodity_symbol": "SOJA", "predicted_price": 155.75, "confidence": 0.85, "horizon_days": 7, "model": "SPR_ML_v1"},
        {"id": 2, "commodity_id": 2, "commodity_symbol": "MILHO", "predicted_price": 78.50, "confidence": 0.82, "horizon_days": 7, "model": "SPR_ML_v1"},
        {"id": 3, "commodity_id": 3, "commodity_symbol": "BOI", "predicted_price": 290.25, "confidence": 0.79, "horizon_days": 7, "model": "SPR_ML_v1"},
    ]
    return {
        "data": predictions,
        "count": len(predictions),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/alerts/")
async def get_alerts():
    """Alertas de mercado"""
    alerts = [
        {"id": 1, "commodity_symbol": "SOJA", "type": "price_above", "threshold": 160.0, "status": "active"},
        {"id": 2, "commodity_symbol": "MILHO", "type": "price_below", "threshold": 70.0, "status": "active"},
        {"id": 3, "commodity_symbol": "BOI", "type": "volatility", "threshold": 5.0, "status": "triggered"},
    ]
    return {
        "data": alerts,
        "count": len(alerts),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/weather/")
async def get_weather():
    """Dados climáticos"""
    weather = [
        {"station": "INMET_MT001", "region": "Rondonópolis", "state": "MT", "temp": 28.5, "humidity": 65, "rain": 0.0},
        {"station": "INMET_MS001", "region": "Campo Grande", "state": "MS", "temp": 26.8, "humidity": 58, "rain": 5.2},
        {"station": "INMET_SP001", "region": "São Paulo", "state": "SP", "temp": 22.1, "humidity": 72, "rain": 2.1},
    ]
    return {
        "data": weather,
        "count": len(weather),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/agents/")
async def get_agents():
    """Status dos agentes"""
    agents = {
        "database_engineer": {"status": "simulated", "description": "Otimização PostgreSQL"},
        "backend_python": {"status": "active", "description": "APIs de commodities"},  
        "financial_modeling": {"status": "simulated", "description": "Previsões ML"},
        "business_intelligence": {"status": "simulated", "description": "Alertas automáticos"},
        "agritech_data": {"status": "simulated", "description": "Dados IBGE/INMET"},
        "whatsapp_specialist": {"status": "simulated", "description": "Automação WhatsApp"}
    }
    return {
        "agents": agents,
        "total_agents": len(agents),
        "active_agents": len([a for a in agents.values() if a["status"] == "active"]),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/stats/")
async def get_stats():
    """Estatísticas do sistema"""
    return {
        "system": {
            "commodities": len(commodities_data),
            "prices": len(prices_data),
            "agents": 6,
            "predictions": 3,
            "alerts": 3
        },
        "performance": {
            "mode": "development",
            "database": "memory",
            "response_time": "< 10ms"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🌾 SPR - Sistema Preditivo Royal")
    print("🚀 Iniciando backend simplificado...")
    print("📊 Commodities: Soja, Milho, Boi, Café, Açúcar")
    print("🤖 Agentes: 6 agentes (1 ativo, 5 simulados)")
    print("🔗 Porta: 8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("-" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)