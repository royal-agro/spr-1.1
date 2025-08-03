"""
Router for Commodities API endpoints
Provides CRUD operations and price data for agricultural commodities
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging

from ..database.connection import get_db
from ..database.models import Commodity, PriceHistory, PricePrediction
from ..database.services import CommodityService, PriceService
from ..middleware.auth_fastapi import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/commodities", tags=["commodities"])

# Pydantic schemas
class CommodityResponse(BaseModel):
    id: int
    symbol: str
    name: str
    category: str
    unit: str
    exchange: Optional[str]
    active: bool
    created_at: datetime
    current_price: Optional[float] = None
    price_change_24h: Optional[float] = None
    
    class Config:
        from_attributes = True

class PriceHistoryResponse(BaseModel):
    id: int
    price: float
    price_open: Optional[float]
    price_high: Optional[float]
    price_low: Optional[float]
    price_close: Optional[float]
    volume: Optional[float]
    region: Optional[str]
    state: Optional[str]
    source: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True

class CommodityPriceData(BaseModel):
    symbol: str
    name: str
    current_price: float
    price_change_24h: float
    price_change_percent_24h: float
    volume_24h: Optional[float]
    last_updated: datetime

@router.get("/", response_model=List[CommodityResponse])
async def list_commodities(
    active_only: bool = Query(True, description="Filter only active commodities"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """
    List all available commodities
    
    Args:
        active_only: If True, returns only active commodities
        category: Filter by commodity category (grains, livestock, etc.)
        
    Returns:
        List of commodities with current price data
    """
    try:
        # Get commodities from database
        commodities = CommodityService.get_all_commodities(db, active_only=active_only)
        
        if category:
            commodities = [c for c in commodities if c.category == category]
        
        # Enrich with current price data
        result = []
        for commodity in commodities:
            # Get latest price
            latest_price = (
                db.query(PriceHistory)
                .filter(PriceHistory.commodity_id == commodity.id)
                .order_by(PriceHistory.timestamp.desc())
                .first()
            )
            
            # Calculate 24h change if possible
            price_change_24h = None
            if latest_price:
                yesterday = latest_price.timestamp - timedelta(days=1)
                prev_price = (
                    db.query(PriceHistory)
                    .filter(
                        PriceHistory.commodity_id == commodity.id,
                        PriceHistory.timestamp <= yesterday
                    )
                    .order_by(PriceHistory.timestamp.desc())
                    .first()
                )
                if prev_price:
                    price_change_24h = latest_price.price - prev_price.price
            
            commodity_data = CommodityResponse(
                id=commodity.id,
                symbol=commodity.symbol,
                name=commodity.name,
                category=commodity.category,
                unit=commodity.unit,
                exchange=commodity.exchange,
                active=commodity.active,
                created_at=commodity.created_at,
                current_price=latest_price.price if latest_price else None,
                price_change_24h=price_change_24h
            )
            result.append(commodity_data)
        
        logger.info(f"Retrieved {len(result)} commodities")
        return result
        
    except Exception as e:
        logger.error(f"Error listing commodities: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving commodities")

@router.get("/{commodity_id}", response_model=CommodityResponse)
async def get_commodity(
    commodity_id: int,
    db: Session = Depends(get_db)
):
    """
    Get details of a specific commodity
    
    Args:
        commodity_id: ID of the commodity
        
    Returns:
        Commodity details with current price
    """
    try:
        commodity = db.query(Commodity).filter(Commodity.id == commodity_id).first()
        
        if not commodity:
            raise HTTPException(status_code=404, detail="Commodity not found")
        
        # Get latest price
        latest_price = (
            db.query(PriceHistory)
            .filter(PriceHistory.commodity_id == commodity.id)
            .order_by(PriceHistory.timestamp.desc())
            .first()
        )
        
        # Calculate 24h change
        price_change_24h = None
        if latest_price:
            yesterday = latest_price.timestamp - timedelta(days=1)
            prev_price = (
                db.query(PriceHistory)
                .filter(
                    PriceHistory.commodity_id == commodity.id,
                    PriceHistory.timestamp <= yesterday
                )
                .order_by(PriceHistory.timestamp.desc())
                .first()
            )
            if prev_price:
                price_change_24h = latest_price.price - prev_price.price
        
        return CommodityResponse(
            id=commodity.id,
            symbol=commodity.symbol,
            name=commodity.name,
            category=commodity.category,
            unit=commodity.unit,
            exchange=commodity.exchange,
            active=commodity.active,
            created_at=commodity.created_at,
            current_price=latest_price.price if latest_price else None,
            price_change_24h=price_change_24h
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting commodity {commodity_id}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving commodity")

@router.get("/{commodity_id}/prices", response_model=List[PriceHistoryResponse])
async def get_commodity_prices(
    commodity_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days of price history"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db)
):
    """
    Get price history for a specific commodity
    
    Args:
        commodity_id: ID of the commodity
        days: Number of days of history to retrieve
        region: Filter by specific region
        
    Returns:
        List of price history records
    """
    try:
        # Verify commodity exists
        commodity = db.query(Commodity).filter(Commodity.id == commodity_id).first()
        if not commodity:
            raise HTTPException(status_code=404, detail="Commodity not found")
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Build query
        query = (
            db.query(PriceHistory)
            .filter(
                PriceHistory.commodity_id == commodity_id,
                PriceHistory.timestamp >= start_date,
                PriceHistory.timestamp <= end_date
            )
        )
        
        if region:
            query = query.filter(PriceHistory.region == region)
        
        prices = query.order_by(PriceHistory.timestamp.desc()).all()
        
        logger.info(f"Retrieved {len(prices)} price records for commodity {commodity_id}")
        return [PriceHistoryResponse.from_orm(price) for price in prices]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prices for commodity {commodity_id}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving price history")

@router.get("/{commodity_id}/predictions")
async def get_commodity_predictions(
    commodity_id: int,
    days_ahead: int = Query(30, ge=1, le=90, description="Days ahead for predictions"),
    db: Session = Depends(get_db)
):
    """
    Get price predictions for a specific commodity
    
    Args:
        commodity_id: ID of the commodity
        days_ahead: Number of days ahead for predictions
        
    Returns:
        Price predictions data
    """
    try:
        # Verify commodity exists
        commodity = db.query(Commodity).filter(Commodity.id == commodity_id).first()
        if not commodity:
            raise HTTPException(status_code=404, detail="Commodity not found")
        
        # Get recent predictions
        target_date = datetime.now() + timedelta(days=days_ahead)
        
        predictions = (
            db.query(PricePrediction)
            .filter(
                PricePrediction.commodity_id == commodity_id,
                PricePrediction.target_date <= target_date
            )
            .order_by(PricePrediction.prediction_date.desc())
            .limit(10)
            .all()
        )
        
        if not predictions:
            # Generate mock prediction for demonstration
            current_price = (
                db.query(PriceHistory)
                .filter(PriceHistory.commodity_id == commodity_id)
                .order_by(PriceHistory.timestamp.desc())
                .first()
            )
            
            base_price = current_price.price if current_price else 100.0
            predicted_price = base_price * (1 + (days_ahead * 0.001))  # Simple mock prediction
            
            return {
                "commodity_id": commodity_id,
                "commodity_symbol": commodity.symbol,
                "predictions": [{
                    "predicted_price": round(predicted_price, 2),
                    "confidence_score": 0.75,
                    "prediction_horizon": days_ahead,
                    "model_name": "mock_model",
                    "prediction_date": datetime.now().isoformat(),
                    "target_date": target_date.isoformat(),
                    "lower_bound": round(predicted_price * 0.95, 2),
                    "upper_bound": round(predicted_price * 1.05, 2)
                }]
            }
        
        # Return actual predictions
        predictions_data = []
        for pred in predictions:
            predictions_data.append({
                "predicted_price": pred.predicted_price,
                "confidence_score": pred.confidence_score,
                "prediction_horizon": pred.prediction_horizon,
                "model_name": pred.model_name,
                "prediction_date": pred.prediction_date.isoformat(),
                "target_date": pred.target_date.isoformat(),
                "lower_bound": pred.lower_bound,
                "upper_bound": pred.upper_bound
            })
        
        return {
            "commodity_id": commodity_id,
            "commodity_symbol": commodity.symbol,
            "predictions": predictions_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting predictions for commodity {commodity_id}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving predictions")

@router.get("/symbol/{symbol}", response_model=CommodityResponse)
async def get_commodity_by_symbol(
    symbol: str,
    db: Session = Depends(get_db)
):
    """
    Get commodity by symbol (e.g., SOJA, MILHO, BOI)
    
    Args:
        symbol: Commodity symbol
        
    Returns:
        Commodity details with current price
    """
    try:
        commodity = CommodityService.get_commodity_by_symbol(db, symbol.upper())
        
        if not commodity:
            raise HTTPException(status_code=404, detail=f"Commodity with symbol '{symbol}' not found")
        
        # Get latest price
        latest_price = (
            db.query(PriceHistory)
            .filter(PriceHistory.commodity_id == commodity.id)
            .order_by(PriceHistory.timestamp.desc())
            .first()
        )
        
        # Calculate 24h change
        price_change_24h = None
        if latest_price:
            yesterday = latest_price.timestamp - timedelta(days=1)
            prev_price = (
                db.query(PriceHistory)
                .filter(
                    PriceHistory.commodity_id == commodity.id,
                    PriceHistory.timestamp <= yesterday
                )
                .order_by(PriceHistory.timestamp.desc())
                .first()
            )
            if prev_price:
                price_change_24h = latest_price.price - prev_price.price
        
        return CommodityResponse(
            id=commodity.id,
            symbol=commodity.symbol,
            name=commodity.name,
            category=commodity.category,
            unit=commodity.unit,
            exchange=commodity.exchange,
            active=commodity.active,
            created_at=commodity.created_at,
            current_price=latest_price.price if latest_price else None,
            price_change_24h=price_change_24h
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting commodity by symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving commodity")

@router.get("/dashboard/summary")
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Get summary data for dashboard
    
    Returns:
        Summary statistics and top commodities
    """
    try:
        # Get all active commodities
        commodities = CommodityService.get_all_commodities(db, active_only=True)
        
        # Generate mock summary data for now
        summary_data = []
        
        for commodity in commodities[:6]:  # Top 6 commodities
            # Get latest price
            latest_price = (
                db.query(PriceHistory)
                .filter(PriceHistory.commodity_id == commodity.id)
                .order_by(PriceHistory.timestamp.desc())
                .first()
            )
            
            if latest_price:
                # Calculate price change
                yesterday = latest_price.timestamp - timedelta(days=1)
                prev_price = (
                    db.query(PriceHistory)
                    .filter(
                        PriceHistory.commodity_id == commodity.id,
                        PriceHistory.timestamp <= yesterday
                    )
                    .order_by(PriceHistory.timestamp.desc())
                    .first()
                )
                
                price_change = 0
                price_change_percent = 0
                
                if prev_price:
                    price_change = latest_price.price - prev_price.price
                    price_change_percent = (price_change / prev_price.price) * 100
                
                summary_data.append({
                    "id": commodity.id,
                    "symbol": commodity.symbol,
                    "name": commodity.name,
                    "current_price": latest_price.price,
                    "price_change": price_change,
                    "price_change_percent": price_change_percent,
                    "unit": commodity.unit,
                    "last_updated": latest_price.timestamp.isoformat()
                })
        
        return {
            "total_commodities": len(commodities),
            "active_commodities": len([c for c in commodities if c.active]),
            "commodities": summary_data,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving dashboard summary")