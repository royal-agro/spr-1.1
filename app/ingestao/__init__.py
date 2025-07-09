"""
📦 SPR 1.1 - Módulo de Ingestão de Dados
Sistema de coleta, normalização e armazenamento de dados agropecuários
"""

from .ingest_cepea import executar_ingestao_cepea, job_ingestao_cepea
from .ingest_clima import executar_ingestao_clima, job_ingestao_clima
from .ingest_cambio import executar_ingestao_cambio, job_ingestao_cambio
from .ingest_estoque import executar_ingestao_estoque, job_ingestao_estoque
from .ingest_sentimento import executar_ingestao_sentimento, job_ingestao_sentimento
from .scheduler_ingestao import (
    SchedulerIngestao,
    iniciar_sistema_ingestao,
    parar_sistema_ingestao,
    scheduler_ingestao
)

__all__ = [
    'executar_ingestao_cepea',
    'executar_ingestao_clima', 
    'executar_ingestao_cambio',
    'executar_ingestao_estoque',
    'executar_ingestao_sentimento',
    'job_ingestao_cepea',
    'job_ingestao_clima',
    'job_ingestao_cambio',
    'job_ingestao_estoque',
    'job_ingestao_sentimento',
    'SchedulerIngestao',
    'iniciar_sistema_ingestao',
    'parar_sistema_ingestao',
    'scheduler_ingestao'
] 