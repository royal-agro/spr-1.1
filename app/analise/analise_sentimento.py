"""
Módulo de Análise de Sentimento
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class AnaliseSentimento:
    def __init__(self):
        self.modelo_sentimento = None
        self.cache_analises = {}
        self.historico = []
    
    def analisar_texto(self, texto: str) -> Dict:
        """Analisa o sentimento de um texto"""
        try:
            # Simulação de análise de sentimento
            palavras_positivas = ['alta', 'crescimento', 'otimismo', 'melhora', 'positivo']
            palavras_negativas = ['baixa', 'queda', 'pessimismo', 'piora', 'negativo']
            
            texto_lower = texto.lower()
            score_positivo = sum(1 for palavra in palavras_positivas if palavra in texto_lower)
            score_negativo = sum(1 for palavra in palavras_negativas if palavra in texto_lower)
            
            if score_positivo > score_negativo:
                sentimento = 'positivo'
                confianca = min(0.9, 0.5 + (score_positivo - score_negativo) * 0.1)
            elif score_negativo > score_positivo:
                sentimento = 'negativo'
                confianca = min(0.9, 0.5 + (score_negativo - score_positivo) * 0.1)
            else:
                sentimento = 'neutro'
                confianca = 0.5
            
            resultado = {
                'texto': texto,
                'sentimento': sentimento,
                'confianca': confianca,
                'timestamp': datetime.now().isoformat()
            }
            
            self.historico.append(resultado)
            logger.info(f"✅ Análise de sentimento: {sentimento} ({confianca:.2f})")
            return resultado
            
        except Exception as e:
            logger.error(f"❌ Erro na análise de sentimento: {e}")
            return {'erro': str(e)}
    
    def obter_sentimento_mercado(self, commodity: Optional[str] = None) -> Dict:
        """Obtém o sentimento geral do mercado"""
        try:
            # Simula análise de sentimento do mercado
            resultado = {
                'commodity': commodity or 'geral',
                'sentimento_geral': 'neutro',
                'confianca': 0.75,
                'tendencia': 'estável',
                'timestamp': datetime.now().isoformat(),
                'fontes_analisadas': 150
            }
            
            logger.info(f"📊 Sentimento do mercado: {resultado['sentimento_geral']}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao obter sentimento do mercado: {e}")
            return {'erro': str(e)}
    
    def processar_noticias(self, noticias: List[str]) -> Dict:
        """Processa múltiplas notícias para análise de sentimento"""
        try:
            if not noticias:
                noticias = ["Mercado agrícola em alta", "Preços estáveis", "Safra promissora"]
            
            resultados = []
            for noticia in noticias:
                analise = self.analisar_texto(noticia)
                resultados.append(analise)
            
            # Calcula sentimento geral
            sentimentos = [r.get('sentimento', 'neutro') for r in resultados if 'sentimento' in r]
            positivos = sentimentos.count('positivo')
            negativos = sentimentos.count('negativo')
            neutros = sentimentos.count('neutro')
            
            if positivos > negativos:
                sentimento_geral = 'positivo'
            elif negativos > positivos:
                sentimento_geral = 'negativo'
            else:
                sentimento_geral = 'neutro'
            
            resultado = {
                'noticias_processadas': len(noticias),
                'sentimento_geral': sentimento_geral,
                'distribuicao': {
                    'positivo': positivos,
                    'negativo': negativos,
                    'neutro': neutros
                },
                'resultados': resultados,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"📰 Notícias processadas: {len(noticias)}")
            return resultado
        except Exception as e:
            logger.error(f"❌ Erro ao processar notícias: {e}")
            return {'erro': str(e)}
    
    def treinar_modelo(self, dados_treino: List[Dict]) -> bool:
        """Treina o modelo de análise de sentimento"""
        try:
            # Simulação de treinamento
            logger.info("🧠 Modelo de sentimento treinado")
            return True
        except Exception as e:
            logger.error(f"❌ Erro no treinamento: {e}")
            return False 