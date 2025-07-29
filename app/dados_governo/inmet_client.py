"""
SPR 1.1 - Cliente INMET API
Cliente para API apitempo.inmet.gov.br
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, AsyncGenerator
import httpx
import pandas as pd
from tenacity import retry, stop_after_attempt, wait_exponential

from core.config import Config
from core.utils import HttpClient, DateUtils, chunked_date_range
from core.logging_conf import get_module_logger
from core.schemas import InmetEstacao, InmetSerieHoraria, InmetSerieDiaria

logger = get_module_logger("inmet.client")


class InmetAPIError(Exception):
    """Exceção específica para erros da API INMET"""
    pass


class InmetClient:
    """Cliente para API INMET"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or Config.INMET_BASE
        self.http_client = HttpClient()
        
        # Cache para evitar requisições repetidas
        self._estacoes_cache: Optional[List[Dict]] = None
        self._parametros_cache: Optional[List[Dict]] = None
        self._datas_cache: Optional[List[str]] = None
    
    def get_estacoes_automaticas(self, force_refresh: bool = False) -> List[Dict]:
        """Obtém lista de estações automáticas"""
        if self._estacoes_cache and not force_refresh:
            return [e for e in self._estacoes_cache if e.get('tipo') == 'T']
        
        logger.info("Buscando estações automáticas...")
        
        try:
            response = self.http_client.get(f"{self.base_url}/estacoes/T")
            estacoes = response.json()
            
            if not isinstance(estacoes, list):
                raise InmetAPIError("Resposta inválida para estações automáticas")
            
            # Padroniza campos
            for estacao in estacoes:
                estacao['tipo'] = 'T'
                
                # Converte coordenadas para float
                if 'lat' in estacao:
                    estacao['lat'] = float(estacao['lat'])
                if 'lon' in estacao:
                    estacao['lon'] = float(estacao['lon'])
            
            logger.info(f"Encontradas {len(estacoes)} estações automáticas")
            return estacoes
            
        except Exception as e:
            logger.error(f"Erro ao buscar estações automáticas: {e}")
            raise InmetAPIError(f"Falha ao obter estações automáticas: {e}")
    
    def get_estacoes_manuais(self, force_refresh: bool = False) -> List[Dict]:
        """Obtém lista de estações manuais/convencionais"""
        logger.info("Buscando estações manuais...")
        
        try:
            response = self.http_client.get(f"{self.base_url}/estacoes/M")
            estacoes = response.json()
            
            if not isinstance(estacoes, list):
                raise InmetAPIError("Resposta inválida para estações manuais")
            
            # Padroniza campos
            for estacao in estacoes:
                estacao['tipo'] = 'M'
                
                # Converte coordenadas para float
                if 'lat' in estacao:
                    estacao['lat'] = float(estacao['lat'])
                if 'lon' in estacao:
                    estacao['lon'] = float(estacao['lon'])
            
            logger.info(f"Encontradas {len(estacoes)} estações manuais")
            return estacoes
            
        except Exception as e:
            logger.error(f"Erro ao buscar estações manuais: {e}")
            raise InmetAPIError(f"Falha ao obter estações manuais: {e}")
    
    def get_todas_estacoes(self, force_refresh: bool = False) -> List[Dict]:
        """Obtém todas as estações (automáticas + manuais)"""
        if self._estacoes_cache and not force_refresh:
            return self._estacoes_cache
        
        automaticas = self.get_estacoes_automaticas(force_refresh)
        manuais = self.get_estacoes_manuais(force_refresh)
        
        todas = automaticas + manuais
        self._estacoes_cache = todas
        
        logger.info(f"Total de estações: {len(todas)} ({len(automaticas)} automáticas + {len(manuais)} manuais)")
        return todas
    
    def get_parametros_disponiveis(self) -> List[Dict]:
        """Obtém parâmetros meteorológicos disponíveis"""
        if self._parametros_cache:
            return self._parametros_cache
        
        logger.info("Buscando parâmetros disponíveis...")
        
        try:
            response = self.http_client.get(f"{self.base_url}/parametros/CondicoesRegistradas")
            parametros = response.json()
            
            if not isinstance(parametros, list):
                # Se não retornar lista, assume parâmetros padrão
                parametros = [
                    {"codigo": "TEMPAR", "nome": "Temperatura do Ar", "unidade": "°C"},
                    {"codigo": "TEMPMAX", "nome": "Temperatura Máxima", "unidade": "°C"},
                    {"codigo": "TEMPMIN", "nome": "Temperatura Mínima", "unidade": "°C"},
                    {"codigo": "UMIREL", "nome": "Umidade Relativa", "unidade": "%"},
                    {"codigo": "PREC", "nome": "Precipitação", "unidade": "mm"},
                    {"codigo": "VENTO", "nome": "Velocidade do Vento", "unidade": "m/s"},
                ]
                logger.warning("Usando parâmetros padrão")
            
            self._parametros_cache = parametros
            logger.info(f"Parâmetros disponíveis: {[p.get('codigo', p) for p in parametros]}")
            return parametros
            
        except Exception as e:
            logger.error(f"Erro ao buscar parâmetros: {e}")
            # Retorna parâmetros padrão em caso de erro
            return [
                {"codigo": "TEMPAR", "nome": "Temperatura do Ar", "unidade": "°C"},
                {"codigo": "TEMPMAX", "nome": "Temperatura Máxima", "unidade": "°C"},
                {"codigo": "TEMPMIN", "nome": "Temperatura Mínima", "unidade": "°C"},
                {"codigo": "UMIREL", "nome": "Umidade Relativa", "unidade": "%"},
                {"codigo": "PREC", "nome": "Precipitação", "unidade": "mm"},
                {"codigo": "VENTO", "nome": "Velocidade do Vento", "unidade": "m/s"},
            ]
    
    def get_datas_disponiveis(self) -> List[str]:
        """Obtém datas com dados disponíveis"""
        if self._datas_cache:
            return self._datas_cache
        
        logger.info("Buscando datas disponíveis...")
        
        try:
            response = self.http_client.get(f"{self.base_url}/datas/CondicoesRegistradas")
            datas = response.json()
            
            if isinstance(datas, list):
                self._datas_cache = datas
                logger.info(f"Datas disponíveis: {len(datas)} datas")
                return datas
            else:
                logger.warning("Formato de resposta inesperado para datas")
                return []
                
        except Exception as e:
            logger.error(f"Erro ao buscar datas disponíveis: {e}")
            return []
    
    def get_series_horarias(
        self,
        codigo_estacao: str,
        data_inicio: date,
        data_fim: date,
        parametros: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Obtém séries horárias para uma estação e período
        
        Args:
            codigo_estacao: Código da estação INMET
            data_inicio: Data inicial
            data_fim: Data final
            parametros: Lista de parâmetros (None = todos)
        
        Returns:
            Lista de registros horários
        """
        logger.info(f"Buscando séries horárias para {codigo_estacao}: {data_inicio} a {data_fim}")
        
        # Divide período em chunks menores se necessário (evita timeout)
        date_chunks = chunked_date_range(data_inicio, data_fim, chunk_weeks=2)
        
        all_data = []
        
        for chunk_start, chunk_end in date_chunks:
            chunk_data = self._get_series_chunk(
                codigo_estacao, 
                chunk_start, 
                chunk_end, 
                freq='H',
                parametros=parametros
            )
            all_data.extend(chunk_data)
            
            # Rate limiting entre chunks
            if len(date_chunks) > 1:
                asyncio.sleep(1)
        
        logger.info(f"Coletados {len(all_data)} registros horários para {codigo_estacao}")
        return all_data
    
    def get_series_diarias(
        self,
        codigo_estacao: str,
        data_inicio: date,
        data_fim: date,
        parametros: Optional[List[str]] = None
    ) -> List[Dict]:
        """Obtém séries diárias para uma estação e período"""
        logger.info(f"Buscando séries diárias para {codigo_estacao}: {data_inicio} a {data_fim}")
        
        # Tenta endpoint diário primeiro, se não existir usa agregação de horários
        try:
            date_chunks = chunked_date_range(data_inicio, data_fim, chunk_weeks=4)
            all_data = []
            
            for chunk_start, chunk_end in date_chunks:
                chunk_data = self._get_series_chunk(
                    codigo_estacao,
                    chunk_start,
                    chunk_end,
                    freq='D',
                    parametros=parametros
                )
                all_data.extend(chunk_data)
            
            logger.info(f"Coletados {len(all_data)} registros diários para {codigo_estacao}")
            return all_data
            
        except Exception as e:
            logger.warning(f"Endpoint diário falhou, agregando dados horários: {e}")
            
            # Fallback: agrega dados horários
            hourly_data = self.get_series_horarias(codigo_estacao, data_inicio, data_fim, parametros)
            daily_data = self._aggregate_hourly_to_daily(hourly_data)
            
            logger.info(f"Agregados {len(daily_data)} registros diários de dados horários")
            return daily_data
    
    def _get_series_chunk(
        self,
        codigo_estacao: str,
        data_inicio: date,
        data_fim: date,
        freq: str = 'H',
        parametros: Optional[List[str]] = None
    ) -> List[Dict]:
        """Obtém chunk de dados para um período específico"""
        
        # Constrói URL base - pode variar dependendo da API
        if freq == 'H':
            base_endpoint = "condicoes/horarias"  # Endpoint hipotético
        else:
            base_endpoint = "condicoes/diarias"   # Endpoint hipotético
        
        # Tenta diferentes formatos de endpoint
        possible_urls = [
            f"{self.base_url}/{base_endpoint}/{codigo_estacao}/{data_inicio.isoformat()}/{data_fim.isoformat()}",
            f"{self.base_url}/condicoes/{codigo_estacao}?inicio={data_inicio.isoformat()}&fim={data_fim.isoformat()}&freq={freq}",
            f"{self.base_url}/dados/{codigo_estacao}/{data_inicio.strftime('%Y%m%d')}/{data_fim.strftime('%Y%m%d')}"
        ]
        
        for url in possible_urls:
            try:
                logger.debug(f"Tentando URL: {url}")
                response = self.http_client.get(url)
                data = response.json()
                
                if isinstance(data, list) and data:
                    # Processa e padroniza dados
                    processed_data = []
                    for record in data:
                        processed_record = self._process_weather_record(record, codigo_estacao)
                        if processed_record:
                            processed_data.append(processed_record)
                    
                    return processed_data
                    
            except Exception as e:
                logger.debug(f"URL {url} falhou: {e}")
                continue
        
        # Se todos os endpoints falharam, retorna lista vazia
        logger.warning(f"Nenhum endpoint funcionou para {codigo_estacao} {data_inicio}-{data_fim}")
        return []
    
    def _process_weather_record(self, record: Dict, codigo_estacao: str) -> Optional[Dict]:
        """Processa e padroniza registro meteorológico"""
        try:
            # Extrai timestamp
            dt_str = record.get('data') or record.get('timestamp') or record.get('datetime')
            if not dt_str:
                return None
            
            # Parse do datetime
            if isinstance(dt_str, str):
                dt_utc = DateUtils.parse_date_flexible(dt_str)
                if dt_utc is None:
                    return None
                if isinstance(dt_utc, date):
                    dt_utc = datetime.combine(dt_utc, datetime.min.time())
                dt_utc = DateUtils.to_utc(dt_utc)
            else:
                dt_utc = dt_str
            
            dt_local = DateUtils.to_local(dt_utc)
            
            # Extrai variáveis meteorológicas
            processed = {
                'codigo_inmet': codigo_estacao,
                'dt_utc': dt_utc,
                'dt_local': dt_local,
                'TEMPAR': self._safe_float(record.get('temperatura') or record.get('TEMPAR')),
                'TEMPMAX': self._safe_float(record.get('temp_max') or record.get('TEMPMAX')),
                'TEMPMIN': self._safe_float(record.get('temp_min') or record.get('TEMPMIN')),
                'UMIREL': self._safe_float(record.get('umidade') or record.get('UMIREL')),
                'PREC': self._safe_float(record.get('precipitacao') or record.get('PREC')),
                'VENTO': self._safe_float(record.get('vento') or record.get('VENTO')),
                'PRESSAO': self._safe_float(record.get('pressao') or record.get('PRESSAO')),
                'RADIACAO': self._safe_float(record.get('radiacao') or record.get('RADIACAO'))
            }
            
            # Remove valores None para economizar espaço
            processed = {k: v for k, v in processed.items() if v is not None}
            
            return processed
            
        except Exception as e:
            logger.warning(f"Erro ao processar registro: {e}")
            return None
    
    def _safe_float(self, value) -> Optional[float]:
        """Converte valor para float de forma segura"""
        if value is None or value == '':
            return None
        
        try:
            if isinstance(value, str):
                # Remove espaços e converte vírgula para ponto
                value = value.strip().replace(',', '.')
                if value == '' or value.lower() in ['null', 'nan', 'n/a']:
                    return None
            
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _aggregate_hourly_to_daily(self, hourly_data: List[Dict]) -> List[Dict]:
        """Agrega dados horários para diários"""
        if not hourly_data:
            return []
        
        df = pd.DataFrame(hourly_data)
        
        # Extrai data do datetime
        df['date'] = pd.to_datetime(df['dt_local']).dt.date
        
        # Agrega por data
        daily_agg = df.groupby(['codigo_inmet', 'date']).agg({
            'TEMPAR': 'mean',
            'TEMPMAX': 'max',
            'TEMPMIN': 'min',
            'UMIREL': 'mean',
            'PREC': 'sum',
            'VENTO': 'mean',
            'PRESSAO': 'mean',
            'RADIACAO': 'sum'
        }).reset_index()
        
        # Converte para lista de dicts
        daily_records = []
        for _, row in daily_agg.iterrows():
            record = {
                'codigo_inmet': row['codigo_inmet'],
                'data': row['date'],
                'temp_media': row['TEMPAR'] if pd.notna(row['TEMPAR']) else None,
                'temp_max': row['TEMPMAX'] if pd.notna(row['TEMPMAX']) else None,
                'temp_min': row['TEMPMIN'] if pd.notna(row['TEMPMIN']) else None,
                'umid_media': row['UMIREL'] if pd.notna(row['UMIREL']) else None,
                'prec_total': row['PREC'] if pd.notna(row['PREC']) else None,
                'vento_medio': row['VENTO'] if pd.notna(row['VENTO']) else None,
            }
            
            # Remove valores None
            record = {k: v for k, v in record.items() if v is not None}
            daily_records.append(record)
        
        return daily_records
    
    def get_normais_climatologicas(self) -> List[Dict]:
        """Obtém normais climatológicas disponíveis"""
        logger.info("Buscando normais climatológicas...")
        
        try:
            response = self.http_client.get(f"{self.base_url}/normais")
            normais = response.json()
            
            if isinstance(normais, list):
                logger.info(f"Encontradas {len(normais)} normais climatológicas")
                return normais
            else:
                logger.warning("Formato inesperado para normais climatológicas")
                return []
                
        except Exception as e:
            logger.error(f"Erro ao buscar normais climatológicas: {e}")
            return []
    
    def get_estacoes_por_uf(self, uf: str) -> List[Dict]:
        """Filtra estações por UF"""
        todas_estacoes = self.get_todas_estacoes()
        estacoes_uf = [e for e in todas_estacoes if e.get('uf', '').upper() == uf.upper()]
        
        logger.info(f"Encontradas {len(estacoes_uf)} estações em {uf}")
        return estacoes_uf
    
    def get_estacao_por_codigo(self, codigo: str) -> Optional[Dict]:
        """Busca estação específica por código"""
        todas_estacoes = self.get_todas_estacoes()
        
        for estacao in todas_estacoes:
            if estacao.get('codigo') == codigo or estacao.get('codigo_inmet') == codigo:
                return estacao
        
        return None
    
    def validate_date_range(self, data_inicio: date, data_fim: date) -> Tuple[date, date]:
        """Valida e ajusta período solicitado"""
        hoje = date.today()
        
        # Não permite datas futuras
        if data_inicio > hoje:
            data_inicio = hoje
        if data_fim > hoje:
            data_fim = hoje
        
        # Não permite períodos muito longos (> 2 anos)
        if (data_fim - data_inicio).days > 730:
            logger.warning(f"Período muito longo, limitando a 2 anos a partir de {data_inicio