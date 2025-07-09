# test_price_locator.py
# 📦 SPR 1.1 – Testes para Módulo Price Locator

import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock
from typing import Dict, List

from app.precificacao.price_locator import (
    PriceLocator, LocationData, ProductPrice, FreightData, PriceChoice
)


class TestPriceLocator:
    """Testes para classe PriceLocator"""
    
    def setup_method(self):
        """Setup executado antes de cada teste"""
        self.price_locator = PriceLocator()
    
    def test_inicializacao(self):
        """Testa inicialização da classe"""
        assert self.price_locator.debug_mode is True
        assert self.price_locator.cache_duration == 3600
        assert isinstance(self.price_locator.price_cache, dict)
        assert isinstance(self.price_locator.freight_cache, dict)
        assert len(self.price_locator.commodities) == 5
        assert len(self.price_locator.regions) == 8
    
    def test_get_supported_products(self):
        """Testa obtenção de produtos suportados"""
        products = self.price_locator.get_supported_products()
        
        assert isinstance(products, list)
        assert len(products) == 5
        assert 'soja' in products
        assert 'milho' in products
        assert 'cafe' in products
        assert 'algodao' in products
        assert 'boi' in products
    
    def test_get_supported_regions(self):
        """Testa obtenção de regiões suportadas"""
        regions = self.price_locator.get_supported_regions()
        
        assert isinstance(regions, dict)
        assert len(regions) == 8
        assert 'MT' in regions
        assert 'SP' in regions
        assert 'RS' in regions
        
        # Verificar estrutura de região
        mt_region = regions['MT']
        assert 'name' in mt_region
        assert 'lat' in mt_region
        assert 'lon' in mt_region
        assert mt_region['name'] == 'Mato Grosso'
    
    def test_clear_cache(self):
        """Testa limpeza do cache"""
        # Adicionar dados ao cache
        self.price_locator.price_cache['test'] = ('data', 'value')
        self.price_locator.freight_cache['test'] = ('data', 'value')
        
        # Limpar cache
        self.price_locator.clear_cache()
        
        # Verificar se foi limpo
        assert len(self.price_locator.price_cache) == 0
        assert len(self.price_locator.freight_cache) == 0
    
    def test_process_location_cep(self):
        """Testa processamento de localização por CEP"""
        location_data = self.price_locator._process_location("01310-100")
        
        assert isinstance(location_data, LocationData)
        assert location_data.cep == "01310100"
        assert location_data.latitude == -23.5505
        assert location_data.longitude == -46.6333
        assert location_data.city == "São Paulo"
        assert location_data.state == "SP"
    
    def test_process_location_coordinates(self):
        """Testa processamento de localização por coordenadas"""
        location_data = self.price_locator._process_location("-15.6014, -56.0979")
        
        assert isinstance(location_data, LocationData)
        assert location_data.latitude == -15.6014
        assert location_data.longitude == -56.0979
        assert location_data.city == "Coordenada"
        assert location_data.state == "BR"
    
    def test_process_location_invalid(self):
        """Testa processamento de localização inválida"""
        with pytest.raises(ValueError, match="Localização inválida"):
            self.price_locator._process_location("invalid_location")
    
    def test_collect_cepea_prices(self):
        """Testa coleta de preços do CEPEA"""
        prices = self.price_locator._collect_cepea_prices("soja")
        
        assert isinstance(prices, list)
        assert len(prices) == 8  # Uma para cada região
        
        # Verificar estrutura do primeiro preço
        price = prices[0]
        assert isinstance(price, ProductPrice)
        assert price.product_id == "soja"
        assert price.region in self.price_locator.regions
        assert price.price > 0
        assert 0 <= price.quality_score <= 1
        assert price.source == "CEPEA"
        assert price.availability is True
    
    def test_collect_conab_prices(self):
        """Testa coleta de preços da CONAB"""
        prices = self.price_locator._collect_conab_prices("milho")
        
        assert isinstance(prices, list)
        assert len(prices) == 4  # Regiões específicas da CONAB
        
        # Verificar estrutura
        price = prices[0]
        assert isinstance(price, ProductPrice)
        assert price.product_id == "milho"
        assert price.region in ['MT', 'GO', 'RS', 'PR']
        assert price.source == "CONAB"
    
    def test_collect_mercadolivre_prices(self):
        """Testa coleta de preços do Mercado Livre"""
        prices = self.price_locator._collect_mercadolivre_prices("cafe")
        
        assert isinstance(prices, list)
        assert len(prices) == 4  # Regiões específicas do ML
        
        # Verificar estrutura
        price = prices[0]
        assert isinstance(price, ProductPrice)
        assert price.product_id == "cafe"
        assert price.region in ['SP', 'MG', 'PR', 'RS']
        assert price.source == "MercadoLivre"
    
    def test_collect_regional_prices(self):
        """Testa coleta de preços regionais consolidada"""
        prices = self.price_locator._collect_regional_prices("soja", volume=1000)
        
        assert isinstance(prices, list)
        assert len(prices) > 0
        
        # Verificar que temos preços de múltiplas fontes
        sources = {price.source for price in prices}
        assert len(sources) >= 2  # Pelo menos 2 fontes diferentes
        
        # Verificar que todos são da mesma commodity
        for price in prices:
            assert price.product_id == "soja"
    
    def test_calculate_freight(self):
        """Testa cálculo de frete"""
        # Localização de destino
        destination = LocationData(
            latitude=-23.5505,
            longitude=-46.6333,
            city="São Paulo",
            state="SP"
        )
        
        freight_data = self.price_locator._calculate_freight("MT", destination, 1000)
        
        assert isinstance(freight_data, FreightData)
        assert freight_data.distance_km > 0
        assert freight_data.freight_cost > 0
        assert freight_data.delivery_days > 0
        assert freight_data.transport_method == "Rodoviário"
        assert freight_data.origin.region == "MT"
        assert freight_data.destination == destination
    
    def test_calculate_freight_invalid_region(self):
        """Testa cálculo de frete com região inválida"""
        destination = LocationData(latitude=-23.5505, longitude=-46.6333)
        
        # Deve retornar valores padrão em caso de erro
        freight_data = self.price_locator._calculate_freight("INVALID", destination, 1000)
        
        assert isinstance(freight_data, FreightData)
        assert freight_data.distance_km == 500.0
        assert freight_data.freight_cost == 50.0
        assert freight_data.delivery_days == 3
        assert freight_data.transport_method == "Estimado"
    
    def test_calculate_composite_score(self):
        """Testa cálculo de score composto"""
        # Dados de teste
        price_data = ProductPrice(
            product_id="soja",
            region="MT",
            city="Cuiabá",
            price=145.0,
            quality_score=0.85,
            supplier="Test",
            availability=True,
            last_updated=datetime.now(),
            source="Test"
        )
        
        freight_info = FreightData(
            origin=LocationData(),
            destination=LocationData(),
            distance_km=1000.0,
            freight_cost=50.0,
            delivery_days=3,
            transport_method="Rodoviário"
        )
        
        weights = {'price': 0.5, 'time': 0.3, 'quality': 0.2}
        
        score = self.price_locator._calculate_composite_score(
            price_data, freight_info, weights
        )
        
        assert isinstance(score, float)
        assert 0 <= score <= 1
    
    def test_choice_to_dict(self):
        """Testa conversão de PriceChoice para dicionário"""
        choice = PriceChoice(
            origin_region="MT–Cuiabá",
            product_price=145.0,
            freight_cost=50.0,
            delivery_days=3,
            quality_score=0.85,
            composite_score=0.312,
            total_cost=195.0,
            supplier="Test",
            confidence=0.85
        )
        
        result = self.price_locator._choice_to_dict(choice)
        
        assert isinstance(result, dict)
        assert result['origin_region'] == "MT–Cuiabá"
        assert result['product_price'] == 145.0
        assert result['freight_cost'] == 50.0
        assert result['delivery_days'] == 3
        assert result['quality_score'] == 0.85
        assert result['composite_score'] == 0.312
        assert result['total_cost'] == 195.0
        assert result['supplier'] == "Test"
        assert result['confidence'] == 0.85
    
    def test_find_best_prices_success(self):
        """Testa busca de melhores preços com sucesso"""
        result = self.price_locator.find_best_prices(
            buyer_location="01310-100",
            product_id="soja",
            volume=1000,
            weights={'price': 0.5, 'time': 0.3, 'quality': 0.2}
        )
        
        assert isinstance(result, dict)
        assert 'error' not in result
        assert 'product_id' in result
        assert 'buyer_location' in result
        assert 'search_timestamp' in result
        assert 'weights_used' in result
        assert 'choices' in result
        assert 'best_choice' in result
        assert 'total_options_found' in result
        
        # Verificar estrutura das escolhas
        assert isinstance(result['choices'], list)
        assert len(result['choices']) > 0
        
        # Verificar melhor escolha
        best_choice = result['best_choice']
        assert isinstance(best_choice, dict)
        assert 'origin_region' in best_choice
        assert 'product_price' in best_choice
        assert 'freight_cost' in best_choice
        assert 'total_cost' in best_choice
    
    def test_find_best_prices_invalid_weights(self):
        """Testa busca com pesos inválidos"""
        result = self.price_locator.find_best_prices(
            buyer_location="01310-100",
            product_id="soja",
            weights={'price': 0.5, 'time': 0.3, 'quality': 0.3}  # Soma 1.1
        )
        
        assert 'error' in result
        assert 'Pesos devem somar 1.0' in result['error']
    
    def test_find_best_prices_invalid_location(self):
        """Testa busca com localização inválida"""
        result = self.price_locator.find_best_prices(
            buyer_location="invalid",
            product_id="soja"
        )
        
        assert 'error' in result
        assert 'Localização inválida' in result['error']
    
    def test_find_best_prices_default_weights(self):
        """Testa busca com pesos padrão"""
        result = self.price_locator.find_best_prices(
            buyer_location="01310-100",
            product_id="soja"
        )
        
        assert 'error' not in result
        assert result['weights_used'] == {'price': 0.5, 'time': 0.3, 'quality': 0.2}
    
    def test_find_best_prices_sorted_by_score(self):
        """Testa se resultados são ordenados por score"""
        result = self.price_locator.find_best_prices(
            buyer_location="01310-100",
            product_id="soja"
        )
        
        assert 'error' not in result
        choices = result['choices']
        
        # Verificar ordenação por composite_score
        for i in range(len(choices) - 1):
            assert choices[i]['composite_score'] <= choices[i + 1]['composite_score']
    
    def test_find_best_prices_multiple_commodities(self):
        """Testa busca para diferentes commodities"""
        commodities = ['soja', 'milho', 'cafe', 'algodao', 'boi']
        
        for commodity in commodities:
            result = self.price_locator.find_best_prices(
                buyer_location="01310-100",
                product_id=commodity
            )
            
            assert 'error' not in result
            assert result['product_id'] == commodity
            assert len(result['choices']) > 0
    
    def test_cache_functionality(self):
        """Testa funcionalidade do cache"""
        # Primeira busca - deve popular cache
        result1 = self.price_locator._collect_regional_prices("soja", 1000)
        assert len(self.price_locator.price_cache) == 1
        
        # Segunda busca - deve usar cache
        result2 = self.price_locator._collect_regional_prices("soja", 1000)
        assert result1 == result2
        
        # Limpar cache
        self.price_locator.clear_cache()
        assert len(self.price_locator.price_cache) == 0
    
    def test_volume_impact_on_freight(self):
        """Testa impacto do volume no cálculo de frete"""
        destination = LocationData(latitude=-23.5505, longitude=-46.6333)
        
        # Frete com volume pequeno
        freight_small = self.price_locator._calculate_freight("MT", destination, 100)
        
        # Frete com volume grande
        freight_large = self.price_locator._calculate_freight("MT", destination, 10000)
        
        # Volume maior deve resultar em frete maior
        assert freight_large.freight_cost > freight_small.freight_cost
    
    def test_distance_impact_on_freight(self):
        """Testa impacto da distância no frete"""
        volume = 1000
        
        # Destino próximo (SP)
        dest_close = LocationData(latitude=-23.5505, longitude=-46.6333)
        freight_close = self.price_locator._calculate_freight("SP", dest_close, volume)
        
        # Destino distante (MT)
        dest_far = LocationData(latitude=-23.5505, longitude=-46.6333)
        freight_far = self.price_locator._calculate_freight("MT", dest_far, volume)
        
        # Distância maior deve resultar em frete maior
        assert freight_far.freight_cost > freight_close.freight_cost
        assert freight_far.delivery_days >= freight_close.delivery_days
    
    def test_quality_score_range(self):
        """Testa se quality_score está no range correto"""
        prices = self.price_locator._collect_regional_prices("soja", 1000)
        
        for price in prices:
            assert 0 <= price.quality_score <= 1
    
    def test_price_variation_by_region(self):
        """Testa variação de preços por região"""
        prices = self.price_locator._collect_regional_prices("soja", 1000)
        
        # Agrupar por região
        prices_by_region = {}
        for price in prices:
            if price.region not in prices_by_region:
                prices_by_region[price.region] = []
            prices_by_region[price.region].append(price.price)
        
        # Deve haver variação entre regiões
        all_prices = [price.price for price in prices]
        assert len(set(all_prices)) > 1  # Preços diferentes
    
    def test_error_handling_in_price_collection(self):
        """Testa tratamento de erros na coleta de preços"""
        # Simular erro na coleta
        with patch.object(self.price_locator, '_collect_cepea_prices', side_effect=Exception("API Error")):
            # Deve retornar lista vazia em caso de erro
            prices = self.price_locator._collect_cepea_prices("soja")
            assert isinstance(prices, list)
            assert len(prices) == 0
    
    def test_comprehensive_integration(self):
        """Teste de integração completo"""
        # Buscar preços para diferentes cenários
        scenarios = [
            {"location": "01310-100", "product": "soja", "volume": 1000},
            {"location": "-15.6014, -56.0979", "product": "milho", "volume": 500},
            {"location": "90010-000", "product": "cafe", "volume": None},
        ]
        
        for scenario in scenarios:
            result = self.price_locator.find_best_prices(
                buyer_location=scenario["location"],
                product_id=scenario["product"],
                volume=scenario["volume"]
            )
            
            # Verificar resultado bem-sucedido
            assert 'error' not in result
            assert result['product_id'] == scenario["product"]
            assert len(result['choices']) > 0
            assert result['best_choice'] is not None
            
            # Verificar estrutura completa
            best_choice = result['best_choice']
            required_fields = [
                'origin_region', 'product_price', 'freight_cost',
                'delivery_days', 'quality_score', 'composite_score',
                'total_cost', 'supplier', 'confidence'
            ]
            
            for field in required_fields:
                assert field in best_choice
                assert best_choice[field] is not None 