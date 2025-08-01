"""
SQLAlchemy Models for SPR Agricultural Commodities System
Modelos de dados para análise de commodities agrícolas
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .connection import Base
import uuid
from datetime import datetime
from typing import Optional


class Commodity(Base):
    """Modelo para commodities agrícolas"""
    __tablename__ = "commodities"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), unique=True, index=True, nullable=False)  # Ex: SOJA, MILHO, BOI
    name = Column(String(100), nullable=False)  # Nome completo
    category = Column(String(50), nullable=False)  # grains, livestock, etc
    unit = Column(String(20), nullable=False)  # kg, arroba, saca, etc
    exchange = Column(String(50))  # B3, CME, etc
    active = Column(Boolean, default=True)
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    price_history = relationship("PriceHistory", back_populates="commodity")
    market_alerts = relationship("MarketAlert", back_populates="commodity")
    
    def __repr__(self):
        return f"<Commodity(symbol='{self.symbol}', name='{self.name}')>"


class PriceHistory(Base):
    """Histórico de preços de commodities"""
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, index=True)
    commodity_id = Column(Integer, ForeignKey("commodities.id"), nullable=False)
    
    # Dados de preço
    price = Column(Float, nullable=False)  # Preço principal
    price_open = Column(Float)  # Abertura
    price_high = Column(Float)  # Máxima
    price_low = Column(Float)   # Mínima
    price_close = Column(Float) # Fechamento
    volume = Column(Float)      # Volume negociado
    
    # Localização e fonte
    region = Column(String(100))  # Região/cidade
    state = Column(String(50))    # Estado
    source = Column(String(100))  # CEPEA, B3, etc
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    commodity = relationship("Commodity", back_populates="price_history")
    
    # Índices compostos para performance
    __table_args__ = (
        Index('idx_commodity_timestamp', 'commodity_id', 'timestamp'),
        Index('idx_commodity_region_timestamp', 'commodity_id', 'region', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<PriceHistory(commodity_id={self.commodity_id}, price={self.price}, timestamp='{self.timestamp}')>"


class WeatherData(Base):
    """Dados climáticos para análise de impacto nas commodities"""
    __tablename__ = "weather_data"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Localização
    station_id = Column(String(50), index=True)  # ID da estação INMET
    latitude = Column(Float)
    longitude = Column(Float)
    region = Column(String(100))
    state = Column(String(50))
    
    # Dados climáticos
    temperature = Column(Float)      # Temperatura (°C)
    humidity = Column(Float)         # Umidade relativa (%)
    precipitation = Column(Float)    # Precipitação (mm)
    wind_speed = Column(Float)       # Velocidade do vento (m/s)
    pressure = Column(Float)         # Pressão atmosférica (hPa)
    
    # Índices calculados
    ndvi = Column(Float)            # Índice de vegetação
    evapotranspiration = Column(Float)  # Evapotranspiração
    
    # Metadados
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String(100))    # INMET, NASA, etc
    
    # Índices para performance
    __table_args__ = (
        Index('idx_station_timestamp', 'station_id', 'timestamp'),
        Index('idx_region_timestamp', 'region', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<WeatherData(station_id='{self.station_id}', temp={self.temperature}, timestamp='{self.timestamp}')>"


class MarketAlert(Base):
    """Alertas de mercado e preços"""
    __tablename__ = "market_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    commodity_id = Column(Integer, ForeignKey("commodities.id"), nullable=False)
    
    # Configuração do alerta
    alert_type = Column(String(50), nullable=False)  # price_above, price_below, volatility, etc
    threshold_value = Column(Float, nullable=False)
    comparison_period = Column(Integer)  # Período de comparação em dias
    
    # Status
    active = Column(Boolean, default=True)
    triggered = Column(Boolean, default=False)
    last_triggered = Column(DateTime(timezone=True))
    
    # Dados do usuário
    user_phone = Column(String(20))  # WhatsApp
    user_email = Column(String(100))
    notification_method = Column(String(50))  # whatsapp, email, both
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    commodity = relationship("Commodity", back_populates="market_alerts")
    
    def __repr__(self):
        return f"<MarketAlert(commodity_id={self.commodity_id}, type='{self.alert_type}', threshold={self.threshold_value})>"


class GovernmentData(Base):
    """Dados governamentais (IBGE, CONAB, etc)"""
    __tablename__ = "government_data"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificação
    source = Column(String(50), nullable=False)  # IBGE, CONAB, MAPA
    dataset_type = Column(String(100), nullable=False)  # production, area, exports
    commodity = Column(String(50))
    
    # Localização
    region = Column(String(100))
    state = Column(String(50))
    municipality = Column(String(100))
    
    # Dados
    value = Column(Float, nullable=False)
    unit = Column(String(50))
    reference_period = Column(String(50))  # 2024/2025, Jan/2024, etc
    
    # Metadados detalhados
    data_metadata = Column(JSON)  # Dados adicionais em JSON
    
    # Controle
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Índices
    __table_args__ = (
        Index('idx_source_commodity_timestamp', 'source', 'commodity', 'timestamp'),
        Index('idx_source_type_region', 'source', 'dataset_type', 'region'),
    )
    
    def __repr__(self):
        return f"<GovernmentData(source='{self.source}', type='{self.dataset_type}', value={self.value})>"


class PricePrediction(Base):
    """Previsões de preços geradas pelos modelos de ML"""
    __tablename__ = "price_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    commodity_id = Column(Integer, ForeignKey("commodities.id"), nullable=False)
    
    # Previsão
    predicted_price = Column(Float, nullable=False)
    confidence_score = Column(Float)  # 0-1 score de confiança
    prediction_horizon = Column(Integer)  # Dias à frente
    
    # Modelo utilizado
    model_name = Column(String(100))
    model_version = Column(String(50))
    features_used = Column(JSON)  # Features utilizadas
    
    # Intervalos de confiança
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    
    # Metadados
    prediction_date = Column(DateTime(timezone=True), nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Status
    validated = Column(Boolean, default=False)
    actual_price = Column(Float)  # Preço real (quando disponível)
    
    # Relacionamentos
    commodity = relationship("Commodity")
    
    # Índices
    __table_args__ = (
        Index('idx_commodity_prediction_date', 'commodity_id', 'prediction_date'),
        Index('idx_commodity_target_date', 'commodity_id', 'target_date'),
    )
    
    def __repr__(self):
        return f"<PricePrediction(commodity_id={self.commodity_id}, price={self.predicted_price}, target='{self.target_date}')>"


class WhatsAppUser(Base):
    """Usuários do sistema WhatsApp"""
    __tablename__ = "whatsapp_users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identificação
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100))
    user_type = Column(String(50))  # producer, trader, analyst, admin
    
    # Preferências
    preferred_commodities = Column(JSON)  # Lista de commodities de interesse
    notification_frequency = Column(String(50))  # daily, weekly, on_alert
    active = Column(Boolean, default=True)
    
    # Localização (opcional)
    region = Column(String(100))
    state = Column(String(50))
    
    # Controle
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_interaction = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<WhatsAppUser(phone='{self.phone_number}', name='{self.name}')>"


# Importar modelos de broadcast
from .broadcast_models import (
    BroadcastGroup,
    BroadcastCampaign, 
    BroadcastApproval,
    BroadcastRecipient,
    BroadcastLog,
    BroadcastStatus,
    ApprovalStatus,
    log_broadcast_action
)