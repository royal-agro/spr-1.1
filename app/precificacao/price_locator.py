# price_locator.py
# 📦 SPR 1.1 – Módulo Price Locator (Localizador de Preços Ótimos)
# Encontra os melhores locais para comprar produtos no Brasil

import logging
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from geopy.distance import geodesic
import json
import time
from urllib.parse import quote
import re

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LocationData:
    """Dados de localização processados"""
    cep: Optional[str] = None
    latitude: float = 0.0
    longitude: float = 0.0
    city: str = ""
    state: str = ""
    region: str = ""

@dataclass
class ProductPrice:
    """Dados de preço de produto por região"""
    product_id: str
    region: str
    city: str
    price: float
    quality_score: float
    supplier: str
    availability: bool
    last_updated: datetime
    source: str

@dataclass
class FreightData:
    """Dados de frete calculados"""
    origin: LocationData
    destination: LocationData
    distance_km: float
    freight_cost: float
    delivery_days: int
    transport_method: str

@dataclass
class PriceChoice:
    """Opção de compra otimizada"""
    origin_region: str
    product_price: float
    freight_cost: float
    delivery_days: int
    quality_score: float
    composite_score: float
    total_cost: float
    supplier: str
    confidence: float

class PriceLocator:
    """
    Localizador de Preços Ótimos para produtos agrícolas no Brasil.
    
    Funcionalidades:
    - Coleta preços regionais de múltiplas fontes
    - Calcula custos de frete
    - Estima tempo de entrega
    - Avalia qualidade do produto
    - Gera score composto otimizado
    """
    
    def __init__(self):
        """Inicializa o Price Locator"""
        self.debug_mode = True  # Para desenvolvimento
        self.cache_duration = 3600  # 1 hora em segundos
        self.price_cache = {}
        self.freight_cache = {}
        
        # Configurações de APIs
        self.apis_config = {
            'cepea': {'url': 'https://cepea.esalq.usp.br/api/v1/prices', 'timeout': 30},
            'conab': {'url': 'https://consultaweb.conab.gov.br/api/v1/precos', 'timeout': 30},
            'mercadolivre': {'url': 'https://api.mercadolibre.com/sites/MLB/search', 'timeout': 30},
            'correios': {'url': 'https://viacep.com.br/ws', 'timeout': 15}
        }
        
        # Commodities suportadas [[memory:2670784]]
        self.commodities = ['soja', 'milho', 'cafe', 'algodao', 'boi']
        
        # Regiões principais do Brasil
        self.regions = {
            'MT': {'name': 'Mato Grosso', 'lat': -15.6014, 'lon': -56.0979},
            'GO': {'name': 'Goiás', 'lat': -16.6869, 'lon': -49.2648},
            'RS': {'name': 'Rio Grande do Sul', 'lat': -30.0346, 'lon': -51.2177},
            'PR': {'name': 'Paraná', 'lat': -24.8932, 'lon': -51.4248},
            'MG': {'name': 'Minas Gerais', 'lat': -19.8157, 'lon': -43.9542},
            'SP': {'name': 'São Paulo', 'lat': -23.5505, 'lon': -46.6333},
            'BA': {'name': 'Bahia', 'lat': -12.9714, 'lon': -38.5014},
            'MS': {'name': 'Mato Grosso do Sul', 'lat': -20.4697, 'lon': -54.6201}
        }
        
    def find_best_prices(
        self,
        buyer_location: str,
        product_id: str,
        volume: Optional[float] = None,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Encontra os melhores preços para um produto.
        
        Args:
            buyer_location: CEP ou coordenadas (lat,lon)
            product_id: ID ou nome do produto
            volume: Volume desejado (opcional)
            weights: Pesos para price, time, quality (devem somar 1.0)
            
        Returns:
            Dict com melhores opções de compra
        """
        try:
            logger.info(f"🔍 Buscando melhores preços para {product_id}")
            
            # Validar e processar inputs
            buyer_loc = self._process_location(buyer_location)
            weights = weights or {'price': 0.5, 'time': 0.3, 'quality': 0.2}
            
            # Validar pesos
            if abs(sum(weights.values()) - 1.0) > 0.01:
                raise ValueError("Pesos devem somar 1.0")
            
            # Coletar preços regionais
            regional_prices = self._collect_regional_prices(product_id, volume)
            
            if not regional_prices:
                return {'error': 'Nenhum preço encontrado para o produto'}
            
            # Calcular opções de compra
            choices = []
            
            for price_data in regional_prices:
                try:
                    # Calcular frete
                    freight_info = self._calculate_freight(
                        origin_region=price_data.region,
                        destination=buyer_loc,
                        volume=volume or 1.0
                    )
                    
                    # Calcular score composto
                    composite_score = self._calculate_composite_score(
                        price_data, freight_info, weights
                    )
                    
                    choice = PriceChoice(
                        origin_region=f"{price_data.region}–{price_data.city}",
                        product_price=price_data.price,
                        freight_cost=freight_info.freight_cost,
                        delivery_days=freight_info.delivery_days,
                        quality_score=price_data.quality_score,
                        composite_score=composite_score,
                        total_cost=price_data.price + freight_info.freight_cost,
                        supplier=price_data.supplier,
                        confidence=0.85  # Baseado na qualidade dos dados
                    )
                    
                    choices.append(choice)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao processar região {price_data.region}: {e}")
                    continue
            
            if not choices:
                return {'error': 'Não foi possível calcular opções de compra'}
            
            # Ordenar por score composto (menor é melhor)
            choices.sort(key=lambda x: x.composite_score)
            
            # Preparar resposta
            response = {
                'product_id': product_id,
                'buyer_location': f"{buyer_loc.city}, {buyer_loc.state}",
                'search_timestamp': datetime.now().isoformat(),
                'weights_used': weights,
                'choices': [self._choice_to_dict(choice) for choice in choices[:10]],
                'best_choice': self._choice_to_dict(choices[0]) if choices else None,
                'total_options_found': len(choices)
            }
            
            logger.info(f"✅ Encontradas {len(choices)} opções para {product_id}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Erro na busca de preços: {e}")
            return {'error': str(e)}
    
    def _process_location(self, location: str) -> LocationData:
        """
        Processa string de localização para dados estruturados.
        
        Args:
            location: CEP ou coordenadas (lat,lon)
            
        Returns:
            LocationData processados
        """
        try:
            # Verificar se é coordenada (lat,lon)
            if ',' in location and not '-' in location.replace('-', ''):
                coords = location.split(',')
                if len(coords) == 2:
                    lat, lon = float(coords[0].strip()), float(coords[1].strip())
                    return LocationData(
                        latitude=lat,
                        longitude=lon,
                        city="Coordenada",
                        state="BR",
                        region="BR"
                    )
            
            # Assumir que é CEP
            cep = re.sub(r'\D', '', location)  # Remover não-dígitos
            
            if len(cep) == 8:
                # Simular consulta de CEP (em produção usar API real)
                return LocationData(
                    cep=cep,
                    latitude=-23.5505,  # São Paulo como default
                    longitude=-46.6333,
                    city="São Paulo",
                    state="SP",
                    region="SP"
                )
            
            raise ValueError(f"Localização inválida: {location}")
            
        except Exception as e:
            logger.error(f"❌ Erro ao processar localização: {e}")
            raise
    
    def _collect_regional_prices(self, product_id: str, volume: Optional[float]) -> List[ProductPrice]:
        """
        Coleta preços regionais de múltiplas fontes.
        
        Args:
            product_id: ID do produto
            volume: Volume desejado
            
        Returns:
            Lista de preços por região
        """
        try:
            logger.info(f"📊 Coletando preços regionais para {product_id}")
            
            # Verificar cache
            cache_key = f"{product_id}_{volume}"
            if cache_key in self.price_cache:
                cache_time, data = self.price_cache[cache_key]
                if time.time() - cache_time < self.cache_duration:
                    logger.info("📋 Usando dados do cache")
                    return data
            
            prices = []
            
            # Coletar de CEPEA (simulado)
            cepea_prices = self._collect_cepea_prices(product_id)
            prices.extend(cepea_prices)
            
            # Coletar de CONAB (simulado)
            conab_prices = self._collect_conab_prices(product_id)
            prices.extend(conab_prices)
            
            # Coletar de Mercado Livre (simulado)
            ml_prices = self._collect_mercadolivre_prices(product_id)
            prices.extend(ml_prices)
            
            # Atualizar cache
            self.price_cache[cache_key] = (time.time(), prices)
            
            logger.info(f"✅ Coletados {len(prices)} preços regionais")
            return prices
            
        except Exception as e:
            logger.error(f"❌ Erro na coleta de preços: {e}")
            return []
    
    def _collect_cepea_prices(self, product_id: str) -> List[ProductPrice]:
        """Coleta preços do CEPEA (simulado para desenvolvimento)"""
        try:
            prices = []
            
            # Dados simulados baseados em padrões reais do CEPEA
            base_prices = {
                'soja': 145.0,
                'milho': 65.0,
                'cafe': 890.0,
                'algodao': 4.2,
                'boi': 285.0
            }
            
            base_price = base_prices.get(product_id, 100.0)
            
            for region_code, region_info in self.regions.items():
                # Simular variação regional (-10% a +15%)
                variation = np.random.uniform(-0.10, 0.15)
                regional_price = base_price * (1 + variation)
                
                price = ProductPrice(
                    product_id=product_id,
                    region=region_code,
                    city=region_info['name'],
                    price=round(regional_price, 2),
                    quality_score=np.random.uniform(0.7, 0.95),
                    supplier=f"CEPEA-{region_code}",
                    availability=True,
                    last_updated=datetime.now(),
                    source="CEPEA"
                )
                
                prices.append(price)
            
            return prices
            
        except Exception as e:
            logger.error(f"❌ Erro ao coletar preços CEPEA: {e}")
            return []
    
    def _collect_conab_prices(self, product_id: str) -> List[ProductPrice]:
        """Coleta preços da CONAB (simulado para desenvolvimento)"""
        try:
            prices = []
            
            # Simular alguns preços da CONAB
            conab_regions = ['MT', 'GO', 'RS', 'PR']
            
            base_prices = {
                'soja': 142.0,
                'milho': 63.0,
                'cafe': 885.0,
                'algodao': 4.1,
                'boi': 280.0
            }
            
            base_price = base_prices.get(product_id, 95.0)
            
            for region in conab_regions:
                variation = np.random.uniform(-0.08, 0.12)
                regional_price = base_price * (1 + variation)
                
                price = ProductPrice(
                    product_id=product_id,
                    region=region,
                    city=self.regions[region]['name'],
                    price=round(regional_price, 2),
                    quality_score=np.random.uniform(0.75, 0.98),
                    supplier=f"CONAB-{region}",
                    availability=True,
                    last_updated=datetime.now(),
                    source="CONAB"
                )
                
                prices.append(price)
            
            return prices
            
        except Exception as e:
            logger.error(f"❌ Erro ao coletar preços CONAB: {e}")
            return []
    
    def _collect_mercadolivre_prices(self, product_id: str) -> List[ProductPrice]:
        """Coleta preços do Mercado Livre (simulado para desenvolvimento)"""
        try:
            prices = []
            
            # Simular alguns preços do Mercado Livre
            ml_regions = ['SP', 'MG', 'PR', 'RS']
            
            base_prices = {
                'soja': 150.0,
                'milho': 68.0,
                'cafe': 900.0,
                'algodao': 4.3,
                'boi': 290.0
            }
            
            base_price = base_prices.get(product_id, 105.0)
            
            for region in ml_regions:
                variation = np.random.uniform(-0.05, 0.20)
                regional_price = base_price * (1 + variation)
                
                price = ProductPrice(
                    product_id=product_id,
                    region=region,
                    city=self.regions[region]['name'],
                    price=round(regional_price, 2),
                    quality_score=np.random.uniform(0.6, 0.9),
                    supplier=f"ML-{region}",
                    availability=True,
                    last_updated=datetime.now(),
                    source="MercadoLivre"
                )
                
                prices.append(price)
            
            return prices
            
        except Exception as e:
            logger.error(f"❌ Erro ao coletar preços Mercado Livre: {e}")
            return []
    
    def _calculate_freight(self, origin_region: str, destination: LocationData, volume: float) -> FreightData:
        """
        Calcula custo de frete entre origem e destino.
        
        Args:
            origin_region: Código da região de origem
            destination: Dados de localização do destino
            volume: Volume do produto
            
        Returns:
            FreightData com custos calculados
        """
        try:
            # Obter coordenadas da origem
            origin_info = self.regions.get(origin_region)
            if not origin_info:
                raise ValueError(f"Região {origin_region} não encontrada")
            
            origin_loc = LocationData(
                latitude=origin_info['lat'],
                longitude=origin_info['lon'],
                city=origin_info['name'],
                state=origin_region,
                region=origin_region
            )
            
            # Calcular distância usando fórmula de Haversine
            distance = geodesic(
                (origin_loc.latitude, origin_loc.longitude),
                (destination.latitude, destination.longitude)
            ).kilometers
            
            # Calcular custo de frete: Diesel × Km × Peso
            diesel_price = 6.50  # R$/litro (simulado)
            consumption = 0.35   # litros/km (simulado)
            weight_factor = max(volume / 1000, 0.1)  # Fator de peso
            
            freight_cost = distance * diesel_price * consumption * weight_factor
            
            # Calcular tempo de entrega (dias úteis)
            delivery_days = max(1, int(distance / 500))  # ~500km por dia
            
            return FreightData(
                origin=origin_loc,
                destination=destination,
                distance_km=round(distance, 2),
                freight_cost=round(freight_cost, 2),
                delivery_days=delivery_days,
                transport_method="Rodoviário"
            )
            
        except Exception as e:
            logger.error(f"❌ Erro no cálculo de frete: {e}")
            # Retornar valores padrão em caso de erro
            return FreightData(
                origin=LocationData(),
                destination=destination,
                distance_km=500.0,
                freight_cost=50.0,
                delivery_days=3,
                transport_method="Estimado"
            )
    
    def _calculate_composite_score(
        self,
        price_data: ProductPrice,
        freight_info: FreightData,
        weights: Dict[str, float]
    ) -> float:
        """
        Calcula score composto para otimização.
        
        Args:
            price_data: Dados de preço
            freight_info: Dados de frete
            weights: Pesos para cada métrica
            
        Returns:
            Score composto (menor é melhor)
        """
        try:
            # Normalizar métricas (z-score simplificado)
            total_cost = price_data.price + freight_info.freight_cost
            
            # Normalizar para escala 0-1
            price_norm = min(total_cost / 200.0, 1.0)  # Assumir max R$ 200
            time_norm = min(freight_info.delivery_days / 10.0, 1.0)  # Assumir max 10 dias
            quality_norm = 1.0 - price_data.quality_score  # Inverter (menor é melhor)
            
            # Calcular score composto
            composite_score = (
                weights['price'] * price_norm +
                weights['time'] * time_norm +
                weights['quality'] * quality_norm
            )
            
            return round(composite_score, 4)
            
        except Exception as e:
            logger.error(f"❌ Erro no cálculo do score: {e}")
            return 1.0  # Score alto em caso de erro
    
    def _choice_to_dict(self, choice: PriceChoice) -> Dict:
        """Converte PriceChoice para dicionário"""
        return {
            'origin_region': choice.origin_region,
            'product_price': choice.product_price,
            'freight_cost': choice.freight_cost,
            'delivery_days': choice.delivery_days,
            'quality_score': choice.quality_score,
            'composite_score': choice.composite_score,
            'total_cost': choice.total_cost,
            'supplier': choice.supplier,
            'confidence': choice.confidence
        }
    
    def get_supported_products(self) -> List[str]:
        """Retorna lista de produtos suportados"""
        return self.commodities.copy()
    
    def get_supported_regions(self) -> Dict[str, Dict]:
        """Retorna regiões suportadas"""
        return self.regions.copy()
    
    def clear_cache(self):
        """Limpa cache de preços e fretes"""
        self.price_cache.clear()
        self.freight_cache.clear()
        logger.info("🗑️ Cache limpo") 