"""
SPR 1.1 - Utilitários comuns
Funções auxiliares para HTTP, data, validação e hashing
"""

import hashlib
import json
import time
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import pandas as pd
import pytz
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import httpx

from core.config import Config
from core.logging_conf import get_module_logger

logger = get_module_logger("utils")


class DateUtils:
    """Utilitários para manipulação de datas"""
    
    @staticmethod
    def to_utc(dt: datetime, source_tz: str = None) -> datetime:
        """Converte datetime para UTC"""
        if dt.tzinfo is None:
            # Se não tem timezone, assume timezone local configurado
            source_tz = source_tz or Config.SPR_TZ
            tz = pytz.timezone(source_tz)
            dt = tz.localize(dt)
        
        return dt.astimezone(Config.UTC_TZ)
    
    @staticmethod
    def to_local(dt: datetime, target_tz: str = None) -> datetime:
        """Converte datetime para timezone local"""
        target_tz = target_tz or Config.SPR_TZ
        tz = pytz.timezone(target_tz)
        
        if dt.tzinfo is None:
            dt = Config.UTC_TZ.localize(dt)
        
        return dt.astimezone(tz)
    
    @staticmethod
    def now_utc() -> datetime:
        """Retorna datetime atual em UTC"""
        return datetime.now(Config.UTC_TZ)
    
    @staticmethod
    def now_local() -> datetime:
        """Retorna datetime atual no timezone local"""
        return datetime.now(Config.TIMEZONE)
    
    @staticmethod
    def parse_date_flexible(date_str: str) -> Optional[date]:
        """Parse flexível de strings de data em vários formatos"""
        if not date_str or pd.isna(date_str):
            return None
        
        # Formatos comuns
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y", 
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%Y%m%d",
            "%d.%m.%Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(str(date_str).strip(), fmt).date()
            except ValueError:
                continue
        
        # Tenta pandas
        try:
            return pd.to_datetime(date_str).date()
        except:
            logger.warning(f"Não foi possível fazer parse da data: {date_str}")
            return None
    
    @staticmethod
    def date_range_weeks(start_date: date, end_date: date, weeks: int = 4) -> List[tuple]:
        """Divide um período em janelas de N semanas"""
        windows = []
        current_start = start_date
        
        while current_start <= end_date:
            current_end = min(current_start + timedelta(weeks=weeks), end_date)
            windows.append((current_start, current_end))
            current_start = current_end + timedelta(days=1)
        
        return windows


