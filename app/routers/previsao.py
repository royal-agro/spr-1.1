# routers/previsao.py
# 📦 SPR 1.1 – Rotas API para Previsão de Preços

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import json
import base64
import io

from app.precificacao.previsao_precos import PrevisorDePrecos

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/previsao", tags=["previsao"])

# Modelos Pydantic
class PrevisaoRequest(BaseModel):
    dias_futuros: int = 7
    incluir_grafico: bool = True
    contexto: Optional[dict] = None

class PrevisaoResponse(BaseModel):
    cultura: str
    previsoes: List[dict]
    estatisticas: dict
    periodo_previsao: dict
    timestamp: str
    grafico_base64: Optional[str] = None

class PrevisaoResumo(BaseModel):
    cultura: str
    preco_medio: float
    tendencia: str
    volatilidade: float
    dias_previsao: int
    timestamp: str

# Cache simples para modelos treinados
_cache_modelos = {}

def _obter_modelo_treinado(cultura: str) -> PrevisorDePrecos:
    """
    Obtém modelo treinado do cache ou cria novo.
    
    Args:
        cultura: Nome da cultura (soja, milho, etc.)
        
    Returns:
        Instância do PrevisorDePrecos treinado
    """
    if cultura not in _cache_modelos:
        logger.info(f"Criando novo modelo para {cultura}")
        
        # Criar e treinar modelo
        previsor = PrevisorDePrecos(commodity=cultura)
        previsor.carregar_dados()
        metricas = previsor.treinar_modelo()
        
        # Armazenar no cache
        _cache_modelos[cultura] = {
            'modelo': previsor,
            'metricas': metricas,
            'timestamp': datetime.now()
        }
        
        logger.info(f"Modelo {cultura} treinado - R²: {metricas['r2']:.3f}")
    
    return _cache_modelos[cultura]['modelo']

@router.post("/previsao/{cultura}", response_model=PrevisaoResponse)
async def criar_previsao(
    cultura: str,
    request: PrevisaoRequest,
    format: Optional[str] = Query(None, description="Formato de resposta: json ou pdf")
):
    """
    Cria previsão de preços para uma cultura específica.
    
    Args:
        cultura: Nome da cultura (soja, milho, boi, etc.)
        request: Dados da requisição
        format: Formato de resposta (json ou pdf)
        
    Returns:
        Previsão de preços ou PDF em base64
    """
    try:
        # Validar cultura
        culturas_suportadas = ['soja', 'milho', 'boi', 'cafe', 'algodao', 'trigo']
        if cultura.lower() not in culturas_suportadas:
            raise HTTPException(
                status_code=400,
                detail=f"Cultura '{cultura}' não suportada. Culturas disponíveis: {culturas_suportadas}"
            )
        
        # Validar dias futuros
        if request.dias_futuros < 1 or request.dias_futuros > 365:
            raise HTTPException(
                status_code=400,
                detail="dias_futuros deve estar entre 1 e 365"
            )
        
        # Obter modelo treinado
        previsor = _obter_modelo_treinado(cultura.lower())
        
        # Gerar datas futuras
        datas_futuras = [
            datetime.now() + timedelta(days=i) 
            for i in range(1, request.dias_futuros + 1)
        ]
        
        # Fazer previsões
        previsoes = previsor.prever(datas_futuras, contexto=request.contexto)
        
        # Gerar relatório
        relatorio = previsor.gerar_relatorio(previsoes, incluir_grafico=request.incluir_grafico)
        
        # Log da operação
        logger.info(json.dumps({
            "evento": "previsao_criada",
            "cultura": cultura,
            "dias_futuros": request.dias_futuros,
            "preco_medio": relatorio['estatisticas']['preco_medio'],
            "tendencia": relatorio['estatisticas']['tendencia'],
            "timestamp": datetime.now().isoformat()
        }))
        
        # Retornar PDF se solicitado
        if format == "pdf":
            pdf_base64 = _gerar_pdf_previsao(relatorio)
            return JSONResponse({
                "cultura": cultura,
                "pdf_base64": pdf_base64,
                "timestamp": relatorio['timestamp']
            })
        
        # Retornar JSON padrão
        return PrevisaoResponse(
            cultura=cultura,
            previsoes=relatorio['previsoes'],
            estatisticas=relatorio['estatisticas'],
            periodo_previsao=relatorio['periodo_previsao'],
            timestamp=relatorio['timestamp'],
            grafico_base64=relatorio.get('grafico_base64')
        )
        
    except Exception as e:
        logger.error(f"Erro ao criar previsão para {cultura}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/previsao/{cultura}/resumo", response_model=PrevisaoResumo)
