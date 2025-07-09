"""
Módulo de Clima e NDVI
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class ModuloClimaNdvi:
    def __init__(self):
        self.dados_clima = {}
        self.indices_ndvi = {}
    
    def obter_dados_clima(self, regiao: str) -> Dict:
        """Obtém dados climáticos de uma região"""
        try:
            # Dados mock - pode ser expandido com APIs reais
            dados_mock = {
                'temperatura': 25.5,
                'umidade': 60.0,
                'precipitacao': 10.2,
                'regiao': regiao
            }
            
            from datetime import datetime
            dados_mock['timestamp'] = datetime.now().isoformat()
            
            self.dados_clima[regiao] = dados_mock
            return dados_mock
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter dados climáticos: {e}")
            return {'erro': str(e)}
    
    def calcular_ndvi(self, regiao: str) -> Dict:
        """Calcula o índice NDVI para uma região"""
        try:
            # Cálculo mock do NDVI
            import random
            ndvi_valor = round(random.uniform(0.1, 0.9), 2)
            
            resultado = {
                'regiao': regiao,
                'ndvi': ndvi_valor,
                'classificacao': self._classificar_ndvi(ndvi_valor)
            }
            
            self.indices_ndvi[regiao] = resultado
            return resultado
            
        except Exception as e:
            logger.error(f"❌ Erro no cálculo NDVI: {e}")
            return {'erro': str(e)}
    
    def _classificar_ndvi(self, valor: float) -> str:
        """Classifica o valor NDVI"""
        if valor > 0.7:
            return 'Vegetação densa'
        elif valor > 0.4:
            return 'Vegetação moderada'
        elif valor > 0.2:
            return 'Vegetação esparsa'
        else:
            return 'Solo exposto' 