"""
Database Services for SPR Multi-Agent System
Serviços de banco de dados para uso pelos agentes especializados
"""

import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
import json

from .connection import db_manager
from .models import (
    Commodity, PriceHistory, WeatherData, MarketAlert,
    GovernmentData, PricePrediction, WhatsAppUser
)

logger = logging.getLogger(__name__)


class CommodityService:
    """Serviço para operações com commodities - usado pelo agente Backend Python"""
    
    @staticmethod
    def get_all_commodities(session: Session, active_only: bool = True) -> List[Commodity]:
        """Lista todas as commodities"""
        query = session.query(Commodity)
        if active_only:
            query = query.filter(Commodity.active == True)
        return query.all()
    
    @staticmethod
    def get_commodity_by_symbol(session: Session, symbol: str) -> Optional[Commodity]:
        """Busca commodity por símbolo"""
        return session.query(Commodity).filter(Commodity.symbol == symbol).first()
    
    @staticmethod
    def create_commodity(session: Session, commodity_data: Dict[str, Any]) -> Commodity:
        """Cria nova commodity"""
        commodity = Commodity(**commodity_data)
        session.add(commodity)
        session.commit()
        session.refresh(commodity)
        return commodity


class PriceService:
    """Serviço para operações com preços - usado pelo agente Financial Modeling"""
    
    @staticmethod
    def add_price_data(session: Session, price_data: Dict[str, Any]) -> PriceHistory:
        """Adiciona novo dado de preço"""
        price_record = PriceHistory(**price_data)
        session.add(price_record)
        session.commit()
        session.refresh(price_record)
        
        # Invalidar cache
        cache_key = f"prices:{price_data.get('commodity_id')}:{price_data.get('region', 'all')}"
        db_manager.cache_delete(cache_key)
        
        return price_record
    
    @staticmethod
    def get_latest_prices(session: Session, commodity_id: int, region: Optional[str] = None, limit: int = 10) -> List[PriceHistory]:
        """Obtém preços mais recentes de uma commodity"""
        cache_key = f"latest_prices:{commodity_id}:{region}:{limit}"
        
        # Tentar cache primeiro
        cached = db_manager.cache_get(cache_key)
        if cached:
            logger.info(f"📊 Cache hit para preços: {cache_key}")
        
        query = session.query(PriceHistory).filter(PriceHistory.commodity_id == commodity_id)
        
        if region:
            query = query.filter(PriceHistory.region == region)
        
        prices = query.order_by(desc(PriceHistory.timestamp)).limit(limit).all()
        
        # Cache por 5 minutos
        if prices:
            price_data = [{"price": p.price, "timestamp": p.timestamp.isoformat()} for p in prices]
            db_manager.cache_set(cache_key, json.dumps(price_data), 300)
        
        return prices
    
    @staticmethod
    def get_price_history(session: Session, commodity_id: int, days: int = 30, region: Optional[str] = None) -> List[PriceHistory]:
        """Obtém histórico de preços"""
        start_date = datetime.now() - timedelta(days=days)
        
        query = session.query(PriceHistory).filter(
            and_(
                PriceHistory.commodity_id == commodity_id,
                PriceHistory.timestamp >= start_date
            )
        )
        
        if region:
            query = query.filter(PriceHistory.region == region)
        
        return query.order_by(PriceHistory.timestamp).all()
    
    @staticmethod
    def calculate_price_statistics(session: Session, commodity_id: int, days: int = 30) -> Dict[str, float]:
        """Calcula estatísticas de preços"""
        prices = PriceService.get_price_history(session, commodity_id, days)
        
        if not prices:
            return {}
        
        price_values = [p.price for p in prices]
        
        return {
            "min_price": min(price_values),
            "max_price": max(price_values),
            "avg_price": sum(price_values) / len(price_values),
            "latest_price": price_values[-1],
            "price_change": price_values[-1] - price_values[0] if len(price_values) > 1 else 0,
            "volatility": PriceService._calculate_volatility(price_values)
        }
    
    @staticmethod
    def _calculate_volatility(prices: List[float]) -> float:
        """Calcula volatilidade dos preços"""
        if len(prices) < 2:
            return 0.0
        
        avg = sum(prices) / len(prices)
        variance = sum((p - avg) ** 2 for p in prices) / len(prices)
        return variance ** 0.5


