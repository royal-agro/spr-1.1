#!/usr/bin/env python3
"""
Simple FastAPI server for SPR system - Basic functionality with WebSocket support
"""

import os
import sys
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Set
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

# Global connection manager
manager = ConnectionManager()

# Broadcast statistics
broadcast_stats = {
    "totalCampaigns": 0,
    "activeCampaigns": 0,
    "messagesSent": 0,
    "messagesDelivered": 0,
    "messagesFailed": 0,
    "deliveryRate": 0.0
}

# Initialize FastAPI
app = FastAPI(
    title="SPR - Sistema de Previsão Rural",
    description="Simple agricultural prediction system with WebSocket support",
    version="1.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SPR - Sistema Preditivo Royal", "status": "running", "version": "1.1.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SPR Backend Python",
        "port": 8000,
        "timestamp": "2025-08-01T20:00:00Z"
    }

@app.get("/api/status")
async def api_status():
    return {
        "api": "online",
        "database": "connected",
        "whatsapp": "ready",
        "version": "1.1.0"
    }

@app.get("/api/commodities")
async def get_commodities():
    return {
        "commodities": [
            {"name": "Soja", "price": 145.50, "trend": "alta"},
            {"name": "Milho", "price": 85.30, "trend": "estável"},
            {"name": "Algodão", "price": 210.75, "trend": "alta"}
        ]
    }

@app.get("/api/broadcast/campaigns")
async def get_campaigns():
    return {
        "campaigns": [
            {"id": 1, "name": "Relatório Semanal", "status": "active"},
            {"id": 2, "name": "Alertas de Preço", "status": "active"}
        ]
    }

@app.post("/api/send-email")
async def send_email(data: dict):
    logger.info(f"Email enviado para: {data.get('to', 'destinatário não especificado')}")
    return {"success": True, "message": "Email enviado com sucesso"}

@app.websocket("/ws/broadcast")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Send initial stats
    await manager.send_personal_message(
        json.dumps({
            "type": "stats_update",
            "stats": broadcast_stats,
            "timestamp": datetime.now().isoformat()
        }),
        websocket
    )
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                # Respond to heartbeat
                await manager.send_personal_message(
                    json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }),
                    websocket
                )
            
            elif message.get("type") == "send_broadcast":
                # Handle broadcast message
                broadcast_msg = message.get("message", {})
                logger.info(f"Broadcast received: {broadcast_msg.get('title', 'No title')}")
                
                # Simulate sending to recipients
                recipients = broadcast_msg.get("recipients", [])
                broadcast_stats["messagesSent"] += len(recipients)
                broadcast_stats["messagesDelivered"] += len(recipients)  # Simulate 100% delivery for now
                broadcast_stats["deliveryRate"] = (broadcast_stats["messagesDelivered"] / broadcast_stats["messagesSent"]) * 100 if broadcast_stats["messagesSent"] > 0 else 0
                
                # Broadcast status update to all clients
                await manager.broadcast(json.dumps({
                    "type": "broadcast_status",
                    "id": broadcast_msg.get("id"),
                    "message": {
                        **broadcast_msg,
                        "status": "sent"
                    },
                    "timestamp": datetime.now().isoformat()
                }))
                
                # Send updated stats
                await manager.broadcast(json.dumps({
                    "type": "stats_update",
                    "stats": broadcast_stats,
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "create_campaign":
                # Handle campaign creation
                campaign = message.get("campaign", {})
                logger.info(f"Campaign created: {campaign.get('title', 'No title')}")
                
                broadcast_stats["totalCampaigns"] += 1
                broadcast_stats["activeCampaigns"] += 1
                
                # Broadcast campaign creation to all clients
                await manager.broadcast(json.dumps({
                    "type": "campaign_created",
                    "campaignId": campaign.get("id"),
                    "title": campaign.get("title"),
                    "recipientCount": len(campaign.get("recipients", [])),
                    "timestamp": datetime.now().isoformat()
                }))
                
                # Send updated stats
                await manager.broadcast(json.dumps({
                    "type": "stats_update",
                    "stats": broadcast_stats,
                    "timestamp": datetime.now().isoformat()
                }))
            
            elif message.get("type") == "delete_campaign":
                # Handle campaign deletion
                campaign_id = message.get("campaignId")
                logger.info(f"Campaign deleted: {campaign_id}")
                
                if broadcast_stats["activeCampaigns"] > 0:
                    broadcast_stats["activeCampaigns"] -= 1
                
                # Send updated stats
                await manager.broadcast(json.dumps({
                    "type": "stats_update",
                    "stats": broadcast_stats,
                    "timestamp": datetime.now().isoformat()
                }))
            
            else:
                logger.warning(f"Unknown message type: {message.get('type')}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/api/broadcast/stats")
async def get_broadcast_stats():
    return {
        "stats": broadcast_stats,
        "connections": len(manager.active_connections),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/broadcast/send")
async def send_broadcast_http(data: dict):
    """HTTP endpoint for sending broadcasts (fallback for non-WebSocket clients)"""
    try:
        recipients = data.get("recipients", [])
        broadcast_stats["messagesSent"] += len(recipients)
        broadcast_stats["messagesDelivered"] += len(recipients)
        broadcast_stats["deliveryRate"] = (broadcast_stats["messagesDelivered"] / broadcast_stats["messagesSent"]) * 100 if broadcast_stats["messagesSent"] > 0 else 0
        
        # Broadcast to WebSocket clients
        await manager.broadcast(json.dumps({
            "type": "broadcast_status",
            "id": f"http_broadcast_{int(datetime.now().timestamp())}",
            "message": {
                **data,
                "status": "sent"
            },
            "timestamp": datetime.now().isoformat()
        }))
        
        logger.info(f"HTTP Broadcast sent: {data.get('title', 'No title')} to {len(recipients)} recipients")
        return {"success": True, "message": "Broadcast enviado com sucesso"}
        
    except Exception as e:
        logger.error(f"Error sending HTTP broadcast: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)