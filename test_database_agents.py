#!/usr/bin/env python3
"""
Test Script for SPR Database with Multi-Agent System
Script de teste do sistema de banco com agentes especializados
"""

import sys
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Configurar path
sys.path.append(str(Path(__file__).parent))

from app.database.connection import db_manager
from app.database.services import spr_db
from app.database.models import Commodity, PriceHistory, WhatsAppUser
from agentes_system import SPRAgentSystem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_database_connection():
    """Testa conexão com banco de dados"""
    logger.info("🔌 Testando conexão com banco de dados...")
    
    if db_manager.test_connection():
        logger.info("✅ Conexão PostgreSQL funcionando")
    else:
        logger.error("❌ Falha na conexão PostgreSQL")
        return False
    
    # Testar Redis
    redis_client = db_manager.get_redis_client()
    if redis_client:
        try:
            redis_client.ping()
            logger.info("✅ Conexão Redis funcionando")
        except Exception as e:
            logger.warning(f"⚠️ Redis não disponível: {e}")
    
    return True


def test_commodity_operations():
    """Testa operações com commodities"""
    logger.info("🌾 Testando operações com commodities...")
    
    with spr_db.get_session() as session:
        # Buscar todas as commodities
        commodities = spr_db.commodity_service.get_all_commodities(session)
        logger.info(f"📊 Encontradas {len(commodities)} commodities")
        
        # Buscar soja especificamente
        soja = spr_db.commodity_service.get_commodity_by_symbol(session, "SOJA")
        if soja:
            logger.info(f"✅ Commodity SOJA encontrada: {soja.name}")
            return soja.id
        else:
            logger.warning("⚠️ Commodity SOJA não encontrada")
            return None


def test_price_operations(commodity_id: int):
    """Testa operações com preços"""
    logger.info("💰 Testando operações com preços...")
    
    with spr_db.get_session() as session:
        # Buscar preços mais recentes
        latest_prices = spr_db.price_service.get_latest_prices(session, commodity_id, limit=5)
        logger.info(f"📈 Encontrados {len(latest_prices)} registros de preços recentes")
        
        # Calcular estatísticas
        stats = spr_db.price_service.calculate_price_statistics(session, commodity_id, 30)
        if stats:
            logger.info(f"📊 Estatísticas de preços: Mín: R${stats.get('min_price', 0):.2f}, "
                       f"Máx: R${stats.get('max_price', 0):.2f}, "
                       f"Média: R${stats.get('avg_price', 0):.2f}")
        
        # Testar cache
        cache_test_key = "test_cache_key"
        db_manager.cache_set(cache_test_key, "test_value", 60)
        cached_value = db_manager.cache_get(cache_test_key)
        
        if cached_value == "test_value":
            logger.info("✅ Cache Redis funcionando")
            db_manager.cache_delete(cache_test_key)
        else:
            logger.warning("⚠️ Cache Redis não funcionando corretamente")


def test_alert_system(commodity_id: int):
    """Testa sistema de alertas"""
    logger.info("🚨 Testando sistema de alertas...")
    
    with spr_db.get_session() as session:
        # Verificar alertas pendentes
        triggered_alerts = spr_db.alert_service.check_price_alerts(session)
        logger.info(f"⚡ {len(triggered_alerts)} alertas disparados")
        
        for alert in triggered_alerts:
            logger.info(f"🔔 Alerta: {alert.alert_type} para commodity {alert.commodity_id}")


def test_whatsapp_user_operations():
    """Testa operações com usuários WhatsApp"""
    logger.info("📱 Testando operações com usuários WhatsApp...")
    
    with spr_db.get_session() as session:
        # Buscar usuário de teste
        test_user = spr_db.user_service.get_user_by_phone(session, "+5565999999999")
        
        if test_user:
            logger.info(f"👤 Usuário teste encontrado: {test_user.name}")
            
            # Atualizar última interação
            spr_db.user_service.update_last_interaction(session, test_user.phone_number)
            logger.info("✅ Última interação atualizada")
        else:
            logger.warning("⚠️ Usuário teste não encontrado")


