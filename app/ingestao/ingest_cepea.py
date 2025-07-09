"""
📦 SPR 1.1 - Ingestão de Dados CEPEA
Coleta automatizada de preços agrícolas do CEPEA
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
import random
from app.models.dados_agro import PrecoAgro
from app.database.conn import get_session

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Culturas e regiões suportadas
CULTURAS_CEPEA = ["soja", "milho", "cafe", "algodao", "boi", "trigo"]
REGIOES_BRASIL = ["MT", "GO", "RS", "PR", "MG", "SP", "BA", "MS", "SC", "RO"]

def buscar_dados_simulados() -> pd.DataFrame:
    """
    Simula dados do CEPEA para desenvolvimento (Volume 1)
    Retorna DataFrame com preços por cultura e região
    """
    logger.info("🌱 Simulando dados CEPEA...")
    
    # Preços base por cultura (R$/saca ou R$/arroba)
    precos_base = {
        "soja": 120.0,
        "milho": 65.0,
        "cafe": 890.0,
        "algodao": 4.2,
        "boi": 285.0,  # R$/arroba
        "trigo": 95.0
    }
    
    dados_simulados = []
    data_atual = datetime.now()
    
    # Gerar dados para últimos 30 dias
    for dias_atras in range(30):
        data_preco = data_atual - timedelta(days=dias_atras)
        
        for cultura in CULTURAS_CEPEA:
            for regiao in random.sample(REGIOES_BRASIL, 3):  # 3 regiões por cultura
                # Simular variação de preço (-5% a +5%)
                variacao = random.uniform(-0.05, 0.05)
                preco_base = precos_base[cultura]
                preco_final = preco_base * (1 + variacao)
                
                # Adicionar sazonalidade
                if data_preco.month in [3, 4, 5]:  # Safra
                    preco_final *= 0.95
                elif data_preco.month in [9, 10, 11]:  # Entressafra
                    preco_final *= 1.05
                
                dados_simulados.append({
                    "cultura": cultura,
                    "data": data_preco.strftime("%Y-%m-%d"),
                    "valor": round(preco_final, 2),
                    "regiao": regiao,
                    "fonte": "CEPEA"
                })
    
    df = pd.DataFrame(dados_simulados)
    logger.info(f"✅ {len(df)} registros simulados gerados")
    return df

def normalizar_dados_cepea(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza dados do CEPEA para formato padrão
    """
    logger.info("🔄 Normalizando dados CEPEA...")
    
    # Converter data para datetime
    df['data'] = pd.to_datetime(df['data'])
    
    # Padronizar nomes de cultura
    df['cultura'] = df['cultura'].str.lower().str.strip()
    
    # Padronizar região
    df['regiao'] = df['regiao'].str.upper().str.strip()
    
    # Validar valores
    df = df[df['valor'] > 0]  # Remover preços inválidos
    
    # Ordenar por data
    df = df.sort_values(['cultura', 'regiao', 'data'])
    
    logger.info(f"✅ {len(df)} registros normalizados")
    return df

def salvar_dados_cepea(df: pd.DataFrame) -> int:
    """
    Salva dados do CEPEA no banco de dados
    """
    logger.info("💾 Salvando dados CEPEA no banco...")
    
    registros_salvos = 0
    
    with get_session() as session:
        for _, row in df.iterrows():
            # Verificar se já existe registro para mesma cultura/região/data
            existing = session.query(PrecoAgro).filter(
                PrecoAgro.cultura == row['cultura'],
                PrecoAgro.regiao == row['regiao'],
                PrecoAgro.data == row['data']
            ).first()
            
            if not existing:
                preco = PrecoAgro(
                    cultura=row['cultura'],
                    data=row['data'],
                    valor=row['valor'],
                    regiao=row['regiao'],
                    fonte=row['fonte']
                )
                session.add(preco)
                registros_salvos += 1
    
    logger.info(f"✅ {registros_salvos} novos registros salvos")
    return registros_salvos

