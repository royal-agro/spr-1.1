from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["dashboard"])

@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """
    Retorna o status do sistema.
    """
    try:
        return {
            "status": "online",
            "version": "1.1",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "whatsapp": "connected",
                "database": "connected",
                "prediction": "active"
            }
        }
    except Exception as e:
        logger.error(f"Erro ao obter status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """
    Retorna métricas do sistema.
    """
    try:
        return {
            "metrics": {
                "totalMessages": 0,
                "totalContacts": 0,
                "activeChats": 0,
                "messagesPerDay": 0,
                "responseTime": 0,
                "deliveryRate": 0,
                "readRate": 0
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erro ao obter métricas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))