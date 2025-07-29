#!/usr/bin/env python3
"""
Database Initialization Script for SPR System
Script de inicialização do banco de dados PostgreSQL
"""

import os
import sys
import logging
from pathlib import Path

# Adicionar diretório raiz ao path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.database.connection import db_manager, Base
from app.database.models import (
    Commodity, PriceHistory, WeatherData, MarketAlert,
    GovernmentData, PricePrediction, WhatsAppUser
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_commodities():
    """Inicializa commodities básicas do agronegócio brasileiro"""
    commodities_data = [
        # Grãos
        {"symbol": "SOJA", "name": "Soja em Grão", "category": "grains", "unit": "saca_60kg", "exchange": "B3"},
        {"symbol": "MILHO", "name": "Milho", "category": "grains", "unit": "saca_60kg", "exchange": "B3"},
        {"symbol": "CAFE", "name": "Café Arábica", "category": "grains", "unit": "saca_60kg", "exchange": "B3"},
        {"symbol": "ACUCAR", "name": "Açúcar Cristal", "category": "grains", "unit": "saca_50kg", "exchange": "B3"},
        {"symbol": "ALGODAO", "name": "Algodão", "category": "grains", "unit": "arroba_15kg", "exchange": "B3"},
        
        # Pecuária
        {"symbol": "BOI", "name": "Boi Gordo", "category": "livestock", "unit": "arroba_15kg", "exchange": "B3"},
        {"symbol": "BEZERRO", "name": "Bezerro", "category": "livestock", "unit": "arroba_15kg", "exchange": None},
        {"symbol": "FRANGO", "name": "Frango Vivo", "category": "livestock", "unit": "kg", "exchange": None},
        {"symbol": "SUINO", "name": "Suíno Vivo", "category": "livestock", "unit": "kg", "exchange": None},
        
        # Insumos
        {"symbol": "FERTILIZANTE", "name": "Fertilizante NPK", "category": "inputs", "unit": "tonelada", "exchange": None},
        {"symbol": "DEFENSIVO", "name": "Defensivos Agrícolas", "category": "inputs", "unit": "litro", "exchange": None},
        
        # Commodities internacionais
        {"symbol": "WHEAT", "name": "Trigo", "category": "grains", "unit": "bushel", "exchange": "CBOT"},
        {"symbol": "CORN", "name": "Milho US", "category": "grains", "unit": "bushel", "exchange": "CBOT"},
        {"symbol": "SOYBEAN", "name": "Soja US", "category": "grains", "unit": "bushel", "exchange": "CBOT"},
    ]
    
    with db_manager.get_session() as session:
        for commodity_data in commodities_data:
            # Verificar se já existe
            existing = session.query(Commodity).filter(
                Commodity.symbol == commodity_data["symbol"]
            ).first()
            
            if not existing:
                commodity = Commodity(**commodity_data)
                session.add(commodity)
                logger.info(f"✅ Commodity adicionada: {commodity_data['symbol']}")
            else:
                logger.info(f"⚠️ Commodity já existe: {commodity_data['symbol']}")
        
        session.commit()
        logger.info("🌾 Commodities inicializadas com sucesso")


def create_test_data():
    """Cria dados de teste para desenvolvimento"""
    from datetime import datetime, timedelta
    import random
    
    logger.info("🧪 Criando dados de teste...")
    
    with db_manager.get_session() as session:
        # Buscar soja para criar dados de teste
        soja = session.query(Commodity).filter(Commodity.symbol == "SOJA").first()
        
        if soja:
            # Criar histórico de preços simulado para últimos 30 dias
            base_date = datetime.now() - timedelta(days=30)
            base_price = 150.0  # R$ por saca
            
            for i in range(30):
                # Simular variação de preço
                price_variation = random.uniform(-0.05, 0.05)  # ±5%
                price = base_price * (1 + price_variation)
                
                price_history = PriceHistory(
                    commodity_id=soja.id,
                    price=round(price, 2),
                    price_open=round(price * 0.98, 2),
                    price_high=round(price * 1.02, 2),
                    price_low=round(price * 0.97, 2),
                    price_close=round(price, 2),
                    volume=random.randint(1000, 5000),
                    region="Rondonópolis",
                    state="MT",
                    source="CEPEA",
                    timestamp=base_date + timedelta(days=i)
                )
                session.add(price_history)
                
                # Atualizar preço base para próximo dia
                base_price = price
            
            # Criar alerta de teste
            alert = MarketAlert(
                commodity_id=soja.id,
                alert_type="price_above",
                threshold_value=160.0,
                comparison_period=7,
                user_phone="+5565999999999",
                notification_method="whatsapp"
            )
            session.add(alert)
            
            # Criar usuário WhatsApp de teste
            test_user = WhatsAppUser(
                phone_number="+5565999999999",
                name="Usuário Teste",
                user_type="producer",
                preferred_commodities=["SOJA", "MILHO"],
                notification_frequency="daily",
                region="Rondonópolis",
                state="MT"
            )
            session.add(test_user)
            
            session.commit()
            logger.info("✅ Dados de teste criados com sucesso")


def initialize_database():
    """Função principal de inicialização"""
    logger.info("🚀 Iniciando configuração do banco de dados SPR...")
    
    try:
        # Testar conexão
        if not db_manager.test_connection():
            logger.error("❌ Falha na conexão com PostgreSQL")
            return False
        
        # Criar tabelas
        logger.info("📊 Criando estrutura de tabelas...")
        db_manager.create_tables()
        
        # Inicializar commodities
        logger.info("🌾 Inicializando commodities...")
        init_commodities()
        
        # Criar dados de teste (apenas em desenvolvimento)
        if os.getenv('SPR_ENVIRONMENT', 'dev') == 'dev':
            create_test_data()
        
        logger.info("✅ Banco de dados SPR inicializado com sucesso!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro na inicialização do banco: {e}")
        return False


if __name__ == "__main__":
    success = initialize_database()
    sys.exit(0 if success else 1)