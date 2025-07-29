"""
SPR 1.1 - Ingestão de dados INMET
Coleta e processamento de dados meteorológicos
"""

import json
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd

from core.config import Config
from core.utils import MetadataManager, DateUtils
from core.logging_conf import get_module_logger
from core.schemas import InmetEstacao, InmetSerieHoraria, InmetSerieDiaria, validate_dataframe_with_schema
from connectors.inmet.client import InmetClient

logger = get_module_logger("inmet.ingest")


class InmetIngester:
    """Ingestor de dados INMET"""
    
    def __init__(self):
        self.client = InmetClient()
        self.connector = "inmet"
    
    def sync_estacoes(self) -> Tuple[int, str]:
        """
        Sincroniza catálogo de estações meteorológicas
        
        Returns:
            Tuple com (quantidade_estacoes, caminho_arquivo)
        """
        logger.info("Iniciando sincronização de estações INMET...")
        
        try:
            # Coleta estações
            estacoes_data = self.client.get_todas_estacoes(force_refresh=True)
            
            if not estacoes_data:
                raise ValueError("Nenhuma estação encontrada")
            
            # Converte para DataFrame
            df = pd.DataFrame(estacoes_data)
            
            # Padroniza colunas
            df = self._normalize_estacoes_dataframe(df)
            
            # Valida dados
            validation_result = validate_dataframe_with_schema(df, InmetEstacao)
            if not validation_result.is_valid:
                logger.warning(f"Dados com problemas de validação: {len(validation_result.errors)} erros")
                for error in validation_result.errors[:5]:  # Mostra apenas primeiros 5
                    logger.warning(f"  {error}")
            
            # Salva arquivo raw
            raw_file = Config.get_raw_path(self.connector, "estacoes.json")
            with open(raw_file, 'w', encoding='utf-8') as f:
                json.dump(estacoes_data, f, indent=2, ensure_ascii=False, default=str)
            
            # Salva arquivo staging
            staging_file = Config.get_staging_path(self.connector, "estacoes.csv")
            df.to_csv(staging_file, index=False, encoding='utf-8')
            
            # Salva arquivo curated (Parquet)
            curated_file = Config.get_curated_path("inmet_estacoes")
            df.to_parquet(curated_file, index=False)
            
            # Cria manifest
            manifest = MetadataManager.create_manifest(
                connector=self.connector,
                dataset="estacoes",
                source_url=f"{self.client.base_url}/estacoes",
                file_path=curated_file,
                extra_metadata={
                    "total_estacoes": len(df),
                    "estacoes_automaticas": len(df[df['tipo'] == 'T']),
                    "estacoes_manuais": len(df[df['tipo'] == 'M']),
                    "ufs_cobertas": sorted(df['uf'].unique().tolist()),
                    "validation_errors": len(validation_result.errors)
                }
            )
            
            MetadataManager.save_manifest(manifest, self.connector, "estacoes")
            
            logger.info(f"Sincronização concluída: {len(df)} estações salvas em {curated_file}")
            return len(df), str(curated_file)
            
        except Exception as e:
            logger.error(f"Erro na sincronização de estações: {e}")
            raise
    
    def sync_series_horarias(
        self,
        data_inicio: date,
        data_fim: date,
        codigos_estacao: Optional[List[str]] = None,
        uf_filter: Optional[str] = None
    ) -> Tuple[int, str]:
        """
        Sincroniza séries horárias
        
        Args:
            data_inicio: Data inicial
            data_fim: Data final  
            codigos_estacao: Lista de códigos específicos (None = todas)
            uf_filter: Filtro por UF (None = todas)
        
        Returns:
            Tuple com (quantidade_registros, caminho_arquivo)
        """
        logger.info(f"Sincronizando séries horárias: {data_inicio} a {data_fim}")
        
        # Valida período
        data_inicio, data_fim = self.client.validate_date_range(data_inicio, data_fim)
        
        # Define estações a processar
        if codigos_estacao:
            estacoes = [{"codigo_inmet": codigo} for codigo in codigos_estacao]
        else:
            # Carrega todas as estações
            estacoes_df = self._load_estacoes_dataframe()
            if uf_filter:
                estacoes_df = estacoes_df[estacoes_df['uf'] == uf_filter.upper()]
            estacoes = estacoes_df[['codigo_inmet']].to_dict('records')
        
        logger.info(f"Processando {len(estacoes)} estações")
        
        all_data = []
        processed_stations = 0
        
        for estacao in estacoes:
            codigo = estacao['codigo_inmet']
            
            try:
                logger.info(f"Coletando dados horários da estação {codigo}...")
                
                # Verifica se já foi processado (controle de idempotência)
                if self._is_period_already_processed(codigo, data_inicio, data_fim, 'horarias'):
                    logger.info(f"Período já processado para {codigo}, pulando...")
                    continue
                
                # Coleta dados
                station_data = self.client.get_series_horarias(codigo, data_inicio, data_fim)
                
                if station_data:
                    all_data.extend(station_data)
                    processed_stations += 1
                    logger.info(f"Coletados {len(station_data)} registros de {codigo}")
                else:
                    logger.warning(f"Nenhum dado encontrado para {codigo}")
                
                # Rate limiting
                if processed_stations % 10 == 0:
                    logger.info(f"Processadas {processed_stations}/{len(estacoes)} estações...")
                
            except Exception as e:
                logger.error(f"Erro ao processar estação {codigo}: {e}")
                continue
        
        if not all_data:
            logger.warning("Nenhum dado coletado")
            return 0, ""
        
        # Converte para DataFrame
        df = pd.DataFrame(all_data)
        df = self._normalize_series_dataframe(df, 'horarias')
        
        # Salva arquivos
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        period_str = f"{data_inicio.strftime('%Y%m%d')}_{data_fim.strftime('%Y%m%d')}"
        
        # Raw
        raw_file = Config.get_raw_path(self.connector, f"series_horarias_{period_str}_{timestamp}.json")
        with open(raw_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, indent=2, ensure_ascii=False, default=str)
        
        # Staging
        staging_file = Config.get_staging_path(self.connector, f"series_horarias_{period_str}.csv")
        df.to_csv(staging_file, index=False, encoding='utf-8')
        
        # Curated (append mode para séries temporais)
        curated_file = Config.get_curated_path("inmet_series_horarias")
        if curated_file.exists():
            # Carrega dados existentes e faz merge
            existing_df = pd.read_parquet(curated_file)
            
            # Remove duplicatas (mesmo código + datetime)
            merge_keys = ['codigo_inmet', 'dt_utc']
            df = df[~df.set_index(merge_keys).index.isin(existing_df.set_index(merge_keys).index)]
            
            if not df.empty:
                combined_df = pd.concat([existing_df, df], ignore_index=True)
                combined_df = combined_df.sort_values(['codigo_inmet', 'dt_utc'])
                combined_df.to_parquet(curated_file, index=False)
        else:
            df.to_parquet(curated_file, index=False)
        
        # Cria manifest
        manifest = MetadataManager.create_manifest(
            connector=self.connector,
            dataset="series_horarias",
            source_url=f"{self.client.base_url}/condicoes",
            file_path=curated_file,
            extra_metadata={
                "periodo_inicio": data_inicio.isoformat(),
                "periodo_fim": data_fim.isoformat(),
                "total_registros": len(df),
                "estacoes_processadas": processed_stations,
                "estacoes_solicitadas": len(estacoes),
                "parametros": ["TEMPAR", "TEMPMAX", "TEMPMIN", "UMIREL", "PREC", "VENTO"]
            }
        )
        
        MetadataManager.save_manifest(manifest, self.connector, f"series_horarias_{period_str}")
        
        logger.info(f"Sincronização concluída: {len(df)} registros de {processed_stations} estações")
        return len(df), str(curated_file)
    
    def sync_series_diarias(
        self,
        data_inicio: date,
        data_fim: date,
        codigos_estacao: Optional[List[str]] = None,
        uf_filter: Optional[str] = None
    ) -> Tuple[int, str]:
        """Sincroniza séries diárias (similar à horária)"""
        logger.info(f"Sincronizando séries diárias: {data_inicio} a {data_fim}")
        
        # Valida período
        data_inicio, data_fim = self.client.validate_date_range(data_inicio, data_fim)
        
        # Define estações
        if codigos_estacao:
            estacoes = [{"codigo_inmet": codigo} for codigo in codigos_estacao]
        else:
            estacoes_df = self._load_estacoes_dataframe()
            if uf_filter:
                estacoes_df = estacoes_df[estacoes_df['uf'] == uf_filter.upper()]
            estacoes = estacoes_df[['codigo_inmet']].to_dict('records')
        
        all_data = []
        processed_stations = 0
        
        for estacao in estacoes:
            codigo = estacao['codigo_inmet']
            
            try:
                # Verifica idempotência
                if self._is_period_already_processed(codigo, data_inicio, data_fim, 'diarias'):
                    continue
                
                # Coleta dados
                station_data = self.client.get_series_diarias(codigo, data_inicio, data_fim)
                
                if station_data:
                    all_data.extend(station_data)
                    processed_stations += 1
                
            except Exception as e:
                logger.error(f"Erro ao processar estação {codigo}: {e}")
                continue
        
        if not all_data:
            return 0, ""
        
        # Processa e salva similar às horárias
        df = pd.DataFrame(all_data)
        df = self._normalize_series_dataframe(df, 'diarias')
        
        # Salva arquivos
        period_str = f"{data_inicio.strftime('%Y%m%d')}_{data_fim.strftime('%Y%m%d')}"
        
        staging_file = Config.get_staging_path(self.connector, f"series_diarias_{period_str}.csv")
        df.to_csv(staging_file, index=False, encoding='utf-8')
        
        curated_file = Config.get_curated_path("inmet_series_diarias")
        if curated_file.exists():
            existing_df = pd.read_parquet(curated_file)
            merge_keys = ['codigo_inmet', 'data']
            df = df[~df.set_index(merge_keys).index.isin(existing_df.set_index(merge_keys).index)]
            
            if not df.empty:
                combined_df = pd.concat([existing_df, df], ignore_index=True)
                combined_df = combined_df.sort_values(['codigo_inmet', 'data'])
                combined_df.to_parquet(curated_file, index=False)
        else:
            df.to_parquet(curated_file, index=False)
        
        logger.info(f"Séries diárias sincronizadas: {len(df)} registros")
        return len(df), str(curated_file)
    
    def sync_normais(self) -> Tuple[int, str]:
        """Sincroniza normais climatológicas"""
        logger.info("Sincronizando normais climatológicas...")
        
        try:
            normais_data = self.client.get_normais_climatologicas()
            
            if not normais_data:
                logger.warning("Nenhuma normal climatológica encontrada")
                return 0, ""
            
            # Processa e salva
            df = pd.DataFrame(normais_data)
            
            # Raw
            raw_file = Config.get_raw_path(self.connector, "normais.json")
            with open(raw_file, 'w', encoding='utf-8') as f:
                json.dump(normais_data, f, indent=2, ensure_ascii=False, default=str)
            
            # Curated
            curated_file = Config.get_curated_path("inmet_normais")
            df.to_parquet(curated_file, index=False)
            
            logger.info(f"Normais climatológicas sincronizadas: {len(df)} registros")
            return len(df), str(curated_file)
            
        except Exception as e:
            logger.error(f"Erro ao sincronizar normais: {e}")
            return 0, ""
    
    def _normalize_estacoes_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normaliza DataFrame de estações"""
        # Mapeia colunas comuns
        column_mapping = {
            'CD_ESTACAO': 'codigo_inmet',
            'codigo': 'codigo_inmet',
            'DC_NOME': 'nome',
            'nome': 'nome',
            'VL_LATITUDE': 'lat',
            'VL_LONGITUDE': 'lon',
            'latitude': 'lat',
            'longitude': 'lon',
            'UF': 'uf',
            'SG_ESTADO': 'uf',
            'altitude': 'altitude',
            'VL_ALTITUDE': 'altitude',
            'situacao': 'situacao',
            'DT_INICIO_OPERACAO': 'inicio_operacao',
            'DT_FIM_OPERACAO': 'fim_operacao'
        }
        
        # Renomeia colunas
        df = df.rename(columns=column_mapping)
        
        # Garante colunas obrigatórias
        required_cols = ['codigo_inmet', 'tipo', 'uf', 'nome', 'lat', 'lon', 'situacao']
        for col in required_cols:
            if col not in df.columns:
                if col == 'tipo':
                    df[col] = 'T'  # Assume automática por padrão
                elif col == 'situacao':
                    df[col] = 'Ativa'
                else:
                    df[col] = None
        
        # Converte tipos
        df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
        df['lon'] = pd.to_numeric(df['lon'], errors='coerce')
        df['altitude'] = pd.to_numeric(df['altitude'], errors='coerce')
        
        # Converte datas
        for date_col in ['inicio_operacao', 'fim_operacao']:
            if date_col in df.columns:
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce').dt.date
        
        # Remove linhas com dados essenciais faltando
        df = df.dropna(subset=['codigo_inmet', 'uf', 'lat', 'lon'])
        
        return df
    
    def _normalize_series_dataframe(self, df: pd.DataFrame, tipo: str) -> pd.DataFrame:
        """Normaliza DataFrame de séries temporais"""
        
        if tipo == 'horarias':
            # Garante colunas de datetime
            if 'dt_utc' in df.columns:
                df['dt_utc'] = pd.to_datetime(df['dt_utc'])
            if 'dt_local' in df.columns:
                df['dt_local'] = pd.to_datetime(df['dt_local'])
            
            # Colunas numéricas
            numeric_cols = ['TEMPAR', 'TEMPMAX', 'TEMPMIN', 'UMIREL', 'PREC', 'VENTO', 'PRESSAO', 'RADIACAO']
            
        else:  # diarias
            # Garante coluna de data
            if 'data' in df.columns:
                df['data'] = pd.to_datetime(df['data']).dt.date
            
            # Colunas numéricas
            numeric_cols = ['temp_media', 'temp_max', 'temp_min', 'umid_media', 'prec_total', 'vento_medio']
        
        # Converte colunas numéricas
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remove linhas sem dados essenciais
        df = df.dropna(subset=['codigo_inmet'])
        
        return df
    
    def _load_estacoes_dataframe(self) -> pd.DataFrame:
        """Carrega DataFrame de estações"""
        curated_file = Config.get_curated_path("inmet_estacoes")
        
        if not curated_file.exists():
            logger.info("Arquivo de estações não existe, sincronizando...")
            self.sync_estacoes()
        
        return pd.read_parquet(curated_file)
    
    def _is_period_already_processed(
        self,
        codigo_estacao: str,
        data_inicio: date,
        data_fim: date,
        tipo: str
    ) -> bool:
        """Verifica se período já foi processado (controle de idempotência)"""
        
        table_name = f"inmet_series_{tipo}"
        curated_file = Config.get_curated_path(table_name)
        
        if not curated_file.exists():
            return False
        
        try:
            df = pd.read_parquet(curated_file)
            
            # Filtra pela estação
            station_df = df[df['codigo_inmet'] == codigo_estacao]
            
            if station_df.empty:
                return False
            
            # Verifica cobertura do período
            if tipo == 'horarias':
                station_df['date'] = pd.to_datetime(station_df['dt_utc']).dt.date
            else:
                station_df['date'] = pd.to_datetime(station_df['data']).dt.date
            
            existing_dates = set(station_df['date'].unique())
            
            # Gera datas do período solicitado
            requested_dates = set()
            current_date = data_inicio
            while current_date <= data_fim:
                requested_dates.add(current_date)
                current_date += timedelta(days=1)
            
            # Verifica se pelo menos 80% das datas já existem
            coverage = len(existing_dates.intersection(requested_dates)) / len(requested_dates)
            
            return coverage >= 0.8
            
        except Exception as e:
            logger.warning(f"Erro ao verificar período processado: {e}")
            return False


# Funções de conveniência
def sync_estacoes_inmet() -> Tuple[int, str]:
    """Sincroniza estações INMET"""
    ingester = InmetIngester()
    return ingester.sync_estacoes()


def sync_series_inmet(
    data_inicio: date,
    data_fim: date,
    freq: str = 'H',
    uf: Optional[str] = None
) -> Tuple[int, str]:
    """Sincroniza séries INMET"""
    ingester = InmetIngester()
    
    if freq == 'H':
        return ingester.sync_series_horarias(data_inicio, data_fim, uf_filter=uf)
    else:
        return ingester.sync_series_diarias(data_inicio, data_fim, uf_filter=uf)


def sync_normais_inmet() -> Tuple[int, str]:
    """Sincroniza normais climatológicas"""
    ingester = InmetIngester()
    return ingester.sync_normais()