def executar_ingestao_cepea() -> Dict:
    """
    Executa processo completo de ingestão CEPEA
    """
    logger.info("🚀 Iniciando ingestão CEPEA...")
    
    try:
        # 1. Buscar dados (simulados por enquanto)
        df_raw = buscar_dados_simulados()
        
        # 2. Normalizar dados
        df_normalized = normalizar_dados_cepea(df_raw)
        
        # 3. Salvar no banco
        registros_salvos = salvar_dados_cepea(df_normalized)
        
        resultado = {
            "status": "sucesso",
            "registros_processados": len(df_raw),
            "registros_salvos": registros_salvos,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Ingestão CEPEA concluída: {resultado}")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro na ingestão CEPEA: {e}")
        return {
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

def obter_ultimos_precos(cultura: str = None, regiao: str = None, dias: int = 7) -> List[Dict]:
    """
    Obtém últimos preços do banco de dados
    """
    logger.info(f"📊 Consultando preços: cultura={cultura}, regiao={regiao}, dias={dias}")
    
    with get_session() as session:
        query = session.query(PrecoAgro)
        
        # Filtros opcionais
        if cultura:
            query = query.filter(PrecoAgro.cultura == cultura.lower())
        if regiao:
            query = query.filter(PrecoAgro.regiao == regiao.upper())
        
        # Últimos N dias
        data_limite = datetime.now() - timedelta(days=dias)
        query = query.filter(PrecoAgro.data >= data_limite)
        
        # Ordenar por data
        precos = query.order_by(PrecoAgro.data.desc()).all()
        
        # Converter para dict
        resultado = []
        for preco in precos:
            resultado.append({
                "cultura": preco.cultura,
                "data": preco.data.strftime("%Y-%m-%d"),
                "valor": preco.valor,
                "regiao": preco.regiao,
                "fonte": preco.fonte
            })
        
        logger.info(f"✅ {len(resultado)} preços encontrados")
        return resultado

def calcular_variacao_precos(cultura: str, regiao: str = None, dias: int = 30) -> Dict:
    """
    Calcula variação de preços para uma cultura
    """
    logger.info(f"📈 Calculando variação: {cultura} ({regiao})")
    
    precos = obter_ultimos_precos(cultura, regiao, dias)
    
    if len(precos) < 2:
        return {"erro": "Dados insuficientes para calcular variação"}
    
    # Ordenar por data
    precos_ordenados = sorted(precos, key=lambda x: x['data'])
    
    preco_inicial = precos_ordenados[0]['valor']
    preco_final = precos_ordenados[-1]['valor']
    
    variacao_absoluta = preco_final - preco_inicial
    variacao_percentual = (variacao_absoluta / preco_inicial) * 100
    
    resultado = {
        "cultura": cultura,
        "regiao": regiao,
        "periodo_dias": dias,
        "preco_inicial": preco_inicial,
        "preco_final": preco_final,
        "variacao_absoluta": round(variacao_absoluta, 2),
        "variacao_percentual": round(variacao_percentual, 2),
        "tendencia": "alta" if variacao_percentual > 0 else "baixa",
        "total_registros": len(precos)
    }
    
    logger.info(f"✅ Variação calculada: {variacao_percentual:.2f}%")
    return resultado

# Função para integração com scheduler
def job_ingestao_cepea():
    """
    Job para execução agendada da ingestão CEPEA
    """
    logger.info("⏰ Executando job agendado CEPEA...")
    resultado = executar_ingestao_cepea()
    
    if resultado["status"] == "sucesso":
        logger.info(f"✅ Job CEPEA concluído: {resultado['registros_salvos']} registros")
    else:
        logger.error(f"❌ Job CEPEA falhou: {resultado['erro']}")
    
    return resultado

if __name__ == "__main__":
    # Executar ingestão manual
    resultado = executar_ingestao_cepea()
    print(f"📊 Resultado: {resultado}")
    
    # Exemplo de consulta
    precos_soja = obter_ultimos_precos("soja", "MT", 7)
    print(f"🌱 Preços soja MT: {len(precos_soja)} registros")
    
    # Exemplo de variação
    variacao = calcular_variacao_precos("soja", "MT")
    print(f"📈 Variação soja MT: {variacao}") 