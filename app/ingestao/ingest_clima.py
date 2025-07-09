"""
📦 SPR 1.1 - Ingestão de Dados Climáticos
Coleta automatizada de dados climáticos e NDVI
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
import random
import math
from app.models.dados_agro import Clima
from app.database.conn import get_session

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Regiões agrícolas principais
REGIOES_CLIMA = ["MT", "GO", "RS", "PR", "MG", "SP", "BA", "MS", "SC", "RO"]

def buscar_dados_simulados() -> pd.DataFrame:
    """
    Simula dados climáticos para desenvolvimento (Volume 1)
    Retorna DataFrame com dados meteorológicos por região
    """
    logger.info("🌤️ Simulando dados climáticos...")
    
    # Parâmetros climáticos base por região
    parametros_regiao = {
        "MT": {"temp_base": 26, "chuva_base": 8, "ndvi_base": 0.65},
        "GO": {"temp_base": 24, "chuva_base": 6, "ndvi_base": 0.62},
        "RS": {"temp_base": 20, "chuva_base": 12, "ndvi_base": 0.58},
        "PR": {"temp_base": 22, "chuva_base": 10, "ndvi_base": 0.60},
        "MG": {"temp_base": 23, "chuva_base": 7, "ndvi_base": 0.63},
        "SP": {"temp_base": 21, "chuva_base": 9, "ndvi_base": 0.59},
        "BA": {"temp_base": 27, "chuva_base": 5, "ndvi_base": 0.55},
        "MS": {"temp_base": 25, "chuva_base": 7, "ndvi_base": 0.61},
        "SC": {"temp_base": 19, "chuva_base": 14, "ndvi_base": 0.57},
        "RO": {"temp_base": 28, "chuva_base": 11, "ndvi_base": 0.67}
    }
    
    dados_simulados = []
    data_atual = datetime.now()
    
    # Gerar dados para últimos 30 dias
    for dias_atras in range(30):
        data_clima = data_atual - timedelta(days=dias_atras)
        
        for regiao in REGIOES_CLIMA:
            params = parametros_regiao[regiao]
            
            # Simular sazonalidade
            mes = data_clima.month
            fator_sazonal = 1 + 0.2 * math.sin(2 * math.pi * mes / 12)
            
            # Temperatura com variação
            temp_base = params["temp_base"] * fator_sazonal
            temp_min = temp_base - random.uniform(3, 8)
            temp_max = temp_base + random.uniform(5, 12)
            
            # Chuva com variação sazonal
            chuva_base = params["chuva_base"]
            if mes in [12, 1, 2, 3]:  # Verão - mais chuva
                chuva_base *= 2.5
            elif mes in [6, 7, 8]:  # Inverno - menos chuva
                chuva_base *= 0.3
            
            chuva_mm = max(0, chuva_base + random.uniform(-5, 15))
            
            # NDVI com base na chuva e temperatura
            ndvi_base = params["ndvi_base"]
            if chuva_mm > 10:  # Chuva aumenta NDVI
                ndvi_base *= 1.1
            elif chuva_mm < 2:  # Seca diminui NDVI
                ndvi_base *= 0.9
            
            ndvi_final = max(0.1, min(0.9, ndvi_base + random.uniform(-0.1, 0.1)))
            
            dados_simulados.append({
                "data": data_clima.strftime("%Y-%m-%d"),
                "regiao": regiao,
                "temp_min": round(temp_min, 1),
                "temp_max": round(temp_max, 1),
                "chuva_mm": round(chuva_mm, 1),
                "ndvi": round(ndvi_final, 3),
                "fonte": "INMET"
            })
    
    df = pd.DataFrame(dados_simulados)
    logger.info(f"✅ {len(df)} registros climáticos simulados")
    return df

def normalizar_dados_clima(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza dados climáticos para formato padrão
    """
    logger.info("🔄 Normalizando dados climáticos...")
    
    # Converter data para datetime
    df['data'] = pd.to_datetime(df['data'])
    
    # Padronizar região
    df['regiao'] = df['regiao'].str.upper().str.strip()
    
    # Validar temperaturas
    df = df[(df['temp_min'] >= -10) & (df['temp_max'] <= 50)]
    df = df[df['temp_max'] > df['temp_min']]  # Temp max > temp min
    
    # Validar chuva
    df = df[df['chuva_mm'] >= 0]
    
    # Validar NDVI
    df = df[(df['ndvi'] >= 0) & (df['ndvi'] <= 1)]
    
    # Ordenar por data
    df = df.sort_values(['regiao', 'data'])
    
    logger.info(f"✅ {len(df)} registros climáticos normalizados")
    return df

