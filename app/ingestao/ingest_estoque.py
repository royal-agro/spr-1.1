"""
📦 SPR 1.1 - Ingestão de Dados de Estoque
Coleta automatizada de dados de estoque agrícola
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
import random
from app.models.dados_agro import Estoque
from app.database.conn import get_session

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Culturas e tipos de estoque
CULTURAS_ESTOQUE = ["soja", "milho", "cafe", "algodao", "trigo", "arroz"]
TIPOS_ESTOQUE = ["inicial", "final", "consumo", "producao", "exportacao", "importacao"]

def buscar_dados_simulados() -> pd.DataFrame:
    """
    Simula dados de estoque para desenvolvimento (Volume 1)
    Retorna DataFrame com dados de estoque por cultura
    """
    logger.info("📦 Simulando dados de estoque...")
    
    # Volumes base por cultura (mil toneladas)
    volumes_base = {
        "soja": {
            "inicial": 2500,
            "producao": 125000,
            "consumo": 45000,
            "exportacao": 75000,
            "final": 7500
        },
        "milho": {
            "inicial": 1800,
            "producao": 82000,
            "consumo": 55000,
            "exportacao": 25000,
            "final": 3800
        },
        "cafe": {
            "inicial": 450,
            "producao": 3200,
            "consumo": 1200,
            "exportacao": 1800,
            "final": 650
        },
        "algodao": {
            "inicial": 320,
            "producao": 2800,
            "consumo": 800,
            "exportacao": 1900,
            "final": 420
        },
        "trigo": {
            "inicial": 280,
            "producao": 5500,
            "consumo": 4800,
            "importacao": 6000,
            "final": 980
        },
        "arroz": {
            "inicial": 180,
            "producao": 10500,
            "consumo": 8500,
            "exportacao": 1200,
            "final": 980
        }
    }
    
    dados_simulados = []
    data_atual = datetime.now()
    
    # Gerar dados mensais para últimos 12 meses
    for meses_atras in range(12):
        data_estoque = data_atual - timedelta(days=meses_atras * 30)
        
        for cultura in CULTURAS_ESTOQUE:
            volumes_cultura = volumes_base[cultura]
            
            for tipo, volume_base in volumes_cultura.items():
                # Adicionar variação sazonal
                mes = data_estoque.month
                
                # Safra (março-julho) vs Entressafra (agosto-fevereiro)
                if tipo == "producao":
                    if mes in [3, 4, 5, 6, 7]:  # Safra
                        fator_sazonal = 1.3
                    else:  # Entressafra
                        fator_sazonal = 0.7
                else:
                    fator_sazonal = 1.0
                
                # Adicionar variação aleatória
                variacao = random.uniform(-0.15, 0.15)  # ±15%
                volume_final = volume_base * fator_sazonal * (1 + variacao)
                
                dados_simulados.append({
                    "cultura": cultura,
                    "data": data_estoque.strftime("%Y-%m-%d"),
                    "tipo": tipo,
                    "valor": round(volume_final, 1),
                    "fonte": "CONAB"
                })
    
    df = pd.DataFrame(dados_simulados)
    logger.info(f"✅ {len(df)} registros de estoque simulados")
    return df

def normalizar_dados_estoque(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza dados de estoque para formato padrão
    """
    logger.info("🔄 Normalizando dados de estoque...")
    
    # Converter data para datetime
    df['data'] = pd.to_datetime(df['data'])
    
    # Padronizar nomes
    df['cultura'] = df['cultura'].str.lower().str.strip()
    df['tipo'] = df['tipo'].str.lower().str.strip()
    
    # Validar valores
    df = df[df['valor'] >= 0]  # Remover valores negativos
    
    # Validar tipos
    df = df[df['tipo'].isin(TIPOS_ESTOQUE)]
    
    # Ordenar por data
    df = df.sort_values(['cultura', 'tipo', 'data'])
    
    logger.info(f"✅ {len(df)} registros de estoque normalizados")
    return df

def salvar_dados_estoque(df: pd.DataFrame) -> int:
    """
    Salva dados de estoque no banco de dados
    """
    logger.info("💾 Salvando dados de estoque no banco...")
    
    registros_salvos = 0
    
    with get_session() as session:
        for _, row in df.iterrows():
            # Verificar se já existe registro para mesma cultura/tipo/data
            existing = session.query(Estoque).filter(
                Estoque.cultura == row['cultura'],
                Estoque.tipo == row['tipo'],
                Estoque.data == row['data']
            ).first()
            
            if not existing:
                estoque = Estoque(
                    cultura=row['cultura'],
                    data=row['data'],
                    tipo=row['tipo'],
                    valor=row['valor'],
                    fonte=row['fonte']
                )
                session.add(estoque)
                registros_salvos += 1
    
    logger.info(f"✅ {registros_salvos} novos registros de estoque salvos")
    return registros_salvos

