"""
📦 SPR 1.1 - Ingestão de Análise de Sentimento
Coleta automatizada de sentimento de mercado agrícola
"""

import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict
import random
from app.models.dados_agro import Sentimento
from app.database.conn import get_session

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fontes de notícias e categorias
FONTES_NOTICIAS = ["AgroNews", "RuralBR", "CafePoint", "EconomiaRural", "AgronegocioWeb", "SojaNews"]
CATEGORIAS = ["producao", "mercado", "clima", "economia", "politica", "tecnologia"]

def buscar_dados_simulados() -> pd.DataFrame:
    """
    Simula dados de sentimento para desenvolvimento (Volume 1)
    Retorna DataFrame com análise de sentimento de notícias
    """
    logger.info("📰 Simulando dados de sentimento...")
    
    # Manchetes simuladas por categoria
    manchetes_base = {
        "producao": [
            "Safra de soja 2024/25 deve superar expectativas no Centro-Oeste",
            "Plantio de milho avança em ritmo acelerado no Paraná",
            "Produção de café em Minas Gerais bate recorde histórico",
            "Algodão do Cerrado apresenta qualidade superior",
            "Colheita de trigo no Sul do país supera projeções",
            "Pecuária bovina registra crescimento no rebanho"
        ],
        "mercado": [
            "Preços do milho em alta devido à demanda internacional",
            "Exportações de soja batem novo recorde mensal",
            "Mercado futuro de café apresenta volatilidade",
            "Demanda chinesa por commodities brasileiras cresce",
            "Preços do boi gordo se mantêm firmes nos mercados",
            "Algodão brasileiro ganha competitividade no exterior"
        ],
        "clima": [
            "Clima favorável beneficia plantio de café em Minas Gerais",
            "Chuvas irregulares preocupam produtores de soja",
            "Estiagem afeta desenvolvimento do milho safrinha",
            "Frente fria favorece culturas de inverno no Sul",
            "El Niño pode impactar safra de grãos em 2024",
            "Temperaturas elevadas aceleram maturação do algodão"
        ],
        "economia": [
            "Incertezas cambiais afetam exportações de commodities",
            "Juros altos pressionam financiamento rural",
            "Inflação dos alimentos preocupa consumidores",
            "Dólar forte beneficia exportadores de grãos",
            "Crédito rural tem expansão aprovada pelo governo",
            "PIB do agronegócio cresce acima da média nacional"
        ],
        "politica": [
            "Nova política agrícola beneficia pequenos produtores",
            "Congresso aprova marco regulatório para defensivos",
            "Ministério anuncia plano de sustentabilidade rural",
            "Acordo comercial com UE pode afetar agronegócio",
            "Licenciamento ambiental gera debates no setor",
            "Reforma tributária impacta custos de produção"
        ],
        "tecnologia": [
            "Agricultura de precisão aumenta produtividade",
            "Inteligência artificial revoluciona gestão rural",
            "Drones facilitam monitoramento de lavouras",
            "Biotecnologia desenvolve sementes resistentes",
            "Sensores IoT otimizam irrigação nas fazendas",
            "Blockchain garante rastreabilidade de alimentos"
        ]
    }
    
    dados_simulados = []
    data_atual = datetime.now()
    
    # Gerar dados para últimos 30 dias
    for dias_atras in range(30):
        data_noticia = data_atual - timedelta(days=dias_atras)
        
        # Gerar 3-8 notícias por dia
        num_noticias = random.randint(3, 8)
        
        for _ in range(num_noticias):
            categoria = random.choice(CATEGORIAS)
            fonte = random.choice(FONTES_NOTICIAS)
            manchete = random.choice(manchetes_base[categoria])
            
            # Gerar score de sentimento baseado na categoria
            if categoria == "producao":
                # Notícias de produção tendem a ser positivas
                score = random.uniform(0.3, 0.9)
            elif categoria == "mercado":
                # Mercado tem sentimento misto
                score = random.uniform(-0.3, 0.8)
            elif categoria == "clima":
                # Clima pode ser positivo ou negativo
                score = random.uniform(-0.7, 0.7)
            elif categoria == "economia":
                # Economia tende a ser mais negativa
                score = random.uniform(-0.6, 0.4)
            elif categoria == "politica":
                # Política é geralmente neutra a negativa
                score = random.uniform(-0.5, 0.3)
            else:  # tecnologia
                # Tecnologia é geralmente positiva
                score = random.uniform(0.2, 0.8)
            
            # Adicionar variação temporal
            if data_noticia.month in [3, 4, 5]:  # Época de safra - mais positivo
                score *= 1.2
            elif data_noticia.month in [9, 10, 11]:  # Entressafra - mais negativo
                score *= 0.8
            
            # Normalizar score entre -1 e 1
            score = max(-1.0, min(1.0, score))
            
            dados_simulados.append({
                "data": data_noticia.strftime("%Y-%m-%d %H:%M:%S"),
                "manchete": manchete,
                "score": round(score, 3),
                "fonte": fonte,
                "categoria": categoria
            })
    
    df = pd.DataFrame(dados_simulados)
    logger.info(f"✅ {len(df)} registros de sentimento simulados")
    return df