class WeatherService:
    """Serviço para dados climáticos - usado pelo agente AgriTech Data"""
    
    @staticmethod
    def add_weather_data(session: Session, weather_data: Dict[str, Any]) -> WeatherData:
        """Adiciona dados climáticos"""
        weather_record = WeatherData(**weather_data)
        session.add(weather_record)
        session.commit()
        session.refresh(weather_record)
        return weather_record
    
    @staticmethod
    def get_weather_by_region(session: Session, region: str, days: int = 7) -> List[WeatherData]:
        """Obtém dados climáticos por região"""
        start_date = datetime.now() - timedelta(days=days)
        
        return session.query(WeatherData).filter(
            and_(
                WeatherData.region == region,
                WeatherData.timestamp >= start_date
            )
        ).order_by(desc(WeatherData.timestamp)).all()
    
    @staticmethod
    def get_latest_weather_by_station(session: Session, station_id: str) -> Optional[WeatherData]:
        """Obtém dados climáticos mais recentes de uma estação"""
        return session.query(WeatherData).filter(
            WeatherData.station_id == station_id
        ).order_by(desc(WeatherData.timestamp)).first()


class AlertService:
    """Serviço para alertas de mercado - usado pelo agente Business Intelligence"""
    
    @staticmethod
    def create_alert(session: Session, alert_data: Dict[str, Any]) -> MarketAlert:
        """Cria novo alerta"""
        alert = MarketAlert(**alert_data)
        session.add(alert)
        session.commit()
        session.refresh(alert)
        return alert
    
    @staticmethod
    def check_price_alerts(session: Session) -> List[MarketAlert]:
        """Verifica alertas que devem ser disparados"""
        active_alerts = session.query(MarketAlert).filter(
            and_(
                MarketAlert.active == True,
                MarketAlert.triggered == False
            )
        ).all()
        
        triggered_alerts = []
        
        for alert in active_alerts:
            latest_price = PriceService.get_latest_prices(session, alert.commodity_id, limit=1)
            
            if latest_price:
                current_price = latest_price[0].price
                should_trigger = False
                
                if alert.alert_type == "price_above" and current_price > alert.threshold_value:
                    should_trigger = True
                elif alert.alert_type == "price_below" and current_price < alert.threshold_value:
                    should_trigger = True
                elif alert.alert_type == "volatility":
                    # Calcular volatilidade do período
                    stats = PriceService.calculate_price_statistics(
                        session, alert.commodity_id, alert.comparison_period or 7
                    )
                    if stats.get("volatility", 0) > alert.threshold_value:
                        should_trigger = True
                
                if should_trigger:
                    alert.triggered = True
                    alert.last_triggered = datetime.now()
                    triggered_alerts.append(alert)
        
        if triggered_alerts:
            session.commit()
        
        return triggered_alerts
    
    @staticmethod
    def get_user_alerts(session: Session, user_phone: str) -> List[MarketAlert]:
        """Obtém alertas de um usuário"""
        return session.query(MarketAlert).filter(
            MarketAlert.user_phone == user_phone
        ).all()


class WhatsAppUserService:
    """Serviço para usuários WhatsApp - usado pelo agente WhatsApp Specialist"""
    
    @staticmethod
    def create_user(session: Session, user_data: Dict[str, Any]) -> WhatsAppUser:
        """Cria novo usuário WhatsApp"""
        user = WhatsAppUser(**user_data)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_phone(session: Session, phone_number: str) -> Optional[WhatsAppUser]:
        """Busca usuário por telefone"""
        return session.query(WhatsAppUser).filter(
            WhatsAppUser.phone_number == phone_number
        ).first()
    
    @staticmethod
    def update_last_interaction(session: Session, phone_number: str):
        """Atualiza última interação do usuário"""
        user = WhatsAppUserService.get_user_by_phone(session, phone_number)
        if user:
            user.last_interaction = datetime.now()
            session.commit()
    
    @staticmethod
    def get_users_for_notifications(session: Session, commodity_symbol: str) -> List[WhatsAppUser]:
        """Obtém usuários que devem receber notificações de uma commodity"""
        return session.query(WhatsAppUser).filter(
            and_(
                WhatsAppUser.active == True,
                WhatsAppUser.preferred_commodities.contains([commodity_symbol])
            )
        ).all()