def executar_ingestao_estoque() -> Dict:
    """
    Executa processo completo de ingestão de estoque
    """
    logger.info("🚀 Iniciando ingestão de estoque...")
    
    try:
        # 1. Buscar dados (simulados por enquanto)
        df_raw = buscar_dados_simulados()
        
        # 2. Normalizar dados
        df_normalized = normalizar_dados_estoque(df_raw)
        
        # 3. Salvar no banco
        registros_salvos = salvar_dados_estoque(df_normalized)
        
        resultado = {
            "status": "sucesso",
            "registros_processados": len(df_raw),
            "registros_salvos": registros_salvos,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Ingestão de estoque concluída: {resultado}")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro na ingestão de estoque: {e}")
        return {
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

def obter_dados_estoque(cultura: str = None, tipo: str = None, meses: int = 6) -> List[Dict]:
    """
    Obtém dados de estoque do banco de dados
    """
    logger.info(f"📊 Consultando estoque: cultura={cultura}, tipo={tipo}, meses={meses}")
    
    with get_session() as session:
        query = session.query(Estoque)
        
        # Filtros opcionais
        if cultura:
            query = query.filter(Estoque.cultura == cultura.lower())
        if tipo:
            query = query.filter(Estoque.tipo == tipo.lower())
        
        # Últimos N meses
        data_limite = datetime.now() - timedelta(days=meses * 30)
        query = query.filter(Estoque.data >= data_limite)
        
        # Ordenar por data
        dados_estoque = query.order_by(Estoque.data.desc()).all()
        
        # Converter para dict
        resultado = []
        for estoque in dados_estoque:
            resultado.append({
                "cultura": estoque.cultura,
                "data": estoque.data.strftime("%Y-%m-%d"),
                "tipo": estoque.tipo,
                "valor": estoque.valor,
                "fonte": estoque.fonte
            })
        
        logger.info(f"✅ {len(resultado)} registros de estoque encontrados")
        return resultado

def calcular_balanco_estoque(cultura: str, meses: int = 12) -> Dict:
    """
    Calcula balanço de estoque para uma cultura
    """
    logger.info(f"📈 Calculando balanço de estoque: {cultura}")
    
    dados = obter_dados_estoque(cultura, None, meses)
    
    if not dados:
        return {"erro": "Dados insuficientes para calcular balanço"}
    
    # Agrupar por tipo
    por_tipo = {}
    for item in dados:
        tipo = item['tipo']
        if tipo not in por_tipo:
            por_tipo[tipo] = []
        por_tipo[tipo].append(item['valor'])
    
    # Calcular médias por tipo
    medias = {}
    for tipo, valores in por_tipo.items():
        medias[tipo] = sum(valores) / len(valores)
    
    # Calcular indicadores
    producao_media = medias.get('producao', 0)
    consumo_medio = medias.get('consumo', 0)
    exportacao_media = medias.get('exportacao', 0)
    importacao_media = medias.get('importacao', 0)
    
    # Balanço de suprimento
    suprimento = producao_media + importacao_media
    demanda = consumo_medio + exportacao_media
    saldo = suprimento - demanda
    
    # Classificar situação
    def classificar_situacao(saldo, producao):
        if producao == 0:
            return "indefinido"
        
        ratio = saldo / producao
        if ratio > 0.1:
            return "superavit"
        elif ratio < -0.1:
            return "deficit"
        else:
            return "equilibrio"
    
    situacao = classificar_situacao(saldo, producao_media)
    
    resultado = {
        "cultura": cultura,
        "periodo_meses": meses,
        "producao_media": round(producao_media, 1),
        "consumo_medio": round(consumo_medio, 1),
        "exportacao_media": round(exportacao_media, 1),
        "importacao_media": round(importacao_media, 1),
        "suprimento_total": round(suprimento, 1),
        "demanda_total": round(demanda, 1),
        "saldo": round(saldo, 1),
        "situacao": situacao,
        "autossuficiencia": round((producao_media / consumo_medio) * 100, 1) if consumo_medio > 0 else 0,
        "total_registros": len(dados)
    }
    
    logger.info(f"✅ Balanço calculado para {cultura}: {situacao}")
    return resultado

def analisar_tendencia_estoque(cultura: str, tipo: str, meses: int = 12) -> Dict:
    """
    Analisa tendência de estoque para cultura e tipo específicos
    """
    logger.info(f"📊 Analisando tendência: {cultura} - {tipo}")
    
    dados = obter_dados_estoque(cultura, tipo, meses)
    
    if len(dados) < 3:
        return {"erro": "Dados insuficientes para análise de tendência"}
    
    # Ordenar por data
    dados_ordenados = sorted(dados, key=lambda x: x['data'])
    
    # Calcular tendência linear simples
    valores = [d['valor'] for d in dados_ordenados]
    n = len(valores)
    
    # Média móvel de 3 períodos
    medias_moveis = []
    for i in range(2, n):
        media = sum(valores[i-2:i+1]) / 3
        medias_moveis.append(media)
    
    # Calcular tendência
    if len(medias_moveis) >= 2:
        tendencia_valor = medias_moveis[-1] - medias_moveis[0]
        tendencia_pct = (tendencia_valor / medias_moveis[0]) * 100 if medias_moveis[0] > 0 else 0
    else:
        tendencia_valor = 0
        tendencia_pct = 0
    
    # Classificar tendência
    def classificar_tendencia(pct):
        if pct > 5:
            return "crescente"
        elif pct < -5:
            return "decrescente"
        else:
            return "estavel"
    
    tendencia_classe = classificar_tendencia(tendencia_pct)
    
    # Volatilidade
    if len(valores) > 1:
        media_valores = sum(valores) / len(valores)
        variancia = sum((x - media_valores) ** 2 for x in valores) / len(valores)
        volatilidade = (variancia ** 0.5) / media_valores * 100 if media_valores > 0 else 0
    else:
        volatilidade = 0
    
    resultado = {
        "cultura": cultura,
        "tipo": tipo,
        "periodo_meses": meses,
        "valor_inicial": valores[0],
        "valor_final": valores[-1],
        "valor_medio": round(sum(valores) / len(valores), 1),
        "tendencia_valor": round(tendencia_valor, 1),
        "tendencia_pct": round(tendencia_pct, 1),
        "tendencia_classe": tendencia_classe,
        "volatilidade_pct": round(volatilidade, 1),
        "total_registros": len(dados)
    }
    
    logger.info(f"✅ Tendência analisada: {tendencia_classe} ({tendencia_pct:.1f}%)")
    return resultado

def identificar_alertas_estoque() -> List[Dict]:
    """
    Identifica alertas de estoque baseados em níveis críticos
    """
    logger.info("🚨 Identificando alertas de estoque...")
    
    alertas = []
    
    for cultura in CULTURAS_ESTOQUE:
        # Verificar estoque final baixo
        dados_finais = obter_dados_estoque(cultura, "final", 3)
        if dados_finais:
            estoque_atual = dados_finais[0]['valor']
            
            # Limites críticos por cultura (mil toneladas)
            limites_criticos = {
                "soja": 5000,
                "milho": 3000,
                "cafe": 400,
                "algodao": 200,
                "trigo": 500,
                "arroz": 800
            }
            
            limite = limites_criticos.get(cultura, 1000)
            
            if estoque_atual < limite:
                alertas.append({
                    "tipo": "estoque_baixo",
                    "cultura": cultura,
                    "valor_atual": estoque_atual,
                    "limite_critico": limite,
                    "severidade": "alta",
                    "mensagem": f"Estoque final de {cultura} abaixo do crítico: {estoque_atual} mil ton"
                })
        
        # Verificar queda na produção
        tendencia_prod = analisar_tendencia_estoque(cultura, "producao", 6)
        if "erro" not in tendencia_prod and tendencia_prod['tendencia_pct'] < -15:
            alertas.append({
                "tipo": "producao_queda",
                "cultura": cultura,
                "tendencia_pct": tendencia_prod['tendencia_pct'],
                "severidade": "media",
                "mensagem": f"Queda na produção de {cultura}: {tendencia_prod['tendencia_pct']:.1f}%"
            })
        
        # Verificar aumento no consumo
        tendencia_cons = analisar_tendencia_estoque(cultura, "consumo", 6)
        if "erro" not in tendencia_cons and tendencia_cons['tendencia_pct'] > 20:
            alertas.append({
                "tipo": "consumo_alto",
                "cultura": cultura,
                "tendencia_pct": tendencia_cons['tendencia_pct'],
                "severidade": "media",
                "mensagem": f"Aumento no consumo de {cultura}: {tendencia_cons['tendencia_pct']:.1f}%"
            })
    
    logger.info(f"✅ {len(alertas)} alertas de estoque identificados")
    return alertas

# Função para integração com scheduler
def job_ingestao_estoque():
    """
    Job para execução agendada da ingestão de estoque
    """
    logger.info("⏰ Executando job agendado de estoque...")
    resultado = executar_ingestao_estoque()
    
    if resultado["status"] == "sucesso":
        logger.info(f"✅ Job de estoque concluído: {resultado['registros_salvos']} registros")
        
        # Verificar alertas após ingestão
        alertas = identificar_alertas_estoque()
        if alertas:
            logger.warning(f"🚨 {len(alertas)} alertas de estoque detectados!")
    else:
        logger.error(f"❌ Job de estoque falhou: {resultado['erro']}")
    
    return resultado

if __name__ == "__main__":
    # Executar ingestão manual
    resultado = executar_ingestao_estoque()
    print(f"📊 Resultado: {resultado}")
    
    # Exemplo de consulta
    dados_soja = obter_dados_estoque("soja", "final", 6)
    print(f"🌱 Estoque soja: {len(dados_soja)} registros")
    
    # Exemplo de balanço
    balanco = calcular_balanco_estoque("soja")
    print(f"📈 Balanço soja: {balanco}")
    
    # Exemplo de tendência
    tendencia = analisar_tendencia_estoque("soja", "producao")
    print(f"📊 Tendência produção soja: {tendencia}")
    
    # Exemplo de alertas
    alertas = identificar_alertas_estoque()
    print(f"🚨 Alertas: {len(alertas)} alertas") 