"""
📦 SPR 1.1 - Módulo de Dados Governamentais
Sistema de Pipeline de Dados Agropecuários Brasileiros

Este módulo integra dados de três fontes principais:
- 🌡️ INMET: Dados meteorológicos
- 🌾 MAPA-CKAN: Datasets agrícolas  
- 💰 CONAB: Preços e safras agropecuárias
"""

from .config import Config
from .schemas import *
from .utils import DateUtils, FileUtils, HttpUtils
from .logging_conf import get_module_logger
from .products import ProductCatalog
from .ibge import IBGECodes

__version__ = "1.1.0"
__author__ = "SPR Team"
__description__ = "Sistema de Pipeline de Dados Agropecuários"

# Exporta classes principais
__all__ = [
    'Config',
    'DateUtils', 
    'FileUtils',
    'HttpUtils',
    'get_module_logger',
    'ProductCatalog',
    'IBGECodes'
] 