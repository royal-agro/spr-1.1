"""
Módulo de Mercado Interno e Externo
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ModuloMercadoInternoExterno:
    def __init__(self):
        self.precos_internos = {}
        self.precos_externos = {}
        self.comparacoes = []
    
    def obter_precos_internos(self, commodity: str) -> Dict:
        """Obtém preços do mercado interno"""
        try:
            resultado = {
                'commodity': commodity,
                'preco_medio': 145.50,
                'variacao_diaria': 1.2,
                'volume': 50000,
                'mercado': 'interno',
                'timestamp': datetime.now().isoformat()
            }
            
            self.precos_internos[commodity] = resultado
            logger.info(f"🏠 Preços internos: {commodity} - R$ {resultado['preco_medio']}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao obter preços internos: {e}")
            return {'erro': str(e)}
    
    def obter_precos_externos(self, commodity: str) -> Dict:
        """Obtém preços do mercado externo"""
        try:
            resultado = {
                'commodity': commodity,
                'preco_medio': 152.75,
                'variacao_diaria': -0.8,
                'volume': 75000,
                'mercado': 'externo',
                'timestamp': datetime.now().isoformat()
            }
            
            self.precos_externos[commodity] = resultado
            logger.info(f"🌍 Preços externos: {commodity} - USD {resultado['preco_medio']}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao obter preços externos: {e}")
            return {'erro': str(e)}
    
    def comparar_mercados(self, commodity: str) -> Dict:
        """Compara preços entre mercados interno e externo"""
        try:
            interno = self.obter_precos_internos(commodity)
            externo = self.obter_precos_externos(commodity)
            
            if 'erro' in interno or 'erro' in externo:
                return {'erro': 'Erro ao obter dados dos mercados'}
            
            diferenca = externo['preco_medio'] - interno['preco_medio']
            percentual = (diferenca / interno['preco_medio']) * 100
            
            comparacao = {
                'commodity': commodity,
                'preco_interno': interno['preco_medio'],
                'preco_externo': externo['preco_medio'],
                'diferenca': diferenca,
                'diferenca_percentual': percentual,
                'recomendacao': 'exportar' if diferenca > 0 else 'mercado_interno',
                'timestamp': datetime.now().isoformat()
            }
            
            self.comparacoes.append(comparacao)
            logger.info(f"⚖️  Comparação: {commodity} - diferença: {percentual:.1f}%")
            return comparacao
        except Exception as e:
            logger.error(f"❌ Erro na comparação: {e}")
            return {'erro': str(e)}
    
    def analisar_oportunidades(self, commodity: str) -> Dict:
        """Analisa oportunidades de arbitragem"""
        try:
            comparacao = self.comparar_mercados(commodity)
            if 'erro' in comparacao:
                return comparacao
            
            oportunidade = {
                'commodity': commodity,
                'tipo_oportunidade': 'arbitragem' if abs(comparacao['diferenca_percentual']) > 5 else 'normal',
                'potencial_lucro': max(0, comparacao['diferenca']),
                'risco': 'baixo' if abs(comparacao['diferenca_percentual']) < 10 else 'alto',
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"💡 Oportunidade analisada: {commodity}")
            return oportunidade
        except Exception as e:
            logger.error(f"❌ Erro na análise: {e}")
            return {'erro': str(e)} 