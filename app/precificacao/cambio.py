"""
Módulo de Câmbio
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ModuloCambio:
    def __init__(self):
        self.taxas_atuais = {}
        self.historico_taxas = []
        self.configuracoes = {}
    
    def obter_taxa_cambio(self, moeda_origem: str, moeda_destino: str) -> Dict:
        """Obtém a taxa de câmbio atual"""
        try:
            # Simula obtenção de taxa de câmbio
            taxa = 5.25 if moeda_origem == "USD" and moeda_destino == "BRL" else 1.0
            
            resultado = {
                'moeda_origem': moeda_origem,
                'moeda_destino': moeda_destino,
                'taxa': taxa,
                'timestamp': datetime.now().isoformat(),
                'fonte': 'API_MOCK'
            }
            
            self.taxas_atuais[f"{moeda_origem}_{moeda_destino}"] = resultado
            logger.info(f"💱 Taxa obtida: {moeda_origem}/{moeda_destino} = {taxa}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao obter taxa de câmbio: {e}")
            return {'erro': str(e)}
    
    def converter_moeda(self, valor: float, moeda_origem: str, moeda_destino: str) -> Dict:
        """Converte valor entre moedas"""
        try:
            taxa_info = self.obter_taxa_cambio(moeda_origem, moeda_destino)
            if 'erro' in taxa_info:
                return taxa_info
            
            valor_convertido = valor * taxa_info['taxa']
            
            resultado = {
                'valor_original': valor,
                'moeda_origem': moeda_origem,
                'valor_convertido': valor_convertido,
                'moeda_destino': moeda_destino,
                'taxa_utilizada': taxa_info['taxa'],
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"💰 Conversão: {valor} {moeda_origem} = {valor_convertido:.2f} {moeda_destino}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro na conversão: {e}")
            return {'erro': str(e)}
    
    def historico_cambio(self, moeda_origem: str, moeda_destino: str, dias: int = 30) -> Dict:
        """Obtém histórico de taxas de câmbio"""
        try:
            # Simula histórico de taxas
            historico = []
            for i in range(dias):
                historico.append({
                    'data': datetime.now().isoformat(),
                    'taxa': 5.25 + (i * 0.01),
                    'variacao': 0.01 if i > 0 else 0.0
                })
            
            resultado = {
                'moeda_origem': moeda_origem,
                'moeda_destino': moeda_destino,
                'periodo_dias': dias,
                'historico': historico,
                'taxa_media': 5.40,
                'variacao_total': 0.30,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"📊 Histórico obtido: {moeda_origem}/{moeda_destino} ({dias} dias)")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao obter histórico: {e}")
            return {'erro': str(e)}
    
    def atualizar_taxa(self, moeda_origem: str, moeda_destino: str, nova_taxa: float) -> bool:
        """Atualiza taxa de câmbio manualmente"""
        try:
            chave = f"{moeda_origem}_{moeda_destino}"
            self.taxas_atuais[chave] = {
                'moeda_origem': moeda_origem,
                'moeda_destino': moeda_destino,
                'taxa': nova_taxa,
                'timestamp': datetime.now().isoformat(),
                'fonte': 'MANUAL'
            }
            
            logger.info(f"✅ Taxa atualizada: {moeda_origem}/{moeda_destino} = {nova_taxa}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar taxa: {e}")
            return False
    
    def obter_taxas_multiplas(self, moeda_base: str, moedas_destino: List[str]) -> Dict:
        """Obtém múltiplas taxas de câmbio"""
        try:
            taxas = {}
            for moeda in moedas_destino:
                taxa_info = self.obter_taxa_cambio(moeda_base, moeda)
                if 'erro' not in taxa_info:
                    taxas[moeda] = taxa_info['taxa']
            
            resultado = {
                'moeda_base': moeda_base,
                'taxas': taxas,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"💱 Múltiplas taxas obtidas: {moeda_base} -> {len(taxas)} moedas")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao obter múltiplas taxas: {e}")
            return {'erro': str(e)} 