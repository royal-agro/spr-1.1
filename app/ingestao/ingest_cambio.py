"""
📦 SPR 1.1 - Ingestão de Dados Cambiais
Coleta automatizada de dados cambiais e econômicos
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
import random
import math
from app.models.dados_agro import Cambio
from app.database.conn import get_session

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def buscar_dados_simulados() -> pd.DataFrame:
    """
    Simula dados cambiais para desenvolvimento (Volume 1)
    Retorna DataFrame com dados econômicos
    """
    logger.info("💱 Simulando dados cambiais...")
    
    # Parâmetros base
    usd_brl_base = 5.15
    selic_base = 10.75
    ipca_base = 0.32
    
    dados_simulados = []
    data_atual = datetime.now()
    
    # Gerar dados para últimos 30 dias
    for dias_atras in range(30):
        data_cambio = data_atual - timedelta(days=dias_atras)
        
        # Pular fins de semana para dados cambiais
        if data_cambio.weekday() >= 5:  # Sábado=5, Domingo=6
            continue
        
        # USD/BRL com volatilidade
        variacao_usd = random.uniform(-0.02, 0.02)  # ±2%
        usd_brl = usd_brl_base * (1 + variacao_usd)
        
        # SELIC (apenas dias úteis, mudanças graduais)
        variacao_selic = random.uniform(-0.001, 0.001)  # ±0.1%
        selic = max(0, selic_base + variacao_selic)
        
        # IPCA (mensal, mas simulamos diário)
        variacao_ipca = random.uniform(-0.01, 0.01)  # ±1%
        ipca = max(0, ipca_base + variacao_ipca)
        
        # Adicionar correlações econômicas
        # Se USD/BRL sobe, commodities ficam mais competitivas
        if usd_brl > usd_brl_base:
            # Dólar alto pode pressionar inflação
            ipca *= 1.02
        
        dados_simulados.append({
            "data": data_cambio.strftime("%Y-%m-%d"),
            "usd_brl": round(usd_brl, 4),
            "selic": round(selic, 2),
            "ipca": round(ipca, 2),
            "fonte": "BCB"
        })
    
    df = pd.DataFrame(dados_simulados)
    logger.info(f"✅ {len(df)} registros cambiais simulados")
    return df

def normalizar_dados_cambio(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza dados cambiais para formato padrão
    """
    logger.info("🔄 Normalizando dados cambiais...")
    
    # Converter data para datetime
    df['data'] = pd.to_datetime(df['data'])
    
    # Validar USD/BRL
    df = df[(df['usd_brl'] > 1) & (df['usd_brl'] < 10)]
    
    # Validar SELIC
    df = df[(df['selic'] >= 0) & (df['selic'] <= 50)]
    
    # Validar IPCA
    df = df[(df['ipca'] >= -5) & (df['ipca'] <= 20)]
    
    # Ordenar por data
    df = df.sort_values('data')
    
    logger.info(f"✅ {len(df)} registros cambiais normalizados")
    return df

def salvar_dados_cambio(df: pd.DataFrame) -> int:
    """
    Salva dados cambiais no banco de dados
    """
    logger.info("💾 Salvando dados cambiais no banco...")
    
    registros_salvos = 0
    
    with get_session() as session:
        for _, row in df.iterrows():
            # Verificar se já existe registro para mesma data
            existing = session.query(Cambio).filter(
                Cambio.data == row['data']
            ).first()
            
            if not existing:
                cambio = Cambio(
                    data=row['data'],
                    usd_brl=row['usd_brl'],
                    selic=row['selic'],
                    ipca=row['ipca'],
                    fonte=row['fonte']
                )
                session.add(cambio)
                registros_salvos += 1
    
    logger.info(f"✅ {registros_salvos} novos registros cambiais salvos")
    return registros_salvos

