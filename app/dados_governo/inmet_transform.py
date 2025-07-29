"""
SPR 1.1 - Transformações de dados INMET
Features derivadas e análises meteorológicas
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

from core.config import Config
from core.products import DEGREE_DAY_BASE_TEMPS
from core.logging_conf import get_module_logger

logger = get_module_logger("inmet.transform")


class InmetTransformer:
    """Transformador de dados meteorológicos INMET"""
    
    def __init__(self):
        self.degree_day_bases = DEGREE_DAY_BASE_TEMPS
    
    def calculate_degree_days(
        self,
        df: pd.DataFrame,
        temp_col: str = 'temp_media',
        crop: str = 'soja_grao'
    ) -> pd.Series:
        """
        Calcula graus-dia para uma cultura
        
        Args:
            df: DataFrame com dados diários de temperatura
            temp_col: Nome da coluna de temperatura
            crop: Cultura para buscar temperatura base
        
        Returns:
            Série com graus-dia acumulados
        """
        base_temp = self.degree_day_bases.get(crop, 10.0)
        
        # Calcula graus-dia diários
        daily_dd = df[temp_col] - base_temp
        daily_dd = daily_dd.where(daily_dd > 0, 0)  # Valores negativos = 0
        
        # Acumula por estação
        if 'codigo_inmet' in df.columns:
            accumulated_dd = df.groupby('codigo_inmet')[temp_col].transform(
                lambda x: (x - base_temp).where(x - base_temp > 0, 0).cumsum()
            )
        else:
            accumulated_dd = daily_dd.cumsum()
        
        return accumulated_dd
    
    def calculate_anomalies(
        self,
        df: pd.DataFrame,
        normais_df: pd.DataFrame,
        variable: str = 'temp_media'
    ) -> pd.Series:
        """
        Calcula anomalias em relação às normais climatológicas
        
        Args:
            df: DataFrame com dados observados
            normais_df: DataFrame com normais climatológicas
            variable: Variável para calcular anomalia
        
        Returns:
            Série com anomalias
        """
        # Adiciona mês aos dados observados
        if 'data' in df.columns:
            df = df.copy()
            df['mes'] = pd.to_datetime(df['data']).dt.month
        
        # Merge com normais
        merged = df.merge(
            normais_df[normais_df['variavel'] == variable][['codigo_inmet', 'mes', 'valor']],
            on=['codigo_inmet', 'mes'],
            how='left',
            suffixes=('', '_normal')
        )
        
        # Calcula anomalia
        if variable in ['temp_media', 'temp_max', 'temp_min']:
            # Anomalia absoluta para temperatura (°C)
            anomaly = merged[variable] - merged['valor']
        else:
            # Anomalia relativa para precipitação (%)
            anomaly = ((merged[variable] - merged['valor']) / merged['valor']) * 100
            anomaly = anomaly.replace([np.inf, -np.inf], np.nan)
        
        return anomaly
    
    def calculate_water_stress_index(
        self,
        df: pd.DataFrame,
        precip_col: str = 'prec_total',
        temp_col: str = 'temp_media',
        window_days: int = 30
    ) -> pd.Series:
        """
        Calcula índice de estresse hídrico simplificado
        
        Args:
            df: DataFrame com dados diários
            precip_col: Coluna de precipitação
            temp_col: Coluna de temperatura
            window_days: Janela de dias para cálculo
        
        Returns:
            Série com índice de estresse hídrico (0-1, onde 1 = estresse máximo)
        """
        df = df.copy()
        df = df.sort_values(['codigo_inmet', 'data'])
        
        def calc_stress_for_station(station_df):
            # Precipitação acumulada na janela
            precip_rolling = station_df[precip_col].rolling(window=window_days, min_periods=1).sum()
            
            # ET0 aproximada (fórmula simplificada de Thornthwaite)
            # ET0 ≈ 16 * (10 * T / I)^a, onde I é índice de calor anual
            # Para simplificar, usamos: ET0 ≈ 0.5 * T para T > 0
            et0_approx = np.where(station_df[temp_col] > 0, 0.5 * station_df[temp_col], 0)
            et0_rolling = pd.Series(et0_approx).rolling(window=window_days, min_periods=1).sum()
            
            # Balanço hídrico simplificado
            water_balance = precip_rolling - et0_rolling
            
            # Normaliza para índice 0-1 (0 = sem estresse, 1 = estresse máximo)
            # Assume que déficit > 100mm indica estresse alto
            stress_index = np.where(water_balance < 0, np.abs(water_balance) / 100, 0)
            stress_index = np.clip(stress_index, 0, 1)
            
            return pd.Series(stress_index, index=station_df.index)
        
        if 'codigo_inmet' in df.columns:
            stress_index = df.groupby('codigo_inmet', group_keys=False).apply(calc_stress_for_station)
        else:
            stress_index = calc_stress_for_station(df)
        
        return stress_index
    
    def detect_frost_events(
        self,
        df: pd.DataFrame,
        temp_min_col: str = 'temp_min',
        frost_threshold: float = 2.0
    ) -> pd.Series:
        """
        Detecta eventos de geada
        
        Args:
            df: DataFrame com dados diários
            temp_min_col: Coluna de temperatura mínima
            frost_threshold: Limite de temperatura para geada (°C)
        
        Returns:
            Série booleana indicando dias com geada
        """
        return df[temp_min_col] <= frost_threshold
    
    def calculate_growing_season_metrics(
        self,
        df: pd.DataFrame,
        crop: str = 'soja_grao',
        temp_col: str = 'temp_media',
        precip_col: str = 'prec_total'
    ) -> pd.DataFrame:
        """
        Calcula métricas da estação de crescimento
        
        Args:
            df: DataFrame com dados diários
            crop: Cultura de referência
            temp_col: Coluna de temperatura
            precip_col: Coluna de precipitação
        
        Returns:
            DataFrame com métricas agregadas por estação e safra
        """
        df = df.copy()
        df['data'] = pd.to_datetime(df['data'])
        df['ano'] = df['data'].dt.year
        df['mes'] = df['data'].dt.month
        
        # Define safra (simplificado: Oct-Mar = safra seguinte)
        df['ano_safra'] = np.where(df['mes'] >= 10, df['ano'] + 1, df['ano'])
        
        # Calcula graus-dia
        df['graus_dia'] = self.calculate_degree_days(df, temp_col, crop)
        
        # Detecta geadas
        df['geada'] = self.detect_frost_events(df, 'temp_min')
        
        # Calcula estresse hídrico
        df['estresse_hidrico'] = self.calculate_water_stress_index(df, precip_col, temp_col)
        
        # Agrega por estação e safra
        metrics = df.groupby(['codigo_inmet', 'ano_safra']).agg({
            'graus_dia': ['max', 'mean'],
            'temp_media': ['mean', 'min', 'max'],
            'temp_min': 'min',
            'temp_max': 'max',
            'prec_total': 'sum',
            'geada': 'sum',
            'estresse_hidrico': 'mean'
        }).round(2)
        
        # Flatten column names
        metrics.columns = ['_'.join(col).strip() for col in metrics.columns]
        metrics = metrics.reset_index()
        
        # Renomeia colunas para facilitar uso
        column_mapping = {
            'graus_dia_max': 'graus_dia_acumulado',
            'graus_dia_mean': 'graus_dia_medio_diario',
            'temp_media_mean': 'temp_media_safra',
            'temp_media_min': 'temp_media_min_safra',
            'temp_media_max': 'temp_media_max_safra',
            'temp_min_min': 'temp_min_absoluta',
            'temp_max_max': 'temp_max_absoluta',
            'prec_total_sum': 'precipitacao_total_safra',
            'geada_sum': 'dias_com_geada',
            'estresse_hidrico_mean': 'estresse_hidrico_medio'
        }
        
        metrics = metrics.rename(columns=column_mapping)
        metrics['cultura'] = crop
        
        return metrics
    
    def create_weather_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Cria features meteorológicas derivadas
        
        Args:
            df: DataFrame com dados diários
        
        Returns:
            DataFrame com features adicionais
        """
        df = df.copy()
        df = df.sort_values(['codigo_inmet', 'data'])
        
        # Rolling windows features
        for window in [7, 15, 30]:
            # Médias móveis
            df[f'temp_media_{window}d'] = df.groupby('codigo_inmet')['temp_media'].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
            
            df[f'prec_acum_{window}d'] = df.groupby('codigo_inmet')['prec_total'].transform(
                lambda x: x.rolling(window=window, min_periods=1).sum()
            )
            
            # Contagem de dias secos/chuvosos
            df[f'dias_secos_{window}d'] = df.groupby('codigo_inmet')['prec_total'].transform(
                lambda x: (x <= 1.0).rolling(window=window, min_periods=1).sum()
            )
            
            df[f'dias_chuva_{window}d'] = df.groupby('codigo_inmet')['prec_total'].transform(
                lambda x: (x > 10.0).rolling(window=window, min_periods=1).sum()
            )
        
        # Amplitude térmica diária
        if 'temp_max' in df.columns and 'temp_min' in df.columns:
            df['amplitude_termica'] = df['temp_max'] - df['temp_min']
        
        # Unidades de frio (dias com temperatura < 7°C)
        if 'temp_min' in df.columns:
            df['unidades_frio'] = (df['temp_min'] < 7.0).astype(int)
            df['unidades_frio_7d'] = df.groupby('codigo_inmet')['unidades_frio'].transform(
                lambda x: x.rolling(window=7, min_periods=1).sum()
            )
        
        # Índice de severidade de seca (SPI simplificado)
        # Usando desvio padronizado da precipitação em 90 dias
        df['prec_90d'] = df.groupby('codigo_inmet')['prec_total'].transform(
            lambda x: x.rolling(window=90, min_periods=30).sum()
        )
        
        df['spi_90d'] = df.groupby('codigo_inmet')['prec_90d'].transform(
            lambda x: (x - x.mean()) / x.std()
        )
        
        return df
    
    def generate_daily_summary(self, codigo_estacao: str, target_date: date) -> Dict:
        """
        Gera resumo meteorológico diário para uma estação
        
        Args:
            codigo_estacao: Código da estação
            target_date: Data alvo
        
        Returns:
            Dicionário com resumo meteorológico
        """
        try:
            # Carrega dados das séries diárias
            curated_file = Config.get_curated_path("inmet_series_diarias")
            if not curated_file.exists():
                return {"error": "Dados diários não disponíveis"}
            
            df = pd.read_parquet(curated_file)
            df = df[df['codigo_inmet'] == codigo_estacao]
            
            if df.empty:
                return {"error": f"Estação {codigo_estacao} não encontrada"}
            
            df['data'] = pd.to_datetime(df['data'])
            
            # Filtra data específica
            target_data = df[df['data'].dt.date == target_date]
            
            if target_data.empty:
                return {"error": f"Dados não disponíveis para {target_date}"}
            
            record = target_data.iloc[0]
            
            # Busca dados históricos (últimos 30 dias)
            start_date = target_date - timedelta(days=30)
            historical = df[
                (df['data'].dt.date >= start_date) & 
                (df['data'].dt.date <= target_date)
            ].copy()
            
            # Calcula features
            historical = self.create_weather_features(historical)
            current = historical[historical['data'].dt.date == target_date].iloc[0]
            
            summary = {
                "estacao": codigo_estacao,
                "data": target_date.isoformat(),
                "temperatura": {
                    "media": float(record.get('temp_media', 0)) if pd.notna(record.get('temp_media')) else None,
                    "maxima": float(record.get('temp_max', 0)) if pd.notna(record.get('temp_max')) else None,
                    "minima": float(record.get('temp_min', 0)) if pd.notna(record.get('temp_min')) else None,
                    "amplitude": float(current.get('amplitude_termica', 0)) if pd.notna(current.get('amplitude_termica')) else None,
                    "media_7d": float(current.get('temp_media_7d', 0)) if pd.notna(current.get('temp_media_7d')) else None
                },
                "precipitacao": {
                    "diaria": float(record.get('prec_total', 0)) if pd.notna(record.get('prec_total')) else None,
                    "acumulada_7d": float(current.get('prec_acum_7d', 0)) if pd.notna(current.get('prec_acum_7d')) else None,
                    "acumulada_30d": float(current.get('prec_acum_30d', 0)) if pd.notna(current.get('prec_acum_30d')) else None,
                    "dias_secos_7d": int(current.get('dias_secos_7d', 0)) if pd.notna(current.get('dias_secos_7d')) else None
                },
                "indices": {
                    "spi_90d": float(current.get('spi_90d', 0)) if pd.notna(current.get('spi_90d')) else None,
                    "unidades_frio_7d": int(current.get('unidades_frio_7d', 0)) if pd.notna(current.get('unidades_frio_7d')) else None,
                    "geada": bool(record.get('temp_min', 99) <= 2.0) if pd.notna(record.get('temp_min')) else None
                }
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Erro ao gerar resumo diário: {e}")
            return {"error": str(e)}
    
    def process_daily_features(self) -> str:
        """
        Processa todas as features diárias e salva arquivo enriquecido
        
        Returns:
            Caminho do arquivo processado
        """
        logger.info("Processando features meteorológicas diárias...")
        
        try:
            # Carrega dados diários
            curated_file = Config.get_curated_path("inmet_series_diarias")
            if not curated_file.exists():
                raise FileNotFoundError("Arquivo de séries diárias não encontrado")
            
            df = pd.read_parquet(curated_file)
            
            # Aplica transformações
            df = self.create_weather_features(df)
            
            # Calcula graus-dia para principais culturas
            for crop in ['soja_grao', 'milho_grao', 'trigo_grao']:
                col_name = f'graus_dia_{crop.replace("_grao", "")}'
                df[col_name] = self.calculate_degree_days(df, 'temp_media', crop)
            
            # Calcula índice de estresse hídrico
            df['estresse_hidrico'] = self.calculate_water_stress_index(df)
            
            # Detecta eventos de geada
            df['evento_geada'] = self.detect_frost_events(df)
            
            # Salva arquivo enriquecido
            enriched_file = Config.get_curated_path("inmet_series_diarias_features")
            df.to_parquet(enriched_file, index=False)
            
            logger.info(f"Features processadas e salvas em: {enriched_file}")
            logger.info(f"Total de registros: {len(df)}")
            logger.info(f"Estações processadas: {df['codigo_inmet'].nunique()}")
            
            return str(enriched_file)
            
        except Exception as e:
            logger.error(f"Erro ao processar features diárias: {e}")
            raise


# Funções de conveniência
def process_inmet_features() -> str:
    """Processa features meteorológicas INMET"""
    transformer = InmetTransformer()
    return transformer.process_daily_features()


def get_weather_summary(codigo_estacao: str, data: date) -> Dict:
    """Obtém resumo meteorológico para uma estação e data"""
    transformer = InmetTransformer()
    return transformer.generate_daily_summary(codigo_estacao, data)


def calculate_crop_degree_days(df: pd.DataFrame, crop: str) -> pd.Series:
    """Calcula graus-dia para uma cultura específica"""
    transformer = InmetTransformer()
    return transformer.calculate_degree_days(df, crop=crop)