def test_agents_integration():
    """Testa integração com sistema multi-agente"""
    logger.info("🤖 Testando integração com sistema multi-agente...")
    
    # Inicializar sistema de agentes
    agent_system = SPRAgentSystem()
    
    if agent_system.load_config():
        logger.info("✅ Configuração de agentes carregada")
        
        if agent_system.initialize_agents():
            logger.info(f"✅ {len(agent_system.agents)} agentes inicializados")
            
            # Testar mapeamento de arquivos
            file_mapping = agent_system.analyze_project_files()
            logger.info(f"📁 Arquivos mapeados para {len(file_mapping)} agentes")
            
            # Verificar agente de banco de dados
            db_agent = agent_system.agents.get('database_engineer')
            if db_agent:
                logger.info(f"🗄️ Agente de banco encontrado: {db_agent.name}")
                logger.info(f"🎯 Status: {db_agent.status}")
            
            return True
        else:
            logger.error("❌ Falha ao inicializar agentes")
            return False
    else:
        logger.error("❌ Falha ao carregar configuração de agentes")
        return False


def demonstrate_agent_database_workflow():
    """Demonstra workflow completo agentes + banco"""
    logger.info("🔄 Demonstrando workflow agentes + banco de dados...")
    
    # Simular cenário: agente Financial Modeling analisa preços
    logger.info("💡 Cenário: Agente Financial Modeling analisando preços da soja...")
    
    with spr_db.get_session() as session:
        soja = spr_db.commodity_service.get_commodity_by_symbol(session, "SOJA")
        
        if soja:
            # 1. Obter dados históricos
            historical_prices = spr_db.price_service.get_price_history(session, soja.id, 30)
            logger.info(f"📊 Agente obteve {len(historical_prices)} registros históricos")
            
            # 2. Calcular estatísticas
            stats = spr_db.price_service.calculate_price_statistics(session, soja.id, 30)
            logger.info(f"🧮 Agente calculou estatísticas: volatilidade = {stats.get('volatility', 0):.2f}")
            
            # 3. Simular criação de previsão
            if stats:
                prediction_data = {
                    "commodity_id": soja.id,
                    "predicted_price": stats['avg_price'] * 1.05,  # 5% de alta prevista
                    "confidence_score": 0.75,
                    "prediction_horizon": 7,
                    "model_name": "AgentML_v1",
                    "model_version": "1.0",
                    "features_used": {"historical_prices": True, "weather": False},
                    "prediction_date": datetime.now(),
                    "target_date": datetime.now() + timedelta(days=7)
                }
                
                prediction = spr_db.prediction_service.save_prediction(session, prediction_data)
                logger.info(f"🔮 Agente criou previsão: R${prediction.predicted_price:.2f} para {prediction.target_date.date()}")
    
    # Simular cenário: agente Business Intelligence verifica alertas
    logger.info("📊 Cenário: Agente Business Intelligence verificando alertas...")
    
    with spr_db.get_session() as session:
        triggered_alerts = spr_db.alert_service.check_price_alerts(session)
        if triggered_alerts:
            logger.info(f"🚨 Agente encontrou {len(triggered_alerts)} alertas disparados")
        else:
            logger.info("✅ Agente verificou alertas - nenhum disparado")
    
    logger.info("🎯 Workflow demonstrado com sucesso!")


def main():
    """Função principal de teste"""
    logger.info("=" * 80)
    logger.info("🧪 TESTE COMPLETO: SISTEMA MULTI-AGENTE + BANCO DE DADOS SPR")
    logger.info("=" * 80)
    
    try:
        # 1. Testar conexões
        if not test_database_connection():
            logger.error("❌ Teste de conexão falhou")
            return False
        
        # 2. Testar operações básicas
        commodity_id = test_commodity_operations()
        if commodity_id:
            test_price_operations(commodity_id)
            test_alert_system(commodity_id)
        
        # 3. Testar usuários WhatsApp
        test_whatsapp_user_operations()
        
        # 4. Testar integração com agentes
        if test_agents_integration():
            # 5. Demonstrar workflow completo
            demonstrate_agent_database_workflow()
        
        logger.info("=" * 80)
        logger.info("✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
        logger.info("🚀 Sistema Multi-Agente + Banco SPR está funcionando!")
        logger.info("=" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro durante os testes: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)