def executar_ingestao_cambio() -> Dict:
    """
    Executa processo completo de ingestão cambial
    """
    logger.info("🚀 Iniciando ingestão cambial...")
    
    try:
        # 1. Buscar dados (simulados por enquanto)
        df_raw = buscar_dados_simulados()
        
        # 2. Normalizar dados
        df_normalized = normalizar_dados_cambio(df_raw)
        
        # 3. Salvar no banco
        registros_salvos = salvar_dados_cambio(df_normalized)
        
        resultado = {
            "status": "sucesso",
            "registros_processados": len(df_raw),
            "registros_salvos": registros_salvos,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Ingestão cambial concluída: {resultado}")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro na ingestão cambial: {e}")
        return {
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

def obter_dados_cambio(dias: int = 7) -> List[Dict]:
    """
    Obtém dados cambiais do banco de dados
    """
    logger.info(f"📊 Consultando dados cambiais: dias={dias}")
    
    with get_session() as session:
        # Últimos N dias
        data_limite = datetime.now() - timedelta(days=dias)
        
        dados_cambio = session.query(Cambio).filter(
            Cambio.data >= data_limite
        ).order_by(Cambio.data.desc()).all()
        
        # Converter para dict
        resultado = []
        for cambio in dados_cambio:
            resultado.append({
                "data": cambio.data.strftime("%Y-%m-%d"),
                "usd_brl": cambio.usd_brl,
                "selic": cambio.selic,
                "ipca": cambio.ipca,
                "fonte": cambio.fonte
            })
        
        logger.info(f"✅ {len(resultado)} registros cambiais encontrados")
        return resultado

def calcular_variacoes_cambiais(dias: int = 30) -> Dict:
    """
    Calcula variações cambiais e econômicas
    """
    logger.info(f"📈 Calculando variações cambiais: {dias} dias")
    
    dados = obter_dados_cambio(dias)
    
    if len(dados) < 2:
        return {"erro": "Dados insuficientes para calcular variações"}
    
    # Ordenar por data
    dados_ordenados = sorted(dados, key=lambda x: x['data'])
    
    primeiro = dados_ordenados[0]
    ultimo = dados_ordenados[-1]
    
    # Calcular variações
    def calcular_variacao(inicial, final):
        if inicial == 0:
            return 0
        return ((final - inicial) / inicial) * 100
    
    var_usd_brl = calcular_variacao(primeiro['usd_brl'], ultimo['usd_brl'])
    var_selic = calcular_variacao(primeiro['selic'], ultimo['selic'])
    var_ipca = calcular_variacao(primeiro['ipca'], ultimo['ipca'])
    
    # Médias do período
    media_usd_brl = sum(d['usd_brl'] for d in dados) / len(dados)
    media_selic = sum(d['selic'] for d in dados) / len(dados)
    media_ipca = sum(d['ipca'] for d in dados) / len(dados)
    
    # Volatilidade (desvio padrão)
    def calcular_volatilidade(valores):
        media = sum(valores) / len(valores)
        variancia = sum((x - media) ** 2 for x in valores) / len(valores)
        return math.sqrt(variancia)
    
    vol_usd_brl = calcular_volatilidade([d['usd_brl'] for d in dados])
    
    resultado = {
        "periodo_dias": dias,
        "usd_brl": {
            "inicial": primeiro['usd_brl'],
            "final": ultimo['usd_brl'],
            "variacao_pct": round(var_usd_brl, 2),
            "media": round(media_usd_brl, 4),
            "volatilidade": round(vol_usd_brl, 4),
            "tendencia": "alta" if var_usd_brl > 0 else "baixa"
        },
        "selic": {
            "inicial": primeiro['selic'],
            "final": ultimo['selic'],
            "variacao_pct": round(var_selic, 2),
            "media": round(media_selic, 2),
            "tendencia": "alta" if var_selic > 0 else "baixa"
        },
        "ipca": {
            "inicial": primeiro['ipca'],
            "final": ultimo['ipca'],
            "variacao_pct": round(var_ipca, 2),
            "media": round(media_ipca, 2),
            "tendencia": "alta" if var_ipca > 0 else "baixa"
        },
        "total_registros": len(dados)
    }
    
    logger.info(f"✅ Variações cambiais calculadas")
    return resultado

def analisar_impacto_commodities(dias: int = 30) -> Dict:
    """
    Analisa impacto cambial nas commodities agrícolas
    """
    logger.info(f"🌾 Analisando impacto cambial nas commodities")
    
    dados = obter_dados_cambio(dias)
    
    if not dados:
        return {"erro": "Dados insuficientes para análise"}
    
    # Dados mais recentes
    ultimo_dado = dados[0]  # Dados ordenados por data desc
    
    usd_brl_atual = ultimo_dado['usd_brl']
    selic_atual = ultimo_dado['selic']
    
    # Análise de competitividade
    def analisar_competitividade(usd_brl):
        if usd_brl > 5.5:
            return "alta"  # Dólar alto = commodities competitivas
        elif usd_brl < 4.5:
            return "baixa"  # Dólar baixo = commodities menos competitivas
        else:
            return "moderada"
    
    # Análise de custo de financiamento
    def analisar_financiamento(selic):
        if selic > 12:
            return "alto"  # SELIC alta = custo alto
        elif selic < 6:
            return "baixo"  # SELIC baixa = custo baixo
        else:
            return "moderado"
    
    # Recomendações
    competitividade = analisar_competitividade(usd_brl_atual)
    custo_financiamento = analisar_financiamento(selic_atual)
    
    recomendacoes = []
    
    if competitividade == "alta":
        recomendacoes.append("Commodities brasileiras competitivas no mercado internacional")
    
    if custo_financiamento == "alto":
        recomendacoes.append("Custo de financiamento elevado pode pressionar margens")
    
    if usd_brl_atual > 5.3 and selic_atual > 10:
        recomendacoes.append("Cenário favorável para exportações, mas cuidado com custos")
    
    resultado = {
        "data_analise": ultimo_dado['data'],
        "usd_brl_atual": usd_brl_atual,
        "selic_atual": selic_atual,
        "competitividade_exportacao": competitividade,
        "custo_financiamento": custo_financiamento,
        "recomendacoes": recomendacoes,
        "impacto_geral": "positivo" if competitividade == "alta" and custo_financiamento != "alto" else "neutro"
    }
    
    logger.info(f"✅ Análise de impacto concluída")
    return resultado

def identificar_alertas_cambiais() -> List[Dict]:
    """
    Identifica alertas cambiais baseados em variações extremas
    """
    logger.info("🚨 Identificando alertas cambiais...")
    
    alertas = []
    variacoes = calcular_variacoes_cambiais(7)  # Últimos 7 dias
    
    if "erro" in variacoes:
        return alertas
    
    # Alerta de variação extrema do dólar
    if abs(variacoes['usd_brl']['variacao_pct']) > 3:
        alertas.append({
            "tipo": "usd_brl_variacao",
            "severidade": "alta",
            "valor": variacoes['usd_brl']['variacao_pct'],
            "mensagem": f"Variação extrema USD/BRL: {variacoes['usd_brl']['variacao_pct']}%"
        })
    
    # Alerta de dólar muito alto
    if variacoes['usd_brl']['final'] > 6.0:
        alertas.append({
            "tipo": "usd_brl_alto",
            "severidade": "media",
            "valor": variacoes['usd_brl']['final'],
            "mensagem": f"Dólar em patamar elevado: R$ {variacoes['usd_brl']['final']}"
        })
    
    # Alerta de SELIC alta
    if variacoes['selic']['final'] > 15:
        alertas.append({
            "tipo": "selic_alta",
            "severidade": "alta",
            "valor": variacoes['selic']['final'],
            "mensagem": f"SELIC em patamar muito alto: {variacoes['selic']['final']}%"
        })
    
    # Alerta de volatilidade alta
    if variacoes['usd_brl']['volatilidade'] > 0.2:
        alertas.append({
            "tipo": "volatilidade_alta",
            "severidade": "media",
            "valor": variacoes['usd_brl']['volatilidade'],
            "mensagem": f"Alta volatilidade cambial: {variacoes['usd_brl']['volatilidade']}"
        })
    
    logger.info(f"✅ {len(alertas)} alertas cambiais identificados")
    return alertas

# Função para integração com scheduler
def job_ingestao_cambio():
    """
    Job para execução agendada da ingestão cambial
    """
    logger.info("⏰ Executando job agendado cambial...")
    resultado = executar_ingestao_cambio()
    
    if resultado["status"] == "sucesso":
        logger.info(f"✅ Job cambial concluído: {resultado['registros_salvos']} registros")
        
        # Verificar alertas após ingestão
        alertas = identificar_alertas_cambiais()
        if alertas:
            logger.warning(f"🚨 {len(alertas)} alertas cambiais detectados!")
    else:
        logger.error(f"❌ Job cambial falhou: {resultado['erro']}")
    
    return resultado

if __name__ == "__main__":
    # Executar ingestão manual
    resultado = executar_ingestao_cambio()
    print(f"📊 Resultado: {resultado}")
    
    # Exemplo de consulta
    dados = obter_dados_cambio(7)
    print(f"💱 Dados cambiais: {len(dados)} registros")
    
    # Exemplo de variações
    variacoes = calcular_variacoes_cambiais()
    print(f"📈 Variações: {variacoes}")
    
    # Exemplo de impacto
    impacto = analisar_impacto_commodities()
    print(f"🌾 Impacto commodities: {impacto}")
    
    # Exemplo de alertas
    alertas = identificar_alertas_cambiais()
    print(f"🚨 Alertas: {len(alertas)} alertas") 