async def obter_resumo_previsao(
    cultura: str,
    dias_futuros: int = Query(7, description="Número de dias para previsão")
):
    """
    Obtém resumo rápido da previsão sem gráficos.
    
    Args:
        cultura: Nome da cultura
        dias_futuros: Número de dias para previsão
        
    Returns:
        Resumo da previsão
    """
    try:
        # Obter modelo treinado
        previsor = _obter_modelo_treinado(cultura.lower())
        
        # Gerar datas futuras
        datas_futuras = [
            datetime.now() + timedelta(days=i) 
            for i in range(1, dias_futuros + 1)
        ]
        
        # Fazer previsões
        previsoes = previsor.prever(datas_futuras)
        
        # Gerar relatório sem gráfico
        relatorio = previsor.gerar_relatorio(previsoes, incluir_grafico=False)
        
        return PrevisaoResumo(
            cultura=cultura,
            preco_medio=relatorio['estatisticas']['preco_medio'],
            tendencia=relatorio['estatisticas']['tendencia'],
            volatilidade=relatorio['estatisticas']['volatilidade'],
            dias_previsao=dias_futuros,
            timestamp=relatorio['timestamp']
        )
        
    except Exception as e:
        logger.error(f"Erro ao obter resumo para {cultura}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/previsao/{cultura}/metricas")
async def obter_metricas_modelo(cultura: str):
    """
    Obtém métricas do modelo treinado.
    
    Args:
        cultura: Nome da cultura
        
    Returns:
        Métricas do modelo
    """
    try:
        if cultura.lower() not in _cache_modelos:
            # Treinar modelo se não existe
            _obter_modelo_treinado(cultura.lower())
        
        cache_info = _cache_modelos[cultura.lower()]
        
        return {
            "cultura": cultura,
            "metricas": cache_info['metricas'],
            "timestamp_treinamento": cache_info['timestamp'].isoformat(),
            "modelo_ativo": True
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter métricas para {cultura}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.post("/previsao/{cultura}/retreinar")
async def retreinar_modelo(cultura: str):
    """
    Força o retreinamento do modelo para uma cultura.
    
    Args:
        cultura: Nome da cultura
        
    Returns:
        Novas métricas do modelo
    """
    try:
        logger.info(f"Retreinando modelo para {cultura}")
        
        # Remover do cache
        if cultura.lower() in _cache_modelos:
            del _cache_modelos[cultura.lower()]
        
        # Treinar novo modelo
        previsor = _obter_modelo_treinado(cultura.lower())
        cache_info = _cache_modelos[cultura.lower()]
        
        logger.info(f"Modelo {cultura} retreinado com sucesso")
        
        return {
            "cultura": cultura,
            "metricas": cache_info['metricas'],
            "timestamp_treinamento": cache_info['timestamp'].isoformat(),
            "status": "retreinado"
        }
        
    except Exception as e:
        logger.error(f"Erro ao retreinar modelo para {cultura}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@router.get("/previsao/culturas")
async def listar_culturas():
    """
    Lista culturas suportadas pelo sistema.
    
    Returns:
        Lista de culturas disponíveis
    """
    culturas = [
        {
            "nome": "soja",
            "descricao": "Soja em grão",
            "unidade": "R$/saca",
            "ativo": "soja" in _cache_modelos
        },
        {
            "nome": "milho",
            "descricao": "Milho em grão",
            "unidade": "R$/saca",
            "ativo": "milho" in _cache_modelos
        },
        {
            "nome": "boi",
            "descricao": "Boi gordo",
            "unidade": "R$/arroba",
            "ativo": "boi" in _cache_modelos
        },
        {
            "nome": "cafe",
            "descricao": "Café arábica",
            "unidade": "R$/saca",
            "ativo": "cafe" in _cache_modelos
        },
        {
            "nome": "algodao",
            "descricao": "Algodão em pluma",
            "unidade": "R$/arroba",
            "ativo": "algodao" in _cache_modelos
        },
        {
            "nome": "trigo",
            "descricao": "Trigo em grão",
            "unidade": "R$/saca",
            "ativo": "trigo" in _cache_modelos
        }
    ]
    
    return {
        "culturas": culturas,
        "total": len(culturas),
        "modelos_ativos": len(_cache_modelos)
    }

def _gerar_pdf_previsao(relatorio: dict) -> str:
    """
    Gera PDF da previsão em formato base64.
    
    Args:
        relatorio: Relatório da previsão
        
    Returns:
        PDF em base64
    """
    try:
        # Placeholder para geração de PDF
        # TODO: Implementar com reportlab ou fpdf
        
        # Por enquanto, retornar o gráfico como "PDF"
        if 'grafico_base64' in relatorio:
            return relatorio['grafico_base64']
        
        # Gerar PDF simples com texto
        pdf_content = f"""
        PREVISÃO DE PREÇOS - {relatorio['commodity'].upper()}
        
        Período: {relatorio['periodo_previsao']['inicio']} a {relatorio['periodo_previsao']['fim']}
        
        Estatísticas:
        - Preço Médio: R$ {relatorio['estatisticas']['preco_medio']}
        - Tendência: {relatorio['estatisticas']['tendencia']}
        - Volatilidade: {relatorio['estatisticas']['volatilidade']}
        
        Gerado em: {relatorio['timestamp']}
        """
        
        # Converter texto para base64 (placeholder)
        return base64.b64encode(pdf_content.encode()).decode()
        
    except Exception as e:
        logger.error(f"Erro ao gerar PDF: {str(e)}")
        return "" 