def normalizar_dados_sentimento(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliza dados de sentimento para formato padrão
    """
    logger.info("🔄 Normalizando dados de sentimento...")
    
    # Converter data para datetime
    df['data'] = pd.to_datetime(df['data'])
    
    # Limpar manchetes
    df['manchete'] = df['manchete'].str.strip()
    df = df[df['manchete'].str.len() > 10]  # Remover manchetes muito curtas
    
    # Validar scores
    df = df[(df['score'] >= -1.0) & (df['score'] <= 1.0)]
    
    # Padronizar categorias
    df['categoria'] = df['categoria'].str.lower().str.strip()
    df = df[df['categoria'].isin(CATEGORIAS)]
    
    # Remover duplicatas
    df = df.drop_duplicates(subset=['manchete', 'data', 'fonte'])
    
    # Ordenar por data
    df = df.sort_values('data')
    
    logger.info(f"✅ {len(df)} registros de sentimento normalizados")
    return df

def salvar_dados_sentimento(df: pd.DataFrame) -> int:
    """
    Salva dados de sentimento no banco de dados
    """
    logger.info("💾 Salvando dados de sentimento no banco...")
    
    registros_salvos = 0
    
    with get_session() as session:
        for _, row in df.iterrows():
            # Verificar se já existe registro para mesma manchete/data/fonte
            existing = session.query(Sentimento).filter(
                Sentimento.manchete == row['manchete'],
                Sentimento.data == row['data'],
                Sentimento.fonte == row['fonte']
            ).first()
            
            if not existing:
                sentimento = Sentimento(
                    data=row['data'],
                    manchete=row['manchete'],
                    score=row['score'],
                    fonte=row['fonte'],
                    categoria=row['categoria']
                )
                session.add(sentimento)
                registros_salvos += 1
    
    logger.info(f"✅ {registros_salvos} novos registros de sentimento salvos")
    return registros_salvos

def executar_ingestao_sentimento() -> Dict:
    """
    Executa processo completo de ingestão de sentimento
    """
    logger.info("🚀 Iniciando ingestão de sentimento...")
    
    try:
        # 1. Buscar dados (simulados por enquanto)
        df_raw = buscar_dados_simulados()
        
        # 2. Normalizar dados
        df_normalized = normalizar_dados_sentimento(df_raw)
        
        # 3. Salvar no banco
        registros_salvos = salvar_dados_sentimento(df_normalized)
        
        resultado = {
            "status": "sucesso",
            "registros_processados": len(df_raw),
            "registros_salvos": registros_salvos,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Ingestão de sentimento concluída: {resultado}")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro na ingestão de sentimento: {e}")
        return {
            "status": "erro",
            "erro": str(e),
            "timestamp": datetime.now().isoformat()
        }

def obter_dados_sentimento(categoria: str = None, fonte: str = None, dias: int = 7) -> List[Dict]:
    """
    Obtém dados de sentimento do banco de dados
    """
    logger.info(f"📊 Consultando sentimento: categoria={categoria}, fonte={fonte}, dias={dias}")
    
    with get_session() as session:
        query = session.query(Sentimento)
        
        # Filtros opcionais
        if categoria:
            query = query.filter(Sentimento.categoria == categoria.lower())
        if fonte:
            query = query.filter(Sentimento.fonte == fonte)
        
        # Últimos N dias
        data_limite = datetime.now() - timedelta(days=dias)
        query = query.filter(Sentimento.data >= data_limite)
        
        # Ordenar por data
        dados_sentimento = query.order_by(Sentimento.data.desc()).all()
        
        # Converter para dict
        resultado = []
        for sentimento in dados_sentimento:
            resultado.append({
                "data": sentimento.data.strftime("%Y-%m-%d %H:%M:%S"),
                "manchete": sentimento.manchete,
                "score": sentimento.score,
                "fonte": sentimento.fonte,
                "categoria": sentimento.categoria
            })
        
        logger.info(f"✅ {len(resultado)} registros de sentimento encontrados")
        return resultado

def calcular_indice_sentimento(categoria: str = None, dias: int = 7) -> Dict:
    """
    Calcula índice de sentimento geral ou por categoria
    """
    logger.info(f"📈 Calculando índice de sentimento: categoria={categoria}, dias={dias}")
    
    dados = obter_dados_sentimento(categoria, None, dias)
    
    if not dados:
        return {"erro": "Dados insuficientes para calcular índice"}
    
    # Calcular estatísticas
    scores = [d['score'] for d in dados]
    
    indice_medio = sum(scores) / len(scores)
    
    # Classificar sentimento
    def classificar_sentimento(score):
        if score > 0.3:
            return "positivo"
        elif score < -0.3:
            return "negativo"
        else:
            return "neutro"
    
    classificacao = classificar_sentimento(indice_medio)
    
    # Contar por classificação
    positivos = len([s for s in scores if s > 0.3])
    negativos = len([s for s in scores if s < -0.3])
    neutros = len(scores) - positivos - negativos
    
    # Calcular tendência (últimos 3 dias vs primeiros 3 dias)
    if len(dados) >= 6:
        # Ordenar por data
        dados_ordenados = sorted(dados, key=lambda x: x['data'])
        
        primeiros_3 = [d['score'] for d in dados_ordenados[:3]]
        ultimos_3 = [d['score'] for d in dados_ordenados[-3:]]
        
        media_inicial = sum(primeiros_3) / len(primeiros_3)
        media_final = sum(ultimos_3) / len(ultimos_3)
        
        tendencia_valor = media_final - media_inicial
        tendencia_classe = "melhorando" if tendencia_valor > 0.1 else "piorando" if tendencia_valor < -0.1 else "estavel"
    else:
        tendencia_valor = 0
        tendencia_classe = "indefinido"
    
    resultado = {
        "categoria": categoria or "geral",
        "periodo_dias": dias,
        "indice_medio": round(indice_medio, 3),
        "classificacao": classificacao,
        "tendencia_valor": round(tendencia_valor, 3),
        "tendencia_classe": tendencia_classe,
        "distribuicao": {
            "positivos": positivos,
            "negativos": negativos,
            "neutros": neutros,
            "total": len(dados)
        },
        "percentuais": {
            "positivos": round((positivos / len(dados)) * 100, 1),
            "negativos": round((negativos / len(dados)) * 100, 1),
            "neutros": round((neutros / len(dados)) * 100, 1)
        }
    }
    
    logger.info(f"✅ Índice calculado: {classificacao} ({indice_medio:.3f})")
    return resultado

def analisar_sentimento_por_fonte(dias: int = 7) -> Dict:
    """
    Analisa sentimento por fonte de notícias
    """
    logger.info(f"📊 Analisando sentimento por fonte: {dias} dias")
    
    resultado = {}
    
    for fonte in FONTES_NOTICIAS:
        dados = obter_dados_sentimento(None, fonte, dias)
        
        if dados:
            scores = [d['score'] for d in dados]
            media = sum(scores) / len(scores)
            
            resultado[fonte] = {
                "total_noticias": len(dados),
                "sentimento_medio": round(media, 3),
                "classificacao": "positivo" if media > 0.3 else "negativo" if media < -0.3 else "neutro"
            }
    
    # Ordenar por sentimento médio
    resultado_ordenado = dict(sorted(resultado.items(), key=lambda x: x[1]['sentimento_medio'], reverse=True))
    
    logger.info(f"✅ Análise por fonte concluída: {len(resultado_ordenado)} fontes")
    return resultado_ordenado

def identificar_alertas_sentimento() -> List[Dict]:
    """
    Identifica alertas baseados em mudanças bruscas de sentimento
    """
    logger.info("🚨 Identificando alertas de sentimento...")
    
    alertas = []
    
    # Verificar cada categoria
    for categoria in CATEGORIAS:
        # Comparar últimos 3 dias com 3 dias anteriores
        dados_recentes = obter_dados_sentimento(categoria, None, 3)
        dados_anteriores = obter_dados_sentimento(categoria, None, 6)
        
        if len(dados_recentes) >= 3 and len(dados_anteriores) >= 6:
            # Calcular médias
            scores_recentes = [d['score'] for d in dados_recentes]
            scores_anteriores = [d['score'] for d in dados_anteriores[3:]]  # Pegar apenas os 3 anteriores
            
            media_recente = sum(scores_recentes) / len(scores_recentes)
            media_anterior = sum(scores_anteriores) / len(scores_anteriores)
            
            variacao = media_recente - media_anterior
            
            # Alerta de queda brusca
            if variacao < -0.4:
                alertas.append({
                    "tipo": "sentimento_negativo",
                    "categoria": categoria,
                    "variacao": round(variacao, 3),
                    "severidade": "alta",
                    "mensagem": f"Sentimento de {categoria} deteriorou significativamente"
                })
            
            # Alerta de melhora brusca
            elif variacao > 0.4:
                alertas.append({
                    "tipo": "sentimento_positivo",
                    "categoria": categoria,
                    "variacao": round(variacao, 3),
                    "severidade": "media",
                    "mensagem": f"Sentimento de {categoria} melhorou significativamente"
                })
    
    # Verificar sentimento geral muito negativo
    indice_geral = calcular_indice_sentimento(None, 3)
    if "erro" not in indice_geral and indice_geral['indice_medio'] < -0.5:
        alertas.append({
            "tipo": "sentimento_geral_negativo",
            "categoria": "geral",
            "indice": indice_geral['indice_medio'],
            "severidade": "alta",
            "mensagem": f"Sentimento geral muito negativo: {indice_geral['indice_medio']:.3f}"
        })
    
    logger.info(f"✅ {len(alertas)} alertas de sentimento identificados")
    return alertas

def gerar_resumo_sentimento(dias: int = 7) -> Dict:
    """
    Gera resumo completo do sentimento de mercado
    """
    logger.info(f"📋 Gerando resumo de sentimento: {dias} dias")
    
    # Índice geral
    indice_geral = calcular_indice_sentimento(None, dias)
    
    # Índices por categoria
    indices_categoria = {}
    for categoria in CATEGORIAS:
        indice = calcular_indice_sentimento(categoria, dias)
        if "erro" not in indice:
            indices_categoria[categoria] = indice
    
    # Análise por fonte
    por_fonte = analisar_sentimento_por_fonte(dias)
    
    # Alertas
    alertas = identificar_alertas_sentimento()
    
    # Principais manchetes (mais positivas e negativas)
    dados_todos = obter_dados_sentimento(None, None, dias)
    dados_ordenados = sorted(dados_todos, key=lambda x: x['score'])
    
    manchetes_negativas = dados_ordenados[:3]  # 3 mais negativas
    manchetes_positivas = dados_ordenados[-3:]  # 3 mais positivas
    
    resumo = {
        "periodo": f"Últimos {dias} dias",
        "data_atualizacao": datetime.now().isoformat(),
        "indice_geral": indice_geral,
        "indices_por_categoria": indices_categoria,
        "analise_por_fonte": por_fonte,
        "alertas": alertas,
        "manchetes_destaque": {
            "mais_negativas": manchetes_negativas,
            "mais_positivas": manchetes_positivas
        },
        "total_noticias": len(dados_todos)
    }
    
    logger.info(f"✅ Resumo gerado: {len(dados_todos)} notícias analisadas")
    return resumo

# Função para integração com scheduler
def job_ingestao_sentimento():
    """
    Job para execução agendada da ingestão de sentimento
    """
    logger.info("⏰ Executando job agendado de sentimento...")
    resultado = executar_ingestao_sentimento()
    
    if resultado["status"] == "sucesso":
        logger.info(f"✅ Job de sentimento concluído: {resultado['registros_salvos']} registros")
        
        # Verificar alertas após ingestão
        alertas = identificar_alertas_sentimento()
        if alertas:
            logger.warning(f"🚨 {len(alertas)} alertas de sentimento detectados!")
    else:
        logger.error(f"❌ Job de sentimento falhou: {resultado['erro']}")
    
    return resultado

if __name__ == "__main__":
    # Executar ingestão manual
    resultado = executar_ingestao_sentimento()
    print(f"📊 Resultado: {resultado}")
    
    # Exemplo de consulta
    dados_mercado = obter_dados_sentimento("mercado", None, 7)
    print(f"📈 Sentimento mercado: {len(dados_mercado)} registros")
    
    # Exemplo de índice
    indice = calcular_indice_sentimento("economia")
    print(f"📊 Índice economia: {indice}")
    
    # Exemplo de resumo
    resumo = gerar_resumo_sentimento(7)
    print(f"📋 Resumo: {resumo['total_noticias']} notícias")
    
    # Exemplo de alertas
    alertas = identificar_alertas_sentimento()
    print(f"🚨 Alertas: {len(alertas)} alertas") 