"""
SPR Multi-Agent System Monitoring
Real-time monitoring and health checking for all agents
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import aioredis
import psutil
import requests
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class AgentStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    OFFLINE = "offline"

@dataclass
class AgentMetrics:
    id: str
    name: str
    type: str
    status: AgentStatus
    last_update: datetime
    uptime: float  # percentage
    active_connections: int
    requests_per_minute: int
    error_rate: float  # percentage
    response_time: float  # milliseconds
    cpu_usage: float  # percentage
    memory_usage: float  # percentage
    custom_metrics: Dict[str, Any]

@dataclass
class SystemMetrics:
    total_requests: int
    average_response_time: float
    error_rate: float
    uptime: float
    active_agents: int
    commodities_tracked: int
    price_updates_last_hour: int
    whatsapp_messages_last_hour: int
    timestamp: datetime

class AgentMonitor:
    """Central monitoring system for all SPR agents"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis = None
        self.agents: Dict[str, AgentMetrics] = {}
        self.system_metrics = SystemMetrics(
            total_requests=0,
            average_response_time=0.0,
            error_rate=0.0,
            uptime=100.0,
            active_agents=0,
            commodities_tracked=6,
            price_updates_last_hour=0,
            whatsapp_messages_last_hour=0,
            timestamp=datetime.utcnow()
        )
        self.monitoring_active = False
        
    async def initialize(self):
        """Initialize monitoring system"""
        try:
            self.redis = await aioredis.from_url(self.redis_url)
            await self.register_default_agents()
            logger.info("Agent monitoring system initialized")
        except Exception as e:
            logger.error(f"Failed to initialize monitoring: {e}")
            raise
    
    async def register_default_agents(self):
        """Register all known agents with default metrics"""
        default_agents = [
            {
                "id": "database_engineer",
                "name": "Database Engineer",
                "type": "database_engineer",
                "port": 5432,
                "health_endpoint": "/health"
            },
            {
                "id": "backend_python", 
                "name": "Backend Python",
                "type": "backend_python",
                "port": 8000,
                "health_endpoint": "/health"
            },
            {
                "id": "frontend_react",
                "name": "Frontend React", 
                "type": "frontend_react",
                "port": 3000,
                "health_endpoint": "/health"
            },
            {
                "id": "whatsapp_specialist",
                "name": "WhatsApp Integration",
                "type": "whatsapp_specialist", 
                "port": 3001,
                "health_endpoint": "/status"
            },
            {
                "id": "business_intelligence",
                "name": "Business Intelligence",
                "type": "business_intelligence",
                "port": 8888,
                "health_endpoint": "/health"
            },
            {
                "id": "agritech_data",
                "name": "AgriTech Data",
                "type": "agritech_data",
                "port": 8001,
                "health_endpoint": "/health"
            },
            {
                "id": "devops_infrastructure",
                "name": "DevOps & Infrastructure",
                "type": "devops_infrastructure",
                "port": 9090,
                "health_endpoint": "/metrics"
            },
            {
                "id": "qa_testing",
                "name": "QA & Testing",
                "type": "qa_testing", 
                "port": 8080,
                "health_endpoint": "/health"
            },
            {
                "id": "financial_modeling",
                "name": "Financial Modeling",
                "type": "financial_modeling",
                "port": 8002,
                "health_endpoint": "/health"
            }
        ]
        
        for agent_config in default_agents:
            metrics = AgentMetrics(
                id=agent_config["id"],
                name=agent_config["name"],
                type=agent_config["type"],
                status=AgentStatus.OFFLINE,
                last_update=datetime.utcnow(),
                uptime=0.0,
                active_connections=0,
                requests_per_minute=0,
                error_rate=0.0,
                response_time=0.0,
                cpu_usage=0.0,
                memory_usage=0.0,
                custom_metrics=agent_config
            )
            self.agents[agent_config["id"]] = metrics
    
    async def check_agent_health(self, agent_id: str) -> Optional[AgentMetrics]:
        """Check health of a specific agent"""
        if agent_id not in self.agents:
            logger.warning(f"Unknown agent: {agent_id}")
            return None
            
        agent = self.agents[agent_id]
        
        try:
            # Get agent configuration
            port = agent.custom_metrics.get("port", 8000)
            health_endpoint = agent.custom_metrics.get("health_endpoint", "/health")
            url = f"http://localhost:{port}{health_endpoint}"
            
            # Make health check request
            start_time = datetime.utcnow()
            response = requests.get(url, timeout=5)
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Update metrics based on response
            if response.status_code == 200:
                agent.status = AgentStatus.HEALTHY
                agent.response_time = response_time
                
                # Parse response for additional metrics
                try:
                    data = response.json()
                    agent.active_connections = data.get("connections", 0)
                    agent.requests_per_minute = data.get("requests_per_minute", 0)
                    agent.error_rate = data.get("error_rate", 0.0)
                    agent.cpu_usage = data.get("cpu_usage", 0.0)
                    agent.memory_usage = data.get("memory_usage", 0.0)
                except json.JSONDecodeError:
                    pass
                    
            else:
                agent.status = AgentStatus.UNHEALTHY
                agent.response_time = response_time
                
        except requests.exceptions.Timeout:
            agent.status = AgentStatus.DEGRADED
            agent.response_time = 5000  # Timeout
            logger.warning(f"Agent {agent_id} health check timed out")
            
        except requests.exceptions.ConnectionError:
            agent.status = AgentStatus.OFFLINE
            agent.response_time = 0
            agent.active_connections = 0
            agent.requests_per_minute = 0
            logger.warning(f"Agent {agent_id} is offline")
            
        except Exception as e:
            agent.status = AgentStatus.UNHEALTHY
            logger.error(f"Health check failed for {agent_id}: {e}")
        
        # Update last update time and calculate uptime
        agent.last_update = datetime.utcnow()
        await self.calculate_uptime(agent_id)
        
        # Store metrics in Redis
        await self.store_agent_metrics(agent)
        
        return agent
    
    async def calculate_uptime(self, agent_id: str):
        """Calculate agent uptime based on historical data"""
        try:
            # Get historical status from Redis
            key = f"agent_status_history:{agent_id}"
            history = await self.redis.lrange(key, 0, 100)  # Last 100 entries
            
            if not history:
                return
                
            healthy_count = sum(1 for status in history if status.decode() == "healthy")
            total_count = len(history)
            
            if total_count > 0:
                self.agents[agent_id].uptime = (healthy_count / total_count) * 100
                
        except Exception as e:
            logger.error(f"Failed to calculate uptime for {agent_id}: {e}")
    
    async def store_agent_metrics(self, agent: AgentMetrics):
        """Store agent metrics in Redis"""
        try:
            # Store current metrics
            key = f"agent_metrics:{agent.id}"
            data = asdict(agent)
            data["last_update"] = agent.last_update.isoformat()
            await self.redis.set(key, json.dumps(data, default=str), ex=3600)
            
            # Store status history
            history_key = f"agent_status_history:{agent.id}"
            await self.redis.lpush(history_key, agent.status.value)
            await self.redis.ltrim(history_key, 0, 100)  # Keep last 100 entries
            await self.redis.expire(history_key, 86400)  # 24 hours
            
        except Exception as e:
            logger.error(f"Failed to store metrics for {agent.id}: {e}")
    
    async def get_system_metrics(self) -> SystemMetrics:
        """Calculate overall system metrics"""
        try:
            active_agents = sum(1 for agent in self.agents.values() 
                             if agent.status != AgentStatus.OFFLINE)
            
            # Calculate average response time for healthy agents
            healthy_agents = [agent for agent in self.agents.values() 
                            if agent.status == AgentStatus.HEALTHY]
            
            avg_response_time = 0.0
            if healthy_agents:
                avg_response_time = sum(agent.response_time for agent in healthy_agents) / len(healthy_agents)
            
            # Calculate system error rate
            total_requests = sum(agent.requests_per_minute for agent in self.agents.values())
            if total_requests > 0:
                weighted_error_rate = sum(
                    agent.error_rate * agent.requests_per_minute 
                    for agent in self.agents.values()
                ) / total_requests
            else:
                weighted_error_rate = 0.0
            
            # Calculate system uptime
            if self.agents:
                system_uptime = sum(agent.uptime for agent in self.agents.values()) / len(self.agents)
            else:
                system_uptime = 100.0
            
            # Get AgriTech specific metrics
            price_updates = await self.get_price_updates_count()
            whatsapp_messages = await self.get_whatsapp_messages_count()
            
            self.system_metrics = SystemMetrics(
                total_requests=int(total_requests * 60),  # Convert to hourly
                average_response_time=avg_response_time,
                error_rate=weighted_error_rate,
                uptime=system_uptime,
                active_agents=active_agents,
                commodities_tracked=6,  # Soja, Milho, Boi, Café, Açúcar, Algodão
                price_updates_last_hour=price_updates,
                whatsapp_messages_last_hour=whatsapp_messages,
                timestamp=datetime.utcnow()
            )
            
            return self.system_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate system metrics: {e}")
            return self.system_metrics
    
    async def get_price_updates_count(self) -> int:
        """Get count of price updates in last hour"""
        try:
            key = "price_updates:hourly"
            count = await self.redis.get(key)
            return int(count) if count else 0
        except:
            return 0
    
    async def get_whatsapp_messages_count(self) -> int:
        """Get count of WhatsApp messages sent in last hour"""
        try:
            key = "whatsapp_messages:hourly"
            count = await self.redis.get(key)
            return int(count) if count else 0
        except:
            return 0
    
    async def monitor_all_agents(self):
        """Monitor all registered agents"""
        logger.info("Starting agent monitoring cycle")
        
        tasks = []
        for agent_id in self.agents.keys():
            task = asyncio.create_task(self.check_agent_health(agent_id))
            tasks.append(task)
        
        # Wait for all health checks to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Update system metrics
        await self.get_system_metrics()
        
        logger.info("Agent monitoring cycle completed")
    
    async def start_monitoring(self, interval: int = 30):
        """Start continuous monitoring"""
        self.monitoring_active = True
        logger.info(f"Starting continuous monitoring with {interval}s interval")
        
        while self.monitoring_active:
            try:
                await self.monitor_all_agents()
                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"Monitoring cycle failed: {e}")
                await asyncio.sleep(interval)
    
    def stop_monitoring(self):
        """Stop continuous monitoring"""
        self.monitoring_active = False
        logger.info("Monitoring stopped")
    
    async def get_agent_metrics(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get stored metrics for specific agent"""
        try:
            key = f"agent_metrics:{agent_id}"
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get metrics for {agent_id}: {e}")
            return None
    
    async def get_all_agents_metrics(self) -> List[Dict[str, Any]]:
        """Get metrics for all agents"""
        metrics = []
        for agent_id in self.agents.keys():
            agent_metrics = await self.get_agent_metrics(agent_id)
            if agent_metrics:
                metrics.append(agent_metrics)
            else:
                # Return current in-memory metrics as fallback
                agent = self.agents[agent_id]
                metrics.append(asdict(agent))
        
        return metrics
    
    async def generate_alert(self, agent_id: str, alert_type: str, message: str):
        """Generate alert for agent issues"""
        alert = {
            "agent_id": agent_id,
            "agent_name": self.agents[agent_id].name,
            "type": alert_type,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": self._get_alert_severity(alert_type)
        }
        
        # Store alert in Redis
        key = f"alerts:{datetime.utcnow().strftime('%Y%m%d')}"
        await self.redis.lpush(key, json.dumps(alert))
        await self.redis.expire(key, 604800)  # Keep for 7 days
        
        # Log alert
        logger.warning(f"Alert generated: {alert}")
        
        # TODO: Send to notification service (Slack, email, etc.)
    
    def _get_alert_severity(self, alert_type: str) -> str:
        """Determine alert severity based on type"""
        severity_map = {
            "agent_offline": "critical",
            "high_error_rate": "high", 
            "slow_response": "medium",
            "high_resource_usage": "medium",
            "connection_issues": "low"
        }
        return severity_map.get(alert_type, "low")


# FastAPI endpoints for monitoring dashboard
monitoring_app = FastAPI(title="SPR Agent Monitoring API")
monitor = AgentMonitor()

@monitoring_app.on_event("startup")
async def startup_event():
    await monitor.initialize()
    # Start monitoring in background
    asyncio.create_task(monitor.start_monitoring(interval=30))

@monitoring_app.on_event("shutdown") 
async def shutdown_event():
    monitor.stop_monitoring()

@monitoring_app.get("/agents")
async def get_all_agents():
    """Get all agents metrics"""
    return await monitor.get_all_agents_metrics()

@monitoring_app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent metrics"""
    metrics = await monitor.get_agent_metrics(agent_id)
    if not metrics:
        return {"error": "Agent not found"}
    return metrics

@monitoring_app.get("/system")
async def get_system_metrics():
    """Get system-wide metrics"""
    return asdict(await monitor.get_system_metrics())

@monitoring_app.post("/agents/{agent_id}/health-check")
async def trigger_health_check(agent_id: str):
    """Trigger manual health check for specific agent"""
    result = await monitor.check_agent_health(agent_id)
    if not result:
        return {"error": "Agent not found"}
    return asdict(result)

@monitoring_app.get("/alerts")
async def get_recent_alerts(days: int = 1):
    """Get recent alerts"""
    alerts = []
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y%m%d')
        key = f"alerts:{date}"
        day_alerts = await monitor.redis.lrange(key, 0, -1)
        for alert_data in day_alerts:
            alerts.append(json.loads(alert_data))
    
    # Sort by timestamp descending
    alerts.sort(key=lambda x: x['timestamp'], reverse=True)
    return alerts[:100]  # Return last 100 alerts

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(monitoring_app, host="0.0.0.0", port=8003)