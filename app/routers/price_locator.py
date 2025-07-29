# routers/price_locator.py
# 📦 SPR 1.1 – Router para Price Locator (Localizador de Preços Ótimos)

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, validator
from typing import Dict, List, Optional
from datetime import datetime
import logging

from app.precificacao.price_locator import PriceLocator

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/price-locator", tags=["price-locator"])

# Modelos Pydantic para validação
class PriceSearchRequest(BaseModel):
    """Modelo para requisição de busca de preços"""
    buyer_location: str
    product_id: str
    volume: Optional[float] = None
    weights: Optional[Dict[str, float]] = None
    
    @validator('weights')
    def validate_weights(cls, v):
        if v is not None:
            if not isinstance(v, dict):
                raise ValueError("Weights deve ser um dicionário")
            
            required_keys = {'price', 'time', 'quality'}
            if not required_keys.issubset(v.keys()):
                raise ValueError(f"Weights deve conter as chaves: {required_keys}")
            
            if abs(sum(v.values()) - 1.0) > 0.01:
                raise ValueError("Pesos devem somar 1.0")
        
        return v
    
    @validator('volume')
    def validate_volume(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Volume deve ser positivo")
        return v

class PriceChoiceResponse(BaseModel):
    """Modelo para resposta de opção de preço"""
    origin_region: str
    product_price: float
    freight_cost: float
    delivery_days: int
    quality_score: float
    composite_score: float
    total_cost: float
    supplier: str
    confidence: float

class PriceSearchResponse(BaseModel):
    """Modelo para resposta de busca de preços"""
    product_id: str
    buyer_location: str
    search_timestamp: str
    weights_used: Dict[str, float]
    choices: List[PriceChoiceResponse]
    best_choice: Optional[PriceChoiceResponse]
    total_options_found: int

# Instância global do PriceLocator
price_locator = PriceLocator()

@router.post("/search", response_model=PriceSearchResponse)
async def search_best_prices(request: PriceSearchRequest):
    """
    Busca os melhores preços para um produto em todo o Brasil.
    
    Este endpoint implementa a funcionalidade principal do Price Locator,
    encontrando os locais mais vantajosos para comprar um produto considerando
    preço, frete, tempo de entrega e qualidade.
    
    Args:
        request: Dados da busca (localização, produto, volume, pesos)
        
    Returns:
        Lista ordenada de opções de compra com scores otimizados
        
    Raises:
        HTTPException: Em caso de erro na busca ou validação
    """
    try:
        logger.info(f"🔍 Nova busca: {request.product_id} para {request.buyer_location}")
        
        # Validar produto suportado
        supported_products = price_locator.get_supported_products()
        if request.product_id not in supported_products:
            raise HTTPException(
                status_code=400,
                detail=f"Produto '{request.product_id}' não suportado. "
                       f"Produtos disponíveis: {supported_products}"
            )
        
        # Executar busca
        result = price_locator.find_best_prices(
            buyer_location=request.buyer_location,
            product_id=request.product_id,
            volume=request.volume,
            weights=request.weights
        )
        
        # Verificar se houve erro
        if 'error' in result:
            raise HTTPException(
                status_code=400,
                detail=result['error']
            )
        
        # Converter para modelo de resposta
        response = PriceSearchResponse(**result)
        
        logger.info(f"✅ Busca concluída: {response.total_options_found} opções encontradas")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro na busca de preços: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )

@router.get("/products", response_model=List[str])
async def get_supported_products():
    """
    Retorna lista de produtos suportados pelo Price Locator.
    
    Returns:
        Lista de IDs de produtos suportados
    """
    try:
        products = price_locator.get_supported_products()
        logger.info(f"📋 Produtos suportados: {len(products)}")
        return products
        
    except Exception as e:
        logger.error(f"❌ Erro ao obter produtos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )

@router.get("/regions", response_model=Dict[str, Dict])
async def get_supported_regions():
    """
    Retorna regiões suportadas pelo Price Locator.
    
    Returns:
        Dicionário com regiões e suas informações
    """
    try:
        regions = price_locator.get_supported_regions()
        logger.info(f"🗺️ Regiões suportadas: {len(regions)}")
        return regions
        
    except Exception as e:
        logger.error(f"❌ Erro ao obter regiões: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )

@router.post("/clear-cache")
async def clear_cache():
    """
    Limpa o cache de preços e fretes.
    
    Útil para forçar atualização de dados ou resolver problemas de cache.
    
    Returns:
        Confirmação de limpeza do cache
    """
    try:
        price_locator.clear_cache()
        logger.info("🗑️ Cache limpo via API")
        return {"message": "Cache limpo com sucesso"}
        
    except Exception as e:
        logger.error(f"❌ Erro ao limpar cache: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )

@router.get("/search/{product_id}")
async def quick_search(
    product_id: str,
    buyer_location: str = Query(..., description="CEP ou coordenadas (lat,lon)"),
    volume: Optional[float] = Query(None, description="Volume desejado"),
    price_weight: float = Query(0.5, description="Peso para preço (0.0-1.0)"),
    time_weight: float = Query(0.3, description="Peso para tempo (0.0-1.0)"),
    quality_weight: float = Query(0.2, description="Peso para qualidade (0.0-1.0)")
):
    """
    Busca rápida de preços via parâmetros de query.
    
    Endpoint alternativo para busca simples sem corpo de requisição.
    
    Args:
        product_id: ID do produto
        buyer_location: Localização do comprador
        volume: Volume desejado (opcional)
        price_weight: Peso para preço
        time_weight: Peso para tempo
        quality_weight: Peso para qualidade
        
    Returns:
        Resultado da busca de preços
    """
    try:
        # Validar pesos
        weights = {
            'price': price_weight,
            'time': time_weight,
            'quality': quality_weight
        }
        
        if abs(sum(weights.values()) - 1.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail="Pesos devem somar 1.0"
            )
        
        # Criar requisição
        request = PriceSearchRequest(
            buyer_location=buyer_location,
            product_id=product_id,
            volume=volume,
            weights=weights
        )
        
        # Executar busca
        return await search_best_prices(request)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro na busca rápida: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Verifica saúde do serviço Price Locator.
    
    Returns:
        Status do serviço e informações básicas
    """
    try:
        products_count = len(price_locator.get_supported_products())
        regions_count = len(price_locator.get_supported_regions())
        
        return {
            "status": "healthy",
            "service": "Price Locator",
            "version": "1.1",
            "supported_products": products_count,
            "supported_regions": regions_count,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no health check: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Serviço indisponível: {str(e)}"
        ) 