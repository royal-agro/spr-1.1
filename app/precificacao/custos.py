"""
Módulo de Custos
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ModuloCustos:
    def __init__(self):
        self.custos_cadastrados = {}
        self.historico_custos = []
    
    def calcular_custo_producao(self, commodity: str, hectares: float) -> Dict:
        """Calcula custo de produção"""
        try:
            custo_por_hectare = 2500.0
            custo_total = hectares * custo_por_hectare
            
            resultado = {
                'commodity': commodity,
                'hectares': hectares,
                'custo_por_hectare': custo_por_hectare,
                'custo_total': custo_total,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"💰 Custo calculado: {commodity} - R$ {custo_total:.2f}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro no cálculo: {e}")
            return {'erro': str(e)}
    
    def analisar_rentabilidade(self, commodity: str, preco_venda: float, custo_producao: float) -> Dict:
        """Analisa rentabilidade"""
        try:
            margem = preco_venda - custo_producao
            rentabilidade = (margem / custo_producao) * 100
            
            resultado = {
                'commodity': commodity,
                'preco_venda': preco_venda,
                'custo_producao': custo_producao,
                'margem': margem,
                'rentabilidade_pct': rentabilidade,
                'classificacao': 'lucrativo' if rentabilidade > 0 else 'prejuizo',
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"📊 Rentabilidade: {commodity} - {rentabilidade:.1f}%")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro na análise: {e}")
            return {'erro': str(e)}
    
    def gerar_relatorio(self, periodo: str = "mensal") -> Dict:
        """Gera relatório de custos"""
        try:
            resultado = {
                'periodo': periodo,
                'total_custos': len(self.custos_cadastrados),
                'custo_medio': 2500.0,
                'variacao_periodo': 5.2,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"📋 Relatório gerado: {periodo}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório: {e}")
            return {'erro': str(e)}
    
    def adicionar_custo(self, tipo: str, valor: float, descricao: str) -> bool:
        """Adiciona um custo ao sistema"""
        try:
            custo = {
                'tipo': tipo,
                'valor': valor,
                'descricao': descricao,
                'data': datetime.now().isoformat()
            }
            
            if tipo not in self.custos_cadastrados:
                self.custos_cadastrados[tipo] = []
            
            self.custos_cadastrados[tipo].append(custo)
            logger.info(f"✅ Custo adicionado: {tipo} - R$ {valor}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar custo: {e}")
            return False 