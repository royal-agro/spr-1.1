"""
SPR 1.1 - Configurações centralizadas
Carrega variáveis de ambiente e define constantes do sistema
"""

import os
from pathlib import Path
from typing import Optional
import pytz
from dotenv import load_dotenv

# Carrega variáveis do .env
load_dotenv()

class Config:
    """Configurações centralizadas do SPR 1.1"""
    
    # Paths
    SPR_ROOT: Path = Path(os.getenv("SPR_ROOT", "./SPR1.1"))
    DATA_DIR: Path = SPR_ROOT / "data"
    RAW_DIR: Path = DATA_DIR / "raw"
    STAGING_DIR: Path = DATA_DIR / "staging"
    CURATED_DIR: Path = DATA_DIR / "curated"
    METADATA_DIR: Path = DATA_DIR / "metadata"
    LOGS_DIR: Path = SPR_ROOT / "logs"
    
    # Timezone
    SPR_TZ: str = os.getenv("SPR_TZ", "America/Cuiaba")
    TIMEZONE = pytz.timezone(SPR_TZ)
    UTC_TZ = pytz.UTC
    
    # HTTP
    USER_AGENT: str = os.getenv("SPR_USER_AGENT", "SPR-1.1/Conectores (+contato@exemplo.com)")
    HTTP_TIMEOUT: int = int(os.getenv("HTTP_TIMEOUT", "60"))
    HTTP_MAX_RETRIES: int = int(os.getenv("HTTP_MAX_RETRIES", "5"))
    HTTP_BACKOFF_MIN: float = float(os.getenv("HTTP_BACKOFF_MIN", "1"))
    HTTP_BACKOFF_MAX: float = float(os.getenv("HTTP_BACKOFF_MAX", "30"))
    
    # APIs
    INMET_BASE: str = os.getenv("INMET_BASE", "https://apitempo.inmet.gov.br")
    MAPA_CKAN_BASE: str = os.getenv("MAPA_CKAN_BASE", "https://dados.agricultura.gov.br")
    CONAB_PORTAL_BASE: str = os.getenv("CONAB_PORTAL_BASE", "https://portaldeinformacoes.conab.gov.br")
    CONAB_CONSULTA_PRECOS: str = os.getenv("CONAB_CONSULTA_PRECOS", "https://consultaprecosdemercado.conab.gov.br")
    
    # Logs
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_MAX_BYTES: int = int(os.getenv("LOG_MAX_BYTES", "10485760"))  # 10MB
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "5"))
    
    @classmethod
    def ensure_dirs(cls) -> None:
        """Garante que todos os diretórios existam"""
        for dir_attr in ['DATA_DIR', 'RAW_DIR', 'STAGING_DIR', 'CURATED_DIR', 'METADATA_DIR', 'LOGS_DIR']:
            dir_path = getattr(cls, dir_attr)
            dir_path.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def get_raw_path(cls, connector: str, filename: str) -> Path:
        """Retorna caminho para arquivo raw"""
        connector_dir = cls.RAW_DIR / connector
        connector_dir.mkdir(exist_ok=True)
        return connector_dir / filename
    
    @classmethod
    def get_staging_path(cls, connector: str, filename: str) -> Path:
        """Retorna caminho para arquivo staging"""
        connector_dir = cls.STAGING_DIR / connector
        connector_dir.mkdir(exist_ok=True)
        return connector_dir / filename
    
    @classmethod
    def get_curated_path(cls, table_name: str) -> Path:
        """Retorna caminho para tabela curated (Parquet)"""
        return cls.CURATED_DIR / f"{table_name}.parquet"
    
    @classmethod
    def get_metadata_path(cls, connector: str, filename: str) -> Path:
        """Retorna caminho para metadados"""
        connector_dir = cls.METADATA_DIR / connector
        connector_dir.mkdir(exist_ok=True)
        return connector_dir / filename

# Produtos suportados
SUPPORTED_GRAOS = ["soja", "milho", "sorgo", "trigo", "arroz"]
SUPPORTED_PROTEINS = ["boi_gordo", "frango", "suino", "leite", "ovos"]
ALL_PRODUCTS = SUPPORTED_GRAOS + SUPPORTED_PROTEINS

# Fatores de conversão de unidades
UNIT_CONVERSION_FACTORS = {
    # Grãos (para kg)
    "saca_soja": 60.0,      # saca soja = 60kg
    "saca_milho": 60.0,     # saca milho = 60kg
    "saca_sorgo": 60.0,     # saca sorgo = 60kg
    "saca_trigo": 60.0,     # saca trigo = 60kg
    "saca_arroz": 50.0,     # saca arroz = 50kg
    
    # Proteínas
    "arroba_boi": 15.0,     # arroba boi = 15kg
    "duzia_ovos": 0.6,      # dúzia ovos ≈ 0.6kg (50g/ovo)
    "litro_leite": 1.03,    # litro leite ≈ 1.03kg (densidade)
    
    # Base
    "kg": 1.0,
    "tonelada": 1000.0,
    "litro": 1.0,           # Para produtos não lácteos
}

# Estados brasileiros
ESTADOS_BRASIL = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
    "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
    "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
    "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
}

# Regiões
REGIOES_BRASIL = {
    "Norte": ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
    "Nordeste": ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
    "Centro-Oeste": ["GO", "MT", "MS", "DF"],
    "Sudeste": ["ES", "MG", "RJ", "SP"],
    "Sul": ["PR", "RS", "SC"]
}

def get_region_by_uf(uf: str) -> Optional[str]:
    """Retorna a região de uma UF"""
    for regiao, ufs in REGIOES_BRASIL.items():
        if uf in ufs:
            return regiao
    return None

# Inicializa configurações
Config.ensure_dirs()