class FileUtils:
    """Utilitários para manipulação de arquivos"""
    
    @staticmethod
    def calculate_hash(file_path: Path) -> str:
        """Calcula hash SHA256 de um arquivo"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    @staticmethod
    def calculate_content_hash(content: Union[str, bytes]) -> str:
        """Calcula hash SHA256 de conteúdo"""
        if isinstance(content, str):
            content = content.encode('utf-8')
        return hashlib.sha256(content).hexdigest()
    
    @staticmethod
    def detect_encoding(file_path: Path) -> str:
        """Detecta encoding de arquivo texto"""
        try:
            import chardet
            with open(file_path, 'rb') as f:
                raw_data = f.read(10000)  # Lê primeiros 10KB
                result = chardet.detect(raw_data)
                return result.get('encoding', 'utf-8')
        except ImportError:
            logger.warning("chardet não disponível, assumindo utf-8")
            return 'utf-8'
    
    @staticmethod
    def normalize_csv_encoding(file_path: Path, target_encoding: str = 'utf-8') -> Path:
        """Normaliza encoding de arquivo CSV"""
        if not file_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        # Detecta encoding atual
        current_encoding = FileUtils.detect_encoding(file_path)
        
        if current_encoding.lower() == target_encoding.lower():
            return file_path
        
        # Cria arquivo normalizado
        normalized_path = file_path.parent / f"{file_path.stem}_normalized{file_path.suffix}"
        
        with open(file_path, 'r', encoding=current_encoding) as source:
            with open(normalized_path, 'w', encoding=target_encoding) as target:
                target.write(source.read())
        
        logger.info(f"Arquivo normalizado de {current_encoding} para {target_encoding}: {normalized_path}")
        return normalized_path
    
    @staticmethod
    def backup_file(file_path: Path, backup_dir: Path = None) -> Path:
        """Cria backup de arquivo com timestamp"""
        if not file_path.exists():
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        
        backup_dir = backup_dir or file_path.parent / "backups"
        backup_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
        backup_path = backup_dir / backup_name
        
        import shutil
        shutil.copy2(file_path, backup_path)
        
        logger.info(f"Backup criado: {backup_path}")
        return backup_path


class HttpClient:
    """Cliente HTTP com retry e rate limiting"""
    
    def __init__(self, 
                 timeout: int = None,
                 max_retries: int = None,
                 backoff_min: float = None,
                 backoff_max: float = None):
        self.timeout = timeout or Config.HTTP_TIMEOUT
        self.max_retries = max_retries or Config.HTTP_MAX_RETRIES
        self.backoff_min = backoff_min or Config.HTTP_BACKOFF_MIN
        self.backoff_max = backoff_max or Config.HTTP_BACKOFF_MAX
        
        self.client = httpx.Client(
            timeout=self.timeout,
            headers={"User-Agent": Config.USER_AGENT},
            follow_redirects=True
        )
    
    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    def get(self, url: str, **kwargs) -> httpx.Response:
        """GET com retry automático"""
        from core.logging_conf import log_api_call
        
        with log_api_call(logger, url, "GET", **kwargs) as api_log:
            response = self.client.get(url, **kwargs)
            api_log.set_response_info(response.status_code, len(response.content))
            response.raise_for_status()
            return response
    
    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=30),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    def post(self, url: str, **kwargs) -> httpx.Response:
        """POST com retry automático"""
        from core.logging_conf import log_api_call
        
        with log_api_call(logger, url, "POST", **kwargs) as api_log:
            response = self.client.post(url, **kwargs)
            api_log.set_response_info(response.status_code, len(response.content))
            response.raise_for_status()
            return response
    
    def download_file(self, url: str, file_path: Path, chunk_size: int = 8192) -> Path:
        """Download de arquivo com progress"""
        from tqdm import tqdm
        
        with self.client.stream("GET", url) as response:
            response.raise_for_status()
            
            total_size = int(response.headers.get("content-length", 0))
            
            with open(file_path, "wb") as f:
                with tqdm(total=total_size, unit="B", unit_scale=True, desc=file_path.name) as pbar:
                    for chunk in response.iter_bytes(chunk_size):
                        f.write(chunk)
                        pbar.update(len(chunk))
        
        logger.info(f"Arquivo baixado: {file_path} ({file_path.stat().st_size} bytes)")
        return file_path
    
    def __del__(self):
        if hasattr(self, 'client'):
            self.client.close()


class DataValidator:
    """Validador de dados e schemas"""
    
    @staticmethod
    def validate_dataframe_schema(df: pd.DataFrame, required_columns: List[str]) -> bool:
        """Valida se DataFrame possui colunas obrigatórias"""
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            logger.error(f"Colunas obrigatórias ausentes: {missing_columns}")
            return False
        return True
    
    @staticmethod
    def detect_outliers_iqr(series: pd.Series, factor: float = 1.5) -> pd.Series:
        """Detecta outliers usando método IQR"""
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - factor * IQR
        upper_bound = Q3 + factor * IQR
        
        return (series < lower_bound) | (series > upper_bound)
    
    @staticmethod
    def clean_numeric_column(series: pd.Series) -> pd.Series:
        """Limpa coluna numérica (vírgulas, espaços, etc.)"""
        if series.dtype == 'object':
            # Remove espaços e converte vírgulas para pontos
            cleaned = series.astype(str).str.replace(' ', '').str.replace(',', '.')
            
            # Tenta converter para numérico
            try:
                return pd.to_numeric(cleaned, errors='coerce')
            except:
                return series
        
        return series


class MetadataManager:
    """Gerenciador de metadados de arquivos e datasets"""
    
    @staticmethod
    def create_manifest(connector: str, 
                       dataset: str,
                       source_url: str,
                       file_path: Path,
                       schema_version: str = "1.0",
                       extra_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Cria manifest de metadados para um dataset"""
        
        manifest = {
            "connector": connector,
            "dataset": dataset,
            "source_url": source_url,
            "collection_timestamp": DateUtils.now_utc().isoformat(),
            "file_info": {
                "path": str(file_path),
                "size_bytes": file_path.stat().st_size if file_path.exists() else 0,
                "hash_sha256": FileUtils.calculate_hash(file_path) if file_path.exists() else None,
                "last_modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat() if file_path.exists() else None
            },
            "schema_version": schema_version,
            "spr_version": "1.1.0"
        }
        
        if extra_metadata:
            manifest.update(extra_metadata)
        
        return manifest
    
    @staticmethod
    def save_manifest(manifest: Dict[str, Any], connector: str, dataset: str) -> Path:
        """Salva manifest em arquivo JSON"""
        manifest_path = Config.get_metadata_path(connector, f"{dataset}_manifest.json")
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"Manifest salvo: {manifest_path}")
        return manifest_path
    
    @staticmethod
    def load_manifest(connector: str, dataset: str) -> Optional[Dict[str, Any]]:
        """Carrega manifest de arquivo"""
        manifest_path = Config.get_metadata_path(connector, f"{dataset}_manifest.json")
        
        if not manifest_path.exists():
            return None
        
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Erro ao carregar manifest {manifest_path}: {e}")
            return None
    
    @staticmethod
    def is_file_changed(connector: str, dataset: str, file_path: Path) -> bool:
        """Verifica se arquivo mudou desde último processamento"""
        manifest = MetadataManager.load_manifest(connector, dataset)
        
        if not manifest or not file_path.exists():
            return True
        
        current_hash = FileUtils.calculate_hash(file_path)
        stored_hash = manifest.get("file_info", {}).get("hash_sha256")
        
        return current_hash != stored_hash


def convert_units(value: float, from_unit: str, to_unit: str = "kg") -> float:
    """Converte unidades usando fatores de conversão"""
    if from_unit == to_unit:
        return value
    
    from_factor = Config.UNIT_CONVERSION_FACTORS.get(from_unit.lower(), 1.0)
    to_factor = Config.UNIT_CONVERSION_FACTORS.get(to_unit.lower(), 1.0)
    
    # Converte para unidade base (kg) e depois para unidade alvo
    base_value = value * from_factor
    return base_value / to_factor


def normalize_product_name(product: str) -> str:
    """Normaliza nome de produto para padrão SPR"""
    from core.products import PRODUCT_SYNONYMS
    
    # Remove espaços e converte para minúsculo
    normalized = product.lower().strip()
    
    # Busca em sinônimos
    for standard_name, synonyms in PRODUCT_SYNONYMS.items():
        if normalized in [syn.lower() for syn in synonyms]:
            return standard_name
    
    return normalized


def chunked_date_range(start_date: date, end_date: date, chunk_weeks: int = 4) -> List[tuple]:
    """Divide período em chunks para APIs com limitação de janela"""
    return DateUtils.date_range_weeks(start_date, end_date, chunk_weeks)