def salvar_dados_clima(df: pd.DataFrame) -> int:
    """
    Salva dados climáticos no banco de dados
    """
    logger.info("💾 Salvando dados climáticos no banco...")
    
    registros_salvos = 0
    
    with get_session() as session:
        for _, row in df.iterrows():
            # Verificar se já existe registro para mesma região/data
            existing = session.query(Clima).filter(
                Clima.regiao == row['regiao'],
                Clima.data == row['data']
            ).first()
            
            if not existing:
                clima = Clima(
                    data=row['data'],
                    regiao=row['regiao'],
                    temp_min=row['temp_min'],
                    temp_max=row['temp_max'],
                    chuva_mm=row['chuva_mm'],
                    ndvi=row['ndvi'],
                    fonte=row['fonte']
                )
                session.add(clima)
                registros_salvos += 1
    
    logger.info(f"✅ {registros_salvos} novos registros climáticos salvos")
    return registros_salvos

def executar_ingestao_clima() -> Dict:
    """
    Executa processo completo de ingestão climática
    """
    logger.info("🚀 Iniciando ingestão climática...")
    
    try:
        # 1. Buscar dados (simulados por enquanto)
        df_raw = buscar_dados_simulados()
        
        # 2. Normalizar dados
        df_normalized = normalizar_dados_clima(df_raw)
        
        # 3. Salvar no banco
        registros_salvos = salvar_dados_clima(df_normalized)
        
        resultado = {
            "status": "sucesso",
            "registros_processados": len(df_raw),
            "registros_salvos": registros_salvos,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Ingestão climática concluída: {resultado}")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro na ingestão climática: {e}")
        return {
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

def obter_dados_clima(regiao: str = None, dias: int = 7) -> List[Dict]:
    """
    Obtém dados climáticos do banco de dados
    """
    logger.info(f"📊 Consultando clima: regiao={regiao}, dias={dias}")
    
    with get_session() as session:
        query = session.query(Clima)
        
        # Filtro por região
        if regiao:
            query = query.filter(Clima.regiao == regiao.upper())
        
        # Últimos N dias
        data_limite = datetime.now() - timedelta(days=dias)
        query = query.filter(Clima.data >= data_limite)
        
        # Ordenar por data
        dados_clima = query.order_by(Clima.data.desc()).all()
        
        # Converter para dict
        resultado = []
        for clima in dados_clima:
            resultado.append({
                "data": clima.data.strftime("%Y-%m-%d"),
                "regiao": clima.regiao,
                "temp_min": clima.temp_min,
                "temp_max": clima.temp_max,
                "chuva_mm": clima.chuva_mm,
                "ndvi": clima.ndvi,
                "fonte": clima.fonte
            })
        
        logger.info(f"✅ {len(resultado)} registros climáticos encontrados")
        return resultado

def calcular_media_climatica(regiao: str, dias: int = 30) -> Dict:
    """
    Calcula médias climáticas para uma região
    """
    logger.info(f"📈 Calculando médias climáticas: {regiao}")
    
    dados = obter_dados_clima(regiao, dias)
    
    if not dados:
        return {"erro": "Dados insuficientes para calcular médias"}
    
    # Calcular médias
    temp_min_media = sum(d['temp_min'] for d in dados) / len(dados)
    temp_max_media = sum(d['temp_max'] for d in dados) / len(dados)
    chuva_total = sum(d['chuva_mm'] for d in dados)
    ndvi_medio = sum(d['ndvi'] for d in dados) / len(dados)
    
    # Classificar condições
    def classificar_chuva(total_mm):
        if total_mm < 50:
            return "seca"
        elif total_mm < 150:
            return "normal"
        else:
            return "chuvosa"
    
    def classificar_ndvi(ndvi):
        if ndvi < 0.4:
            return "baixo"
        elif ndvi < 0.7:
            return "normal"
        else:
            return "alto"
    
    resultado = {
        "regiao": regiao,
        "periodo_dias": dias,
        "temp_min_media": round(temp_min_media, 1),
        "temp_max_media": round(temp_max_media, 1),
        "chuva_total": round(chuva_total, 1),
        "ndvi_medio": round(ndvi_medio, 3),
        "classificacao_chuva": classificar_chuva(chuva_total),
        "classificacao_ndvi": classificar_ndvi(ndvi_medio),
        "total_registros": len(dados)
    }
    
    logger.info(f"✅ Médias calculadas para {regiao}")
    return resultado

def identificar_alertas_climaticos(regiao: str = None) -> List[Dict]:
    """
    Identifica alertas climáticos baseados nos dados recentes
    """
    logger.info(f"🚨 Identificando alertas climáticos: {regiao}")
    
    alertas = []
    regioes_verificar = [regiao] if regiao else REGIOES_CLIMA
    
    for reg in regioes_verificar:
        dados = obter_dados_clima(reg, 7)  # Últimos 7 dias
        
        if not dados:
            continue
        
        # Verificar condições extremas
        for dado in dados:
            # Alerta de temperatura extrema
            if dado['temp_max'] > 40:
                alertas.append({
                    "tipo": "temperatura_alta",
                    "regiao": reg,
                    "data": dado['data'],
                    "valor": dado['temp_max'],
                    "mensagem": f"Temperatura máxima de {dado['temp_max']}°C"
                })
            
            # Alerta de chuva excessiva
            if dado['chuva_mm'] > 50:
                alertas.append({
                    "tipo": "chuva_excessiva",
                    "regiao": reg,
                    "data": dado['data'],
                    "valor": dado['chuva_mm'],
                    "mensagem": f"Chuva excessiva: {dado['chuva_mm']}mm"
                })
            
            # Alerta de NDVI baixo (estresse vegetal)
            if dado['ndvi'] < 0.4:
                alertas.append({
                    "tipo": "ndvi_baixo",
                    "regiao": reg,
                    "data": dado['data'],
                    "valor": dado['ndvi'],
                    "mensagem": f"NDVI baixo: {dado['ndvi']} (estresse vegetal)"
                })
    
    logger.info(f"✅ {len(alertas)} alertas climáticos identificados")
    return alertas

# Função para integração com scheduler
def job_ingestao_clima():
    """
    Job para execução agendada da ingestão climática
    """
    logger.info("⏰ Executando job agendado climático...")
    resultado = executar_ingestao_clima()
    
    if resultado["status"] == "sucesso":
        logger.info(f"✅ Job climático concluído: {resultado['registros_salvos']} registros")
        
        # Verificar alertas após ingestão
        alertas = identificar_alertas_climaticos()
        if alertas:
            logger.warning(f"🚨 {len(alertas)} alertas climáticos detectados!")
    else:
        logger.error(f"❌ Job climático falhou: {resultado['erro']}")
    
    return resultado

if __name__ == "__main__":
    # Executar ingestão manual
    resultado = executar_ingestao_clima()
    print(f"📊 Resultado: {resultado}")
    
    # Exemplo de consulta
    dados_mt = obter_dados_clima("MT", 7)
    print(f"🌤️ Dados MT: {len(dados_mt)} registros")
    
    # Exemplo de média
    media_mt = calcular_media_climatica("MT")
    print(f"📈 Média MT: {media_mt}")
    
    # Exemplo de alertas
    alertas = identificar_alertas_climaticos("MT")
    print(f"🚨 Alertas MT: {len(alertas)} alertas") 