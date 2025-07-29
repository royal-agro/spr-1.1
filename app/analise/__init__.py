"""
Módulo de Análise do SPR 1.1
"""

from .alertas_automatizados import AlertasAutomatizados
from .analise_sentimento import AnaliseSentimento
from .comparativos_precificacao import ComparativosPrecificacao
from .dashboard_interativo import DashboardInterativo
from .noticias_sentimento import NoticiasSentimento
from .relatorios_mercadologicos import RelatoriosMercadologicos

__all__ = [
    'AlertasAutomatizados',
    'AnaliseSentimento', 
    'ComparativosPrecificacao',
    'DashboardInterativo',
    'NoticiasSentimento',
    'RelatoriosMercadologicos'
] 