"""
SPR Multi-Agent System - Interface Definitions
Defines the contracts and interfaces between different agents
"""

from abc import ABC, abstractmethod
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


# ==================== ENUMS ====================

class CommodityType(str, Enum):
    SOY = "soja"
    CORN = "milho"
    CATTLE = "boi"
    COFFEE = "cafe"
    SUGAR = "acucar"
    COTTON = "algodao"

class PriceCondition(str, Enum):
    ABOVE = "above"
    BELOW = "below"
    EQUAL = "equal"

class NotificationChannel(str, Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    SMS = "sms"
    WEBHOOK = "webhook"

class ModelType(str, Enum):
    LINEAR_REGRESSION = "linear_regression"
    ARIMA = "arima"
    LSTM = "lstm"
    RANDOM_FOREST = "random_forest"


# ==================== DATA MODELS ====================

class Commodity(BaseModel):
    id: str
    name: str
    category: str
    unit: str
    market: str
    active: bool = True

class PricePoint(BaseModel):
    id: str
    commodity_id: str
    price: Decimal
    volume: int
    timestamp: datetime
    source: str
    region: Optional[str] = None

class WeatherData(BaseModel):
    id: str
    station_id: str
    timestamp: datetime
    temperature: Optional[Decimal]
    humidity: Optional[Decimal]
    precipitation: Optional[Decimal]
    wind_speed: Optional[Decimal]

class Prediction(BaseModel):
    id: str
    commodity_id: str
    model_type: ModelType
    prediction_date: date
    predicted_price: Decimal
    confidence: Decimal = Field(ge=0, le=1)
    factors: Dict[str, Any]
    created_at: datetime

class Alert(BaseModel):
    id: str
    user_id: str
    commodity_id: str
    threshold_price: Decimal
    condition: PriceCondition
    active: bool = True
    notification_channels: List[NotificationChannel]

class MarketReport(BaseModel):
    report_id: str
    commodity: str
    period: str
    analysis: Dict[str, Any]
    charts: List[Dict[str, Any]]
    generated_at: datetime


# ==================== REQUEST/RESPONSE MODELS ====================

class PricePredictionRequest(BaseModel):
    commodity: str
    prediction_days: int = Field(ge=1, le=365)
    model_type: ModelType
    factors: Optional[Dict[str, Any]] = None

class PricePredictionResponse(BaseModel):
    commodity: str
    current_price: Decimal
    predictions: List[Dict[str, Any]]
    model_accuracy: Decimal
    generated_at: datetime

class WhatsAppMessage(BaseModel):
    to: str
    message: str
    type: str = "text"
    attachments: Optional[List[Dict[str, Any]]] = None

class WhatsAppResponse(BaseModel):
    message_id: str
    status: str
    timestamp: datetime

class DataIngestionRequest(BaseModel):
    source: str
    dataset: str
    date_range: Dict[str, date]
    parameters: Optional[Dict[str, Any]] = None

class NotificationAlert(BaseModel):
    type: str
    priority: str
    message: str
    recipients: List[str]
    channels: List[NotificationChannel]
    metadata: Optional[Dict[str, Any]] = None


# ==================== AGENT INTERFACES ====================

class IDatabaseAgent(ABC):
    """Interface for Database Agent"""
    
    @abstractmethod
    async def get_commodity_prices(
        self, 
        commodity: str, 
        date_from: date, 
        date_to: date, 
        limit: Optional[int] = None
    ) -> List[PricePoint]:
        """Get commodity price history"""
        pass
    
    @abstractmethod
    async def insert_price_data(self, price_data: PricePoint) -> str:
        """Insert new price data"""
        pass
    
    @abstractmethod
    async def get_health_status(self) -> Dict[str, Any]:
        """Get database health status"""
        pass

class IPricingAgent(ABC):
    """Interface for Pricing & Prediction Agent"""
    
    @abstractmethod
    async def predict_price(self, request: PricePredictionRequest) -> PricePredictionResponse:
        """Predict commodity price"""
        pass
    
    @abstractmethod
    async def create_price_alert(self, alert: Alert) -> str:
        """Create price alert"""
        pass
    
    @abstractmethod
    async def get_model_performance(self, model_type: ModelType) -> Dict[str, Any]:
        """Get model performance metrics"""
        pass

class IWhatsAppAgent(ABC):
    """Interface for WhatsApp Integration Agent"""
    
    @abstractmethod
    async def send_message(self, message: WhatsAppMessage) -> WhatsAppResponse:
        """Send WhatsApp message"""
        pass
    
    @abstractmethod
    async def broadcast_message(
        self, 
        groups: List[str], 
        message: str, 
        schedule: Optional[datetime] = None
    ) -> List[WhatsAppResponse]:
        """Broadcast message to multiple groups"""
        pass
    
    @abstractmethod
    async def get_connection_status(self) -> Dict[str, Any]:
        """Get WhatsApp connection status"""
        pass

class IDataIngestionAgent(ABC):
    """Interface for Data Ingestion Agent"""
    
    @abstractmethod
    async def ingest_ibge_data(self, request: DataIngestionRequest) -> Dict[str, Any]:
        """Ingest IBGE data"""
        pass
    
    @abstractmethod
    async def ingest_weather_data(self, request: DataIngestionRequest) -> Dict[str, Any]:
        """Ingest weather data"""
        pass
    
    @abstractmethod
    async def get_ingestion_status(self) -> Dict[str, Any]:
        """Get data ingestion status"""
        pass

class IAnalyticsAgent(ABC):
    """Interface for Business Intelligence Agent"""
    
    @abstractmethod
    async def generate_market_report(
        self, 
        commodity: str, 
        period: str, 
        format: str = "json"
    ) -> MarketReport:
        """Generate market analysis report"""
        pass
    
    @abstractmethod
    async def analyze_sentiment(
        self, 
        commodity: str, 
        date_range: Dict[str, date]
    ) -> Dict[str, Any]:
        """Analyze market sentiment"""
        pass

class INotificationAgent(ABC):
    """Interface for Notification Agent"""
    
    @abstractmethod
    async def send_alert(self, alert: NotificationAlert) -> str:
        """Send notification alert"""
        pass
    
    @abstractmethod
    async def schedule_notification(
        self, 
        notification: NotificationAlert, 
        schedule: datetime
    ) -> str:
        """Schedule future notification"""
        pass


# ==================== EVENT SYSTEM ====================

class BaseEvent(BaseModel):
    event_type: str
    timestamp: datetime
    data: Dict[str, Any]

class PriceUpdatedEvent(BaseEvent):
    event_type: str = "price_updated"
    data: Dict[str, Union[str, Decimal]]

class AlertTriggeredEvent(BaseEvent):
    event_type: str = "alert_triggered"
    data: Dict[str, Union[str, Decimal]]

class DataIngestedEvent(BaseEvent):
    event_type: str = "data_ingested"
    data: Dict[str, Union[str, int]]


# ==================== AGENT COORDINATOR ====================

class IAgentCoordinator(ABC):
    """Interface for coordinating between agents"""
    
    @abstractmethod
    async def register_agent(self, agent_name: str, agent_interface: Any) -> None:
        """Register an agent with the coordinator"""
        pass
    
    @abstractmethod
    async def publish_event(self, event: BaseEvent) -> None:
        """Publish event to subscribed agents"""
        pass
    
    @abstractmethod
    async def subscribe_to_event(self, event_type: str, agent_name: str) -> None:
        """Subscribe agent to specific event type"""
        pass
    
    @abstractmethod
    async def get_agent(self, agent_name: str) -> Any:
        """Get agent instance by name"""
        pass


# ==================== CONFIGURATION ====================

class AgentConfig(BaseModel):
    """Configuration for individual agents"""
    name: str
    type: str
    enabled: bool = True
    config: Dict[str, Any]
    dependencies: List[str] = []

class SystemConfig(BaseModel):
    """System-wide configuration"""
    agents: List[AgentConfig]
    database_url: str
    redis_url: str
    api_base_url: str
    log_level: str = "INFO"
    monitoring_enabled: bool = True


# ==================== HEALTH CHECK ====================

class HealthStatus(BaseModel):
    """Health status for agents and services"""
    service: str
    status: str  # "healthy", "unhealthy", "degraded"
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    uptime: Optional[int] = None  # seconds

class SystemHealth(BaseModel):
    """Overall system health"""
    overall_status: str
    services: List[HealthStatus]
    timestamp: datetime