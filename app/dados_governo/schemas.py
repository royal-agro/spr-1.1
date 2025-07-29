"""
SPR 1.1 - Schemas Pydantic para validação de dados
Modelos de dados para todos os conectores
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
import pandas as pd


class BaseSchema(BaseModel):
    """Schema base com configurações comuns"""
    
    class Config:
        # Permite usar datetime objects
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }
        # Valida campos na atribuição
        validate_assignment = True
        # Permite campos extras para flexibilidade
        extra = "allow"


class ProvenanceInfo(BaseSchema):
    """Informações de proveniência de dados"""
    fonte: str = Field(..., description="Fonte dos dados (INMET, MAPA, CONAB)")
    dataset: str = Field(..., description="Nome do dataset")
    recurso: Optional[str] = Field(None, description="ID do recurso específico")
    url_origem: str = Field(..., description="URL de origem dos dados")
    last_modified: Optional[datetime] = Field(None, description="Data de última modificação")
    hash_conteudo: str = Field(..., description="Hash SHA256 do conteúdo")
    versao_schema: str = Field(default="1.0", description="Versão do schema utilizado")
    coleta_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp da coleta")


# SCHEMAS INMET

class InmetEstacao(BaseSchema):
    """Estação meteorológica INMET"""
    codigo_inmet: str = Field(..., description="Código da estação INMET")
    tipo: str = Field(..., description="Tipo da estação (T=automática, M=manual)")
    uf: str = Field(..., max_length=2, description="Unidade federativa")
    nome: str = Field(..., description="Nome da estação")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")
    altitude: Optional[float] = Field(None, description="Altitude em metros")
    situacao: str = Field(..., description="Situação operacional")
    inicio_operacao: Optional[date] = Field(None, description="Data início operação")
    fim_operacao: Optional[date] = Field(None, description="Data fim operação")
    
    @validator('uf')
    def validate_uf(cls, v):
        from core.config import ESTADOS_BRASIL
        if v.upper() not in ESTADOS_BRASIL:
            raise ValueError(f"UF inválida: {v}")
        return v.upper()


class InmetSerieHoraria(BaseSchema):
    """Série horária meteorológica INMET"""
    codigo_inmet: str = Field(..., description="Código da estação")
    dt_utc: datetime = Field(..., description="Data/hora UTC")
    dt_local: datetime = Field(..., description="Data/hora local")
    
    # Variáveis meteorológicas principais
    TEMPAR: Optional[float] = Field(None, description="Temperatura do ar (°C)")
    TEMPMAX: Optional[float] = Field(None, description="Temperatura máxima (°C)")
    TEMPMIN: Optional[float] = Field(None, description="Temperatura mínima (°C)")
    UMIREL: Optional[float] = Field(None, ge=0, le=100, description="Umidade relativa (%)")
    PREC: Optional[float] = Field(None, ge=0, description="Precipitação (mm)")
    VENTO: Optional[float] = Field(None, ge=0, description="Velocidade do vento (m/s)")
    PRESSAO: Optional[float] = Field(None, description="Pressão atmosférica (hPa)")
    RADIACAO: Optional[float] = Field(None, description="Radiação solar (kJ/m²)")
    
    # Controle de qualidade
    qualidade: Optional[str] = Field(None, description="Indicador de qualidade")
    
    @validator('dt_local')
    def validate_dt_local(cls, v, values):
        # Verifica se dt_local é coerente com dt_utc
        if 'dt_utc' in values and values['dt_utc']:
            from core.utils import DateUtils
            expected_local = DateUtils.to_local(values['dt_utc'])
            # Permite diferença de até 1 hora (ajustes de horário de verão)
            diff = abs((v - expected_local).total_seconds())
            if diff > 3600:
                raise ValueError("dt_local inconsistente com dt_utc")
        return v


class InmetSerieDiaria(BaseSchema):
    """Série diária meteorológica (agregada ou direta)"""
    codigo_inmet: str = Field(..., description="Código da estação")
    data: date = Field(..., description="Data")
    
    # Temperaturas
    temp_media: Optional[float] = Field(None, description="Temperatura média (°C)")
    temp_max: Optional[float] = Field(None, description="Temperatura máxima (°C)")
    temp_min: Optional[float] = Field(None, description="Temperatura mínima (°C)")
    
    # Precipitação
    prec_total: Optional[float] = Field(None, ge=0, description="Precipitação total (mm)")
    
    # Umidade e vento
    umid_media: Optional[float] = Field(None, ge=0, le=100, description="Umidade relativa média (%)")
    vento_medio: Optional[float] = Field(None, ge=0, description="Velocidade média do vento (m/s)")
    
    # Features derivadas
    graus_dia_soja: Optional[float] = Field(None, description="Graus-dia acumulados soja (base 10°C)")
    graus_dia_milho: Optional[float] = Field(None, description="Graus-dia acumulados milho (base 10°C)")
    graus_dia_trigo: Optional[float] = Field(None, description="Graus-dia acumulados trigo (base 4°C)")
    
    # Anomalias (vs normal 1991-2020)
    anomalia_temp: Optional[float] = Field(None, description="Anomalia temperatura (°C)")
    anomalia_prec: Optional[float] = Field(None, description="Anomalia precipitação (%)")


class InmetNormais(BaseSchema):
    """Normais climatológicas INMET"""
    codigo_inmet: str = Field(..., description="Código da estação")
    periodo: str = Field(..., description="Período das normais (ex: 1991-2020)")
    variavel: str = Field(..., description="Variável meteorológica")
    mes: int = Field(..., ge=1, le=12, description="Mês (1-12)")
    valor: float = Field(..., description="Valor da normal")
    unidade: str = Field(..., description="Unidade de medida")


# SCHEMAS MAPA-CKAN

class ZarcTabua(BaseSchema):
    """Tábua de risco ZARC"""
    cultura: str = Field(..., description="Cultura")
    uf: str = Field(..., max_length=2, description="UF")
    municipio: Optional[str] = Field(None, description="Município")
    grupo_solo: Optional[str] = Field(None, description="Grupo de solo")
    risco: int = Field(..., description="Nível de risco (20, 30, 40)")
    data_inicio: date = Field(..., description="Data início plantio")
    data_fim: date = Field(..., description="Data fim plantio")
    safra: Optional[str] = Field(None, description="Safra")
    
    @validator('risco')
    def validate_risco(cls, v):
        if v not in [20, 30, 40]:
            raise ValueError("Risco deve ser 20, 30 ou 40")
        return v


class SiszarcCultivar(BaseSchema):
    """Cultivar SISZARC"""
    safra: str = Field(..., description="Safra")
    cultura: str = Field(..., description="Cultura")
    obtentor: str = Field(..., description="Obtentor/empresa")
    uf: str = Field(..., max_length=2, description="UF")
    grupo: Optional[str] = Field(None, description="Grupo de maturação")
    regiao_adaptacao: Optional[str] = Field(None, description="Região de adaptação")
    cultivar: str = Field(..., description="Nome da cultivar")


class AgrofitProduto(BaseSchema):
    """Produto Agrofit"""
    registro: str = Field(..., description="Número de registro")
    produto: str = Field(..., description="Nome comercial")
    ingrediente_ativo: str = Field(..., description="Ingrediente ativo")
    classe_tox: Optional[str] = Field(None, description="Classe toxicológica")
    alvo: Optional[str] = Field(None, description="Praga/doença alvo")
    cultura: Optional[str] = Field(None, description="Cultura")
    empresa: str = Field(..., description="Empresa registrante")
    cnpj: Optional[str] = Field(None, description="CNPJ da empresa")
    situacao: str = Field(..., description="Situação do registro")
    data_registro: Optional[date] = Field(None, description="Data do registro")
    data_situacao: Optional[date] = Field(None, description="Data da situação atual")


class SipeagroEstabelecimento(BaseSchema):
    """Estabelecimento SIPEAGRO"""
    cnpj: str = Field(..., description="CNPJ")
    razao_social: str = Field(..., description="Razão social")
    categoria: str = Field(..., description="Categoria do estabelecimento")
    uf: str = Field(..., max_length=2, description="UF")
    municipio: str = Field(..., description="Município")
    ibge_municipio: Optional[int] = Field(None, description="Código IBGE do município")
    situacao: str = Field(..., description="Situação")


class SigefCampo(BaseSchema):
    """Campo de produção de sementes SIGEF"""
    safra: str = Field(..., description="Safra")
    especie: str = Field(..., description="Espécie")
    uf: str = Field(..., max_length=2, description="UF") 
    municipio: str = Field(..., description="Município")
    area_ha: float = Field(..., ge=0, description="Área em hectares")
    produtor: Optional[str] = Field(None, description="Nome do produtor")
    variedade: Optional[str] = Field(None, description="Variedade/cultivar")


class CnpoProdutor(BaseSchema):
    """Produtor orgânico CNPO"""
    identificador: str = Field(..., description="Identificador único")
    nome: str = Field(..., description="Nome do produtor/entidade")
    uf: str = Field(..., max_length=2, description="UF")
    municipio: str = Field(..., description="Município")
    escopo: str = Field(..., description="Escopo da certificação")
    situacao: str = Field(..., description="Situação")


class SifEstabelecimento(BaseSchema):
    """Estabelecimento SIF"""
    sif_codigo: str = Field(..., description="Código SIF")
    cnpj: Optional[str] = Field(None, description="CNPJ")
    razao_social: str = Field(..., description="Razão social")
    uf: str = Field(..., max_length=2, description="UF")
    municipio: str = Field(..., description="Município")
    atividade: str = Field(..., description="Atividade principal")
    situacao: str = Field(..., description="Situação")
    habilitacoes_exportacao: Optional[List[str]] = Field(default_factory=list, description="Países habilitados para exportação")


class SifAbates(BaseSchema):
    """Relatório de abates SIF"""
    ano: int = Field(..., ge=2000, description="Ano")
    mes: int = Field(..., ge=1, le=12, description="Mês")
    uf: str = Field(..., max_length=2, description="UF")
    especie: str = Field(..., description="Espécie animal")
    categoria: str = Field(..., description="Categoria (macho, fêmea, etc.)")
    quantidade: int = Field(..., ge=0, description="Quantidade de animais abatidos")


# SCHEMAS CONAB

class ConabSafrasGraos(BaseSchema):
    """Safras de grãos CONAB"""
    ano_safra: str = Field(..., description="Ano safra (ex: 2023/24)")
    produto: str = Field(..., description="Produto")
    uf: str = Field(..., max_length=2, description="UF")
    regiao: Optional[str] = Field(None, description="Região")
    producao_t: float = Field(..., ge=0, description="Produção em toneladas")
    area_ha: float = Field(..., ge=0, description="Área em hectares")
    produtividade_kg_ha: float = Field(..., ge=0, description="Produtividade em kg/ha")
    
    @validator('produtividade_kg_ha')
    def validate_produtividade(cls, v, values):
        # Validação básica de coerência
        if 'producao_t' in values and 'area_ha' in values:
            if values['area_ha'] > 0:
                calc_prod = (values['producao_t'] * 1000) / values['area_ha']
                # Permite 5% de diferença (arredondamentos)
                if abs(calc_prod - v) > (v * 0.05):
                    raise ValueError("Produtividade inconsistente com produção/área")
        return v


class ConabPrecos(BaseSchema):
    """Preços agropecuários CONAB"""
    data: date = Field(..., description="Data da cotação")
    produto: str = Field(..., description="Produto")
    nivel: str = Field(..., description="Nível de comercialização")
    uf: str = Field(..., max_length=2, description="UF")
    municipio: Optional[str] = Field(None, description="Município")
    preco: float = Field(..., ge=0, description="Preço observado")
    unidade_original: str = Field(..., description="Unidade original")
    preco_rs_kg: float = Field(..., ge=0, description="Preço em R$/kg")
    
    @validator('nivel')
    def validate_nivel(cls, v):
        niveis_validos = ['produtor', 'atacado', 'varejo']
        if v.lower() not in niveis_validos:
            raise ValueError(f"Nível deve ser um de: {niveis_validos}")
        return v.lower()


class ConabPgpm(BaseSchema):
    """Preços mínimos PGPM"""
    produto: str = Field(..., description="Produto")
    uf_regiao: str = Field(..., description="UF ou região de aplicação")
    vigencia_inicio: date = Field(..., description="Início da vigência")
    vigencia_fim: date = Field(..., description="Fim da vigência")
    preco_minimo: float = Field(..., ge=0, description="Preço mínimo")
    unidade: str = Field(..., description="Unidade do preço")


class ConabPgpmMonitor(BaseSchema):
    """Monitor de situação PGPM"""
    data: date = Field(..., description="Data da avaliação")
    produto: str = Field(..., description="Produto")
    uf: str = Field(..., max_length=2, description="UF")
    preco_observado: float = Field(..., ge=0, description="Preço observado")
    preco_minimo: float = Field(..., ge=0, description="Preço mínimo vigente")
    razao: float = Field(..., description="Razão preço obs / preço mín")
    situacao: str = Field(..., description="Situação (desfavoravel/alerta/favoravel)")
    
    @validator('situacao')
    def validate_situacao(cls, v):
        situacoes_validas = ['desfavoravel', 'alerta', 'favoravel']
        if v.lower() not in situacoes_validas:
            raise ValueError(f"Situação deve ser uma de: {situacoes_validas}")
        return v.lower()
    
    @validator('razao')
    def calc_razao(cls, v, values):
        if 'preco_observado' in values and 'preco_minimo' in values:
            if values['preco_minimo'] > 0:
                calc_razao = values['preco_observado'] / values['preco_minimo']
                # Permite pequena diferença de arredondamento
                if abs(calc_razao - v) > 0.01:
                    raise ValueError("Razão inconsistente com preços")
        return v


class ConabCustos(BaseSchema):
    """Custos de produção CONAB"""
    ano: int = Field(..., ge=2000, description="Ano")
    produto: str = Field(..., description="Produto/cadeia")
    uf: Optional[str] = Field(None, max_length=2, description="UF")
    regiao: Optional[str] = Field(None, description="Região")
    indicador: str = Field(..., description="Tipo de indicador de custo")
    valor: float = Field(..., description="Valor do indicador")
    unidade: str = Field(..., description="Unidade")


class ConabEstoquesPublicos(