class GovernmentDataService:
    """Serviço para dados governamentais - usado pelo agente AgriTech Data"""
    
    @staticmethod
    def add_government_data(session: Session, data: Dict[str, Any]) -> GovernmentData:
        """Adiciona dados governamentais"""
        gov_data = GovernmentData(**data)
        session.add(gov_data)
        session.commit()
        session.refresh(gov_data)
        return gov_data
    
    @staticmethod
    def get_latest_by_source(session: Session, source: str, dataset_type: str, commodity: Optional[str] = None) -> List[GovernmentData]:
        """Obtém dados mais recentes por fonte"""
        query = session.query(GovernmentData).filter(
            and_(
                GovernmentData.source == source,
                GovernmentData.dataset_type == dataset_type
            )
        )
        
        if commodity:
            query = query.filter(GovernmentData.commodity == commodity)
        
        return query.order_by(desc(GovernmentData.timestamp)).limit(10).all()


class PredictionService:
    """Serviço para previsões - usado pelo agente Financial Modeling"""
    
    @staticmethod
    def save_prediction(session: Session, prediction_data: Dict[str, Any]) -> PricePrediction:
        """Salva previsão de preço"""
        prediction = PricePrediction(**prediction_data)
        session.add(prediction)
        session.commit()
        session.refresh(prediction)
        return prediction
    
    @staticmethod
    def get_latest_predictions(session: Session, commodity_id: int, horizon_days: int = 30) -> List[PricePrediction]:
        """Obtém previsões mais recentes"""
        target_date = datetime.now() + timedelta(days=horizon_days)
        
        return session.query(PricePrediction).filter(
            and_(
                PricePrediction.commodity_id == commodity_id,
                PricePrediction.target_date <= target_date
            )
        ).order_by(desc(PricePrediction.prediction_date)).limit(10).all()
    
    @staticmethod
    def validate_predictions(session: Session):
        """Valida previsões com preços reais"""
        # Buscar previsões não validadas com data alvo no passado
        past_predictions = session.query(PricePrediction).filter(
            and_(
                PricePrediction.validated == False,
                PricePrediction.target_date <= datetime.now()
            )
        ).all()
        
        for prediction in past_predictions:
            # Buscar preço real próximo à data alvo
            actual_price_record = session.query(PriceHistory).filter(
                and_(
                    PriceHistory.commodity_id == prediction.commodity_id,
                    PriceHistory.timestamp >= prediction.target_date - timedelta(days=1),
                    PriceHistory.timestamp <= prediction.target_date + timedelta(days=1)
                )
            ).order_by(PriceHistory.timestamp).first()
            
            if actual_price_record:
                prediction.actual_price = actual_price_record.price
                prediction.validated = True
        
        session.commit()


# Classe agregadora para uso pelos agentes
class SPRDatabaseAPI:
    """API principal do banco para uso pelos agentes especializados"""
    
    def __init__(self):
        self.commodity_service = CommodityService()
        self.price_service = PriceService()
        self.weather_service = WeatherService()
        self.alert_service = AlertService()
        self.user_service = WhatsAppUserService()
        self.government_service = GovernmentDataService()
        self.prediction_service = PredictionService()
    
    def get_session(self):
        """Obtém sessão de banco"""
        return db_manager.get_session()
    
    def test_connection(self) -> bool:
        """Testa conexão"""
        return db_manager.test_connection()
    
    def get_cache_client(self):
        """Obtém cliente Redis"""
        return db_manager.get_redis_client()


# Instância global para uso pelos agentes
spr_db = SPRDatabaseAPI()