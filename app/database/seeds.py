"""
📦 SPR 1.1 - Seeds do Banco de Dados
Dados iniciais para popular tabelas do sistema
"""

import logging
from datetime import datetime, timedelta
from app.models.dados_agro import (
    PrecoAgro, Clima, Cambio, Estoque, Sentimento,
    criar_tabelas, get_session
)

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_precos_agro():
    """Popula tabela de preços agrícolas com dados iniciais"""
    logger.info("🌱 Populando preços agrícolas...")
    
    # Dados iniciais de preços por cultura
    precos_iniciais = [
        # Soja
        {"cultura": "soja", "valor": 120.50, "regiao": "MT"},
        {"cultura": "soja", "valor": 118.75, "regiao": "GO"},
        {"cultura": "soja", "valor": 122.30, "regiao": "RS"},
        {"cultura": "soja", "valor": 119.80, "regiao": "PR"},
        
        # Milho
        {"cultura": "milho", "valor": 65.40, "regiao": "MT"},
        {"cultura": "milho", "valor": 63.20, "regiao": "GO"},
        {"cultura": "milho", "valor": 67.10, "regiao": "RS"},
        {"cultura": "milho", "valor": 64.80, "regiao": "PR"},
        
        # Café
        {"cultura": "cafe", "valor": 890.50, "regiao": "MG"},
        {"cultura": "cafe", "valor": 885.20, "regiao": "ES"},
        {"cultura": "cafe", "valor": 892.75, "regiao": "SP"},
        
        # Algodão
        {"cultura": "algodao", "valor": 4.25, "regiao": "MT"},
        {"cultura": "algodao", "valor": 4.18, "regiao": "BA"},
        {"cultura": "algodao", "valor": 4.32, "regiao": "GO"},
    ]
    
    with get_session() as session:
        for preco_data in precos_iniciais:
            preco = PrecoAgro(
                cultura=preco_data["cultura"],
                data=datetime.now() - timedelta(days=1),
                valor=preco_data["valor"],
                regiao=preco_data["regiao"],
                fonte="CEPEA"
            )
            session.add(preco)
        
        logger.info(f"✅ {len(precos_iniciais)} preços agrícolas inseridos")

def seed_clima():
    """Popula tabela de clima com dados iniciais"""
    logger.info("🌤️ Populando dados climáticos...")
    
    regioes = ["MT", "GO", "RS", "PR", "MG", "SP", "BA"]
    
    with get_session() as session:
        for regiao in regioes:
            clima = Clima(
                data=datetime.now() - timedelta(days=1),
                regiao=regiao,
                temp_min=18.5,
                temp_max=32.8,
                chuva_mm=12.4,
                ndvi=0.65,
                fonte="INMET"
            )
            session.add(clima)
        
        logger.info(f"✅ {len(regioes)} registros climáticos inseridos")

def seed_cambio():
    """Popula tabela de câmbio com dados iniciais"""
    logger.info("💱 Populando dados cambiais...")
    
    with get_session() as session:
        cambio = Cambio(
            data=datetime.now() - timedelta(days=1),
            usd_brl=5.15,
            selic=10.75,
            ipca=0.32,
            fonte="BCB"
        )
        session.add(cambio)
        
        logger.info("✅ 1 registro cambial inserido")

def seed_estoque():
    """Popula tabela de estoque com dados iniciais"""
    logger.info("📦 Populando dados de estoque...")
    
    estoques_iniciais = [
        {"cultura": "soja", "tipo": "inicial", "valor": 2500.0},
        {"cultura": "soja", "tipo": "producao", "valor": 125000.0},
        {"cultura": "milho", "tipo": "inicial", "valor": 1800.0},
        {"cultura": "milho", "tipo": "producao", "valor": 82000.0},
        {"cultura": "cafe", "tipo": "inicial", "valor": 450.0},
        {"cultura": "cafe", "tipo": "producao", "valor": 3200.0},
    ]
    
    with get_session() as session:
        for estoque_data in estoques_iniciais:
            estoque = Estoque(
                cultura=estoque_data["cultura"],
                data=datetime.now() - timedelta(days=1),
                tipo=estoque_data["tipo"],
                valor=estoque_data["valor"],
                fonte="CONAB"
            )
            session.add(estoque)
        
        logger.info(f"✅ {len(estoques_iniciais)} registros de estoque inseridos")

def seed_sentimento():
    """Popula tabela de sentimento com dados iniciais"""
    logger.info("📰 Populando análise de sentimento...")
    
    noticias_iniciais = [
        {
            "manchete": "Safra de soja 2024/25 deve superar expectativas no Centro-Oeste",
            "score": 0.75,
            "fonte": "AgroNews",
            "categoria": "producao"
        },
        {
            "manchete": "Preços do milho em alta devido à demanda internacional",
            "score": 0.65,
            "fonte": "RuralBR",
            "categoria": "mercado"
        },
        {
            "manchete": "Clima favorável beneficia plantio de café em Minas Gerais",
            "score": 0.80,
            "fonte": "CafePoint",
            "categoria": "clima"
        },
        {
            "manchete": "Incertezas cambiais afetam exportações de commodities",
            "score": -0.45,
            "fonte": "EconomiaRural",
            "categoria": "economia"
        },
    ]
    
    with get_session() as session:
        for noticia_data in noticias_iniciais:
            sentimento = Sentimento(
                data=datetime.now() - timedelta(hours=6),
                manchete=noticia_data["manchete"],
                score=noticia_data["score"],
                fonte=noticia_data["fonte"],
                categoria=noticia_data["categoria"]
            )
            session.add(sentimento)
        
        logger.info(f"✅ {len(noticias_iniciais)} análises de sentimento inseridas")

def executar_seeds():
    """Executa todos os seeds do banco de dados"""
    logger.info("🚀 Iniciando população do banco de dados...")
    
    try:
        # Criar tabelas se não existirem
        criar_tabelas()
        
        # Executar seeds
        seed_precos_agro()
        seed_clima()
        seed_cambio()
        seed_estoque()
        seed_sentimento()
        
        logger.info("✅ Todos os seeds executados com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro ao executar seeds: {e}")
        raise

def limpar_dados():
    """Limpa todos os dados das tabelas (usar com cuidado!)"""
    logger.warning("⚠️ Limpando todos os dados do banco...")
    
    with get_session() as session:
        # Limpar todas as tabelas
        session.exec("DELETE FROM sentimento")
        session.exec("DELETE FROM estoque")
        session.exec("DELETE FROM cambio")
        session.exec("DELETE FROM clima")
        session.exec("DELETE FROM precos_agro")
        
        logger.info("✅ Dados limpos com sucesso!")

if __name__ == "__main__":
    # Executar seeds
    executar_seeds()
    
    # Verificar dados inseridos
    from app.database.conn import obter_info_banco
    info = obter_info_banco()
    print(f"📊 Dados inseridos: {info}") 