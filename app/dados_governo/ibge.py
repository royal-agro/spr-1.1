"""
SPR 1.1 - Normalização de códigos IBGE
Utilitários para padronização de UF, municípios e códigos IBGE
"""

import re
from typing import Dict, Optional, Tuple
import unicodedata

from core.config import ESTADOS_BRASIL, REGIOES_BRASIL


def normalize_text(text: str) -> str:
    """Normaliza texto removendo acentos e convertendo para maiúsculo"""
    if not text:
        return ""
    
    # Remove acentos
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    
    # Maiúsculo e remove espaços extras
    return text.upper().strip()


def normalize_uf(uf: str) -> Optional[str]:
    """Normaliza UF para código padrão"""
    if not uf:
        return None
    
    uf_clean = uf.strip().upper()
    
    # Se já é código UF válido
    if uf_clean in ESTADOS_BRASIL:
        return uf_clean
    
    # Busca por nome do estado
    uf_normalized = normalize_text(uf_clean)
    for codigo, nome in ESTADOS_BRASIL.items():
        if normalize_text(nome) == uf_normalized:
            return codigo
    
    return None


def normalize_municipio(municipio: str) -> str:
    """Normaliza nome de município"""
    if not municipio:
        return ""
    
    # Remove prefixos/sufixos comuns
    municipio = municipio.strip()
    
    # Remove "Município de", "Cidade de", etc.
    prefixes = ["MUNICIPIO DE", "CIDADE DE", "VILA DE", "COMARCA DE"]
    municipio_upper = municipio.upper()
    
    for prefix in prefixes:
        if municipio_upper.startswith(prefix):
            municipio = municipio[len(prefix):].strip()
            break
    
    return municipio.title()


# Base de códigos IBGE de municípios (amostra - em produção viria de fonte oficial)
# Aqui incluímos alguns municípios importantes para demonstração
MUNICIPIOS_IBGE = {
    # Mato Grosso (exemplo mais completo por ser foco agropecuário)
    5103403: {"nome": "Cuiabá", "uf": "MT", "regiao": "Centro-Oeste"},
    5106455: {"nome": "Rondonópolis", "uf": "MT", "regiao": "Centro-Oeste"},
    5108402: {"nome": "Várzea Grande", "uf": "MT", "regiao": "Centro-Oeste"},
    5103254: {"nome": "Cáceres", "uf": "MT", "regiao": "Centro-Oeste"},
    5108501: {"nome": "Sinop", "uf": "MT", "regiao": "Centro-Oeste"},
    5107958: {"nome": "Tangará da Serra", "uf": "MT", "regiao": "Centro-Oeste"},
    5107800: {"nome": "Sorriso", "uf": "MT", "regiao": "Centro-Oeste"},
    5105150: {"nome": "Lucas do Rio Verde", "uf": "MT", "regiao": "Centro-Oeste"},
    5102637: {"nome": "Barra do Garças", "uf": "MT", "regiao": "Centro-Oeste"},
    5105903: {"nome": "Nova Mutum", "uf": "MT", "regiao": "Centro-Oeste"},
    
    # Goiás
    5208707: {"nome": "Goiânia", "uf": "GO", "regiao": "Centro-Oeste"},
    5201405: {"nome": "Anápolis", "uf": "GO", "regiao": "Centro-Oeste