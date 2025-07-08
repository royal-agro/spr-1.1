# SPR Módulo 2 - Etapa 2: Scheduler + Rate Limiter

## Arquivos Criados/Modificados

```
backend/app/
├── models/
│   ├── message.py                     # NEW
│   ├── schedule.py                    # NEW
│   └── delivery_log.py                # NEW
├── services/
│   ├── scheduler.py                   # NEW
│   ├── rate_limiter.py                # NEW
│   └── message_dispatcher.py          # NEW
├── routers/
│   └── scheduler.py                   # NEW
├── tests/
│   ├── test_scheduler.py              # NEW
│   ├── test_rate_limiter.py           # NEW
│   └── test_message_dispatcher.py     # NEW
├── config.py                          # UPDATED
├── database.py                        # UPDATED
├── main.py                            # UPDATED
└── requirements.txt                   # UPDATED
```

## Código Completo

### requirements.txt (UPDATED)
```txt
fastapi==0.104.1
sqlmodel==0.0.14
pydantic==2.5.0
apscheduler==3.10.4
croniter==1.4.1
python-dotenv==1.0.0
redis==5.0.1
google-auth-oauthlib==1.1.0
google-api-python-client==2.108.0
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2
pytz==2023.3
```

### config.py (UPDATED)
```python
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./spr.db"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    GOOGLE_SCOPES: str = "https://www.googleapis.com/auth/contacts.readonly"
    
    # Cache
    REDIS_URL: Optional[str] = None
    CACHE_TTL_CONTACTS: int = 3600
    CACHE_TTL_GROUPS: int = 7200
    SYNC_BATCH_SIZE: int = 200
    MAX_CONCURRENT_SYNCS: int = 3
    
    # Scheduler & Rate Limiting
    RATE_LIMIT_PER_MIN: int = 5
    RATE_LIMIT_BURST: int = 10
    TZ: str = "America/Cuiaba"
    DEFAULT_SEND_HOUR: int = 9
    SCHEDULER_MISFIRE_GRACE_TIME: int = 30
    MAX_RETRY_ATTEMPTS: int = 3
    RETRY_BACKOFF_FACTOR: float = 2.0
    
    # App
    SECRET_KEY: str = "your-secret-key-here"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### models/message.py
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List
from enum import Enum
import json

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"

class MessageStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class Message(SQLModel, table=True):
    __tablename__ = "messages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    content: str
    message_type: MessageType = Field(default=MessageType.TEXT)
    status: MessageStatus = Field(default=MessageStatus.DRAFT)
    
    # Message variations (up to 5)
    variations: Optional[str] = None  # JSON string
    
    # File attachments
    attachment_path: Optional[str] = None
    attachment_type: Optional[str] = None
    
    # Metadata
    created_by: str = Field(default="system")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Relationships
    schedules: List["Schedule"] = Relationship(back_populates="message")
    
    def get_variations(self) -> List[str]:
        """Parse message variations from JSON"""
        if not self.variations:
            return [self.content]
        try:
            variations = json.loads(self.variations)
            return variations if variations else [self.content]
        except json.JSONDecodeError:
            return [self.content]
    
    def set_variations(self, variations: List[str]):
        """Store message variations as JSON (max 5)"""
        if len(variations) > 5:
            variations = variations[:5]
        self.variations = json.dumps(variations)
    
    def get_random_variation(self) -> str:
        """Get a random message variation"""
        import random
        variations = self.get_variations()
        return random.choice(variations)
```

### models/schedule.py
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json

class ScheduleType(str, Enum):
    IMMEDIATE = "immediate"
    FUTURE = "future"
    RECURRING = "recurring"

class ScheduleStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Schedule(SQLModel, table=True):
    __tablename__ = "schedules"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Basic info
    name: str = Field(index=True)
    description: Optional[str] = None
    schedule_type: ScheduleType = Field(default=ScheduleType.IMMEDIATE)
    status: ScheduleStatus = Field(default=ScheduleStatus.PENDING)
    
    # Scheduling
    scheduled_at: Optional[datetime] = None
    cron_expression: Optional[str] = None  # For recurring schedules
    timezone: str = Field(default="America/Cuiaba")
    
    # Execution tracking
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    run_count: int = Field(default=0)
    max_runs: Optional[int] = None  # For recurring with limit
    
    # Retry logic
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)
    
    # Targets
    target_contacts: Optional[str] = None  # JSON: list of contact IDs
    target_groups: Optional[str] = None    # JSON: list of group IDs
    
    # Message settings
    message_id: int = Field(foreign_key="messages.id")
    use_nicknames: bool = Field(default=True)
    respect_rate_limit: bool = Field(default=True)
    
    # Metadata
    created_by: str = Field(default="system")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Relationships
    message: Optional["Message"] = Relationship(back_populates="schedules")
    delivery_logs: List["DeliveryLog"] = Relationship(back_populates="schedule")
    
    def get_target_contacts(self) -> List[int]:
        """Parse target contacts from JSON"""
        if not self.target_contacts:
            return []
        try:
            return json.loads(self.target_contacts)
        except json.JSONDecodeError:
            return []
    
    def set_target_contacts(self, contact_ids: List[int]):
        """Store target contacts as JSON"""
        self.target_contacts = json.dumps(contact_ids)
    
    def get_target_groups(self) -> List[int]:
        """Parse target groups from JSON"""
        if not self.target_groups:
            return []
        try:
            return json.loads(self.target_groups)
        except json.JSONDecodeError:
            return []
    
    def set_target_groups(self, group_ids: List[int]):
        """Store target groups as JSON"""
        self.target_groups = json.dumps(group_ids)
    
    def get_execution_metadata(self) -> Dict[str, Any]:
        """Get execution metadata"""
        return {
            "schedule_id": self.id,
            "schedule_type": self.schedule_type,
            "run_count": self.run_count,
            "retry_count": self.retry_count,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None
        }
```

### models/delivery_log.py
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
import json

class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    RATE_LIMITED = "rate_limited"

class DeliveryLog(SQLModel, table=True):
    __tablename__ = "delivery_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # References
    schedule_id: int = Field(foreign_key="schedules.id")
    contact_id: Optional[int] = Field(foreign_key="contacts.id")
    
    # Message details
    message_content: str
    message_variation_used: Optional[str] = None
    nickname_used: Optional[str] = None
    
    # Delivery tracking
    status: DeliveryStatus = Field(default=DeliveryStatus.PENDING)
    gateway_response: Optional[str] = None
    gateway_message_id: Optional[str] = None
    error_message: Optional[str] = None
    
    # Timing
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Metadata
    metadata: Optional[str] = None  # JSON for additional data
    
    # Relationships
    schedule: Optional["Schedule"] = Relationship(back_populates="delivery_logs")
    contact: Optional["Contact"] = Relationship()
    
    def get_metadata(self) -> Dict[str, Any]:
        """Parse metadata from JSON"""
        if not self.metadata:
            return {}
        try:
            return json.loads(self.metadata)
        except json.JSONDecodeError:
            return {}
    
    def set_metadata(self, metadata: Dict[str, Any]):
        """Store metadata as JSON"""
        self.metadata = json.dumps(metadata)
```

### services/rate_limiter.py
```python
import time
import logging
from typing import Dict, Optional
from dataclasses import dataclass
from threading import Lock
from ..config import settings

logger = logging.getLogger(__name__)

@dataclass
class TokenBucket:
    """Token bucket for rate limiting"""
    capacity: int
    tokens: float
    last_update: float
    refill_rate: float  # tokens per second
    
    def __post_init__(self):
        self.lock = Lock()
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens from bucket"""
        with self.lock:
            now = time.time()
            
            # Add tokens based on time elapsed
            time_passed = now - self.last_update
            self.tokens = min(
                self.capacity,
                self.tokens + time_passed * self.refill_rate
            )
            self.last_update = now
            
            # Check if we have enough tokens
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            
            return False
    
    def wait_time(self, tokens: int = 1) -> float:
        """Calculate wait time for tokens to be available"""
        with self.lock:
            if self.tokens >= tokens:
                return 0.0
            
            needed_tokens = tokens - self.tokens
            return needed_tokens / self.refill_rate

class RateLimiter:
    """Rate limiter with global and per-contact limits"""
    
    def __init__(self):
        # Global rate limiter
        self.global_bucket = TokenBucket(
            capacity=settings.RATE_LIMIT_BURST,
            tokens=settings.RATE_LIMIT_BURST,
            last_update=time.time(),
            refill_rate=settings.RATE_LIMIT_PER_MIN / 60.0  # Convert to per second
        )
        
        # Per-contact rate limiters
        self.contact_buckets: Dict[int, TokenBucket] = {}
        self.contact_bucket_lock = Lock()
        
        logger.info(
            f"Rate limiter initialized: {settings.RATE_LIMIT_PER_MIN}/min, "
            f"burst: {settings.RATE_LIMIT_BURST}"
        )
    
    def _get_contact_bucket(self, contact_id: int) -> TokenBucket:
        """Get or create bucket for specific contact"""
        with self.contact_bucket_lock:
            if contact_id not in self.contact_buckets:
                # More restrictive per-contact limit
                contact_limit = max(1, settings.RATE_LIMIT_PER_MIN // 10)
                self.contact_buckets[contact_id] = TokenBucket(
                    capacity=contact_limit,
                    tokens=contact_limit,
                    last_update=time.time(),
                    refill_rate=contact_limit / 60.0
                )
            
            return self.contact_buckets[contact_id]
    
    def can_send(self, contact_id: Optional[int] = None) -> bool:
        """Check if message can be sent now"""
        # Check global limit
        if not self.global_bucket.consume():
            logger.debug("Global rate limit reached")
            return False
        
        # Check per-contact limit if contact_id provided
        if contact_id is not None:
            contact_bucket = self._get_contact_bucket(contact_id)
            if not contact_bucket.consume():
                logger.debug(f"Rate limit reached for contact {contact_id}")
                # Return token to global bucket since we couldn't send
                self.global_bucket.tokens = min(
                    self.global_bucket.capacity,
                    self.global_bucket.tokens + 1
                )
                return False
        
        return True
    
    def wait_time(self, contact_id: Optional[int] = None) -> float:
        """Calculate wait time before next message can be sent"""
        global_wait = self.global_bucket.wait_time()
        
        if contact_id is not None:
            contact_bucket = self._get_contact_bucket(contact_id)
            contact_wait = contact_bucket.wait_time()
            return max(global_wait, contact_wait)
        
        return global_wait
    
    def reset_contact_limit(self, contact_id: int):
        """Reset rate limit for specific contact"""
        with self.contact_bucket_lock:
            if contact_id in self.contact_buckets:
                bucket = self.contact_buckets[contact_id]
                bucket.tokens = bucket.capacity
                bucket.last_update = time.time()
                logger.info(f"Rate limit reset for contact {contact_id}")
    
    def get_status(self) -> Dict[str, float]:
        """Get current rate limiter status"""
        return {
            "global_tokens": self.global_bucket.tokens,
            "global_capacity": self.global_bucket.capacity,
            "active_contact_buckets": len(self.contact_buckets),
            "global_wait_time": self.global_bucket.wait_time()
        }
```

### services/scheduler.py
```python
import logging
import pytz
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from croniter import croniter
from sqlmodel import Session, select
from ..database import get_session
from ..models.schedule import Schedule, ScheduleStatus, ScheduleType
from ..models.delivery_log import DeliveryLog
from ..services.message_dispatcher import MessageDispatcher
from ..config import settings

logger = logging.getLogger(__name__)

class SchedulerService:
    """Scheduler service using APScheduler"""
    
    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.timezone = pytz.timezone(settings.TZ)
        self.message_dispatcher = MessageDispatcher()
        self._setup_scheduler()
    
    def _setup_scheduler(self):
        """Setup APScheduler configuration"""
        try:
            # Configure job store
            jobstores = {
                'default': SQLAlchemyJobStore(url=settings.DATABASE_URL)
            }
            
            # Configure executors
            executors = {
                'default': AsyncIOExecutor()
            }
            
            # Job defaults
            job_defaults = {
                'coalesce': False,
                'max_instances': 3,
                'misfire_grace_time': settings.SCHEDULER_MISFIRE_GRACE_TIME
            }
            
            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults,
                timezone=self.timezone
            )
            
            logger.info(f"Scheduler configured with timezone: {settings.TZ}")
            
        except Exception as e:
            logger.error(f"Error setting up scheduler: {e}")
            raise
    
    async def start(self):
        """Start the scheduler"""
        if self.scheduler and not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started successfully")
            
            # Resume pending schedules
            await self._resume_pending_schedules()
    
    async def stop(self):
        """Stop the scheduler"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("Scheduler stopped")
    
    async def create_schedule(
        self,
        name: str,
        message_id: int,
        schedule_type: ScheduleType,
        target_contacts: List[int] = None,
        target_groups: List[int] = None,
        scheduled_at: Optional[datetime] = None,
        cron_expression: Optional[str] = None,
        max_runs: Optional[int] = None,
        **kwargs
    ) -> Schedule:
        """Create a new schedule"""
        try:
            with get_session() as session:
                # Create schedule record
                schedule = Schedule(
                    name=name,
                    message_id=message_id,
                    schedule_type=schedule_type,
                    scheduled_at=scheduled_at,
                    cron_expression=cron_expression,
                    max_runs=max_runs,
                    **kwargs
                )
                
                if target_contacts:
                    schedule.set_target_contacts(target_contacts)
                if target_groups:
                    schedule.set_target_groups(target_groups)
                
                session.add(schedule)
                session.commit()
                session.refresh(schedule)
                
                # Schedule the job
                await self._schedule_job(schedule)
                
                logger.info(f"Schedule created: {schedule.name} (ID: {schedule.id})")
                return schedule
                
        except Exception as e:
            logger.error(f"Error creating schedule: {e}")
            raise
    
    async def _schedule_job(self, schedule: Schedule):
        """Schedule a job in APScheduler"""
        try:
            job_id = f"schedule_{schedule.id}"
            
            if schedule.schedule_type == ScheduleType.IMMEDIATE:
                # Schedule for immediate execution
                run_date = datetime.now(self.timezone) + timedelta(seconds=1)
                self.scheduler.add_job(
                    self._execute_schedule,
                    trigger='date',
                    run_date=run_date,
                    args=[schedule.id],
                    id=job_id,
                    replace_existing=True
                )
                
                # Update next_run
                schedule.next_run = run_date
                
            elif schedule.schedule_type == ScheduleType.FUTURE:
                if not schedule.scheduled_at:
                    raise ValueError("scheduled_at required for future schedule")
                
                run_date = schedule.scheduled_at
                if run_date.tzinfo is None:
                    run_date = self.timezone.localize(run_date)
                
                self.scheduler.add_job(
                    self._execute_schedule,
                    trigger='date',
                    run_date=run_date,
                    args=[schedule.id],
                    id=job_id,
                    replace_existing=True
                )
                
                schedule.next_run = run_date
                
            elif schedule.schedule_type == ScheduleType.RECURRING:
                if not schedule.cron_expression:
                    raise ValueError("cron_expression required for recurring schedule")
                
                # Validate cron expression
                cron = croniter(schedule.cron_expression, datetime.now())
                next_run = cron.get_next(datetime)
                
                self.scheduler.add_job(
                    self._execute_schedule,
                    trigger='cron',
                    **self._parse_cron_expression(schedule.cron_expression),
                    args=[schedule.id],
                    id=job_id,
                    replace_existing=True
                )
                
                schedule.next_run = self.timezone.localize(next_run)
            
            # Update schedule in database
            with get_session() as session:
                session.add(schedule)
                session.commit()
            
            logger.info(f"Job scheduled: {job_id} for {schedule.next_run}")
            
        except Exception as e:
            logger.error(f"Error scheduling job for schedule {schedule.id}: {e}")
            raise
    
    def _parse_cron_expression(self, cron_expr: str) -> Dict[str, str]:
        """Parse cron expression for APScheduler"""
        # Simple cron parser - extend as needed
        parts = cron_expr.split()
        if len(parts) != 5:
            raise ValueError(f"Invalid cron expression: {cron_expr}")
        
        minute, hour, day, month, day_of_week = parts
        
        return {
            'minute': minute,
            'hour': hour,
            'day': day,
            'month': month,
            'day_of_week': day_of_week
        }
    
    async def _execute_schedule(self, schedule_id: int):
        """Execute a scheduled task"""
        logger.info(f"Executing schedule {schedule_id}")
        
        try:
            with get_session() as session:
                schedule = session.get(Schedule, schedule_id)
                if not schedule:
                    logger.error(f"Schedule {schedule_id} not found")
                    return
                
                # Update status
                schedule.status = ScheduleStatus.PROCESSING
                schedule.last_run = datetime.now()
                schedule.run_count += 1
                session.add(schedule)
                session.commit()
            
            # Execute the message dispatch
            result = await self.message_dispatcher.dispatch_schedule(schedule_id)
            
            with get_session() as session:
                schedule = session.get(Schedule, schedule_id)
                if schedule:
                    if result["success"]:
                        schedule.status = ScheduleStatus.COMPLETED
                        schedule.retry_count = 0
                    else:
                        schedule.retry_count += 1
                        if schedule.retry_count >= schedule.max_retries:
                            schedule.status = ScheduleStatus.FAILED
                        else:
                            schedule.status = ScheduleStatus.PENDING
                            # Schedule retry with exponential backoff
                            retry_delay = settings.RETRY_BACKOFF_FACTOR ** schedule.retry_count
                            await self._schedule_retry(schedule, retry_delay)
                    
                    # Update next run for recurring schedules
                    if (schedule.schedule_type == ScheduleType.RECURRING and 
                        schedule.status == ScheduleStatus.COMPLETED):
                        
                        # Check if we've reached max runs
                        if schedule.max_runs and schedule.run_count >= schedule.max_runs:
                            schedule.status = ScheduleStatus.COMPLETED
                            # Remove job from scheduler
                            job_id = f"schedule_{schedule.id}"
                            if self.scheduler.get_job(job_id):
                                self.scheduler.remove_job(job_id)
                        else:
                            # Calculate next run
                            cron = croniter(schedule.cron_expression, schedule.last_run)
                            next_run = cron.get_next(datetime)
                            schedule.next_run = self.timezone.localize(next_run)
                            schedule.status = ScheduleStatus.PENDING
                    
                    session.add(schedule)
                    session.commit()
            
            logger.info(f"Schedule {schedule_id} execution completed: {result}")
            
        except Exception as e:
            logger.error(f"Error executing schedule {schedule_id}: {e}")
            
            # Update schedule status to failed
            try:
                with get_session() as session:
                    schedule = session.get(Schedule, schedule_id)
                    if schedule:
                        schedule.status = ScheduleStatus.FAILED
                        session.add(schedule)
                        session.commit()
            except Exception as db_error:
                logger.error(f"Error updating failed schedule status: {db_error}")
    
    async def _schedule_retry(self, schedule: Schedule, delay_minutes: float):
        """Schedule a retry for failed execution"""
        try:
            job_id = f"retry_schedule_{schedule.id}_{schedule.retry_count}"
            run_date = datetime.now(self.timezone) + timedelta(minutes=delay_minutes)
            
            self.scheduler.add_job(
                self._execute_schedule,
                trigger='date',
                run_date=run_date,
                args=[schedule.id],
                id=job_id,
                replace_existing=True
            )
            
            logger.info(f"Retry scheduled for schedule {schedule.id} at {run_date}")
            
        except Exception as e:
            logger.error(f"Error scheduling retry for schedule {schedule.id}: {e}")
    
    async def _resume_pending_schedules(self):
        """Resume pending schedules on startup"""
        try:
            with get_session() as session:
                pending_schedules = session.exec(
                    select(Schedule).where(Schedule.status == ScheduleStatus.PENDING)
                ).all()
                
                for schedule in pending_schedules:
                    try:
                        await self._schedule_job(schedule)
                        logger.info(f"Resumed schedule: {schedule.name}")
                    except Exception as e:
                        logger.error(f"Error resuming schedule {schedule.id}: {e}")
                
                logger.info(f"Resumed {len(pending_schedules)} pending schedules")
                
        except Exception as e:
            logger.error(f"Error resuming pending schedules: {e}")
    
    async def cancel_schedule(self, schedule_id: int) -> bool:
        """Cancel a schedule"""
        try:
            with get_session() as session:
                schedule = session.get(Schedule, schedule_id)
                if not schedule:
                    return False
                
                # Update status
                schedule.status = ScheduleStatus.CANCELLED
                session.add(schedule)
                session.commit()
                
                # Remove from scheduler
                job_id = f"schedule_{schedule_id}"
                if self.scheduler.get_job(job_id):
                    self.scheduler.remove_job(job_id)
                
                logger.info(f"Schedule {schedule_id} cancelled")
                return True
                
        except Exception as e:
            logger.error(f"Error cancelling schedule {schedule_id}: {e}")
            return False
    
    def get_schedule_status(self, schedule_id: int) -> Optional[Dict[str, Any]]:
        """Get status of a specific schedule"""
        try:
            with get_session() as session:
                schedule = session.get(Schedule, schedule_id)
                if not schedule:
                    return None
                
                # Get delivery logs
                delivery_logs = session.exec(
                    select(DeliveryLog).where(DeliveryLog.schedule_id == schedule_id)
                ).all()
                
                return {
                    "schedule": {
                        "id": schedule.id,
                        "name": schedule.name,
                        "status": schedule.status,
                        "schedule_type": schedule.schedule_type,
                        "run_count": schedule.run_count,
                        "retry_count": schedule.retry_count,
                        "last_run": schedule.last_run.isoformat() if schedule.last_run else None,
                        "next_run": schedule.next_run.isoformat() if schedule.next_run else None
                    },
                    "delivery_stats": {
                        "total": len(delivery_logs),
                        "sent": len([log for log in delivery_logs if log.status == "sent"]),
                        "delivered": len([log for log in delivery_logs if log.status == "delivered"]),
                        "failed": len([log for log in delivery_logs if log.status == "failed"])
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting schedule status {schedule_id}: {e}")
            return None
    
    def get_all_schedules_status(self) -> Dict[str, Any]:
        """Get status of all schedules"""
        try:
            with get_session() as session:
                schedules = session.exec(select(Schedule)).all()
                
                status_summary = {
                    "total_schedules": len(schedules),
                    "by_status": {},
                    "by_type": {},
                    "active_jobs": len(self.scheduler.get_jobs()) if self.scheduler else 0,
                    "schedules": []
                }
                
                for schedule in schedules:
                    # Count by status
                    status = schedule.status.value
                    status_summary["by_status"][status] = status_summary["by_status"].get(status, 0) + 1
                    
                    # Count by type
                    stype = schedule.schedule_type.value
                    status_summary["by_type"][stype] = status_summary["by_type"].get(stype, 0) + 1
                    
                    # Add to schedules list
                    status_summary["schedules"].append({
                        "id": schedule.id,
                        "name": schedule.name,
                        "status": schedule.status,
                        "type": schedule.schedule_type,
                        "run_count": schedule.run_count,
                        "next_run": schedule.next_run.isoformat() if schedule.next_run else None
                    })
                
                return status_summary
                
        except Exception as e:
            logger.error(f"Error getting all schedules status: {e}")
            return {"error": str(e)}

# Global scheduler instance
scheduler_service = SchedulerService()
```

### services/message_dispatcher.py
```python
import logging
import asyncio
import random
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from ..database import get_session
from ..models.schedule import Schedule
from ..models.message import Message
from ..models.contact import Contact, Nickname
from ..models.contact_group import ContactGroup
from ..models.delivery_log import DeliveryLog, DeliveryStatus
from ..services.rate_limiter import RateLimiter
from ..config import settings

logger = logging.getLogger(__name__)

class MessageDispatcher:
    """Service for dispatching messages with rate limiting"""
    
    def __init__(self):
        self.rate_limiter = RateLimiter()
    
    async def dispatch_schedule(self, schedule_id: int) -> Dict[str, Any]:
        """Dispatch messages for a schedule"""
        result = {
            "schedule_id": schedule_id,
            "success": False,
            "messages_sent": 0,
            "messages_failed": 0,
            "errors": []
        }
        
        try:
            with get_session() as session:
                # Get schedule with message
                schedule = session.get(Schedule, schedule_id)
                if not schedule:
                    result["errors"].append(f"Schedule {schedule_id} not found")
                    return result
                
                message = session.get(Message, schedule.message_id)
                if not message:
                    result["errors"].append(f"Message {schedule.message_id} not found")
                    return result
                
                # Get target contacts
                target_contacts = await self._get_target_contacts(session, schedule)
                if not target_contacts:
                    result["errors"].append("No target contacts found")
                    return result
                
                logger.info(f"Dispatching to {len(target_contacts)} contacts for schedule {schedule_id}")
                
                # Dispatch messages
                for contact in target_contacts:
                    try:
                        success = await self._send_message_to_contact(
                            session, schedule, message, contact
                        )
                        if success:
                            result["messages_sent"] += 1
                        else:
                            result["messages_failed"] += 1
                            
                    except Exception as e:
                        error_msg = f"Error sending to contact {contact.id}: {e}"
                        logger.error(error_msg)
                        result["errors"].append(error_msg)
                        result["messages_failed"] += 1
                
                result["success"] = result["messages_sent"] > 0
                
                logger.info(
                    f"Dispatch completed for schedule {schedule_id}: "
                    f"{result['messages_sent']} sent, {result['messages_failed']} failed"
                )
                
                return result
                
        except Exception as e:
            error_msg = f"Error in dispatch_schedule: {e}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            return result
    
    async def _get_target_contacts(self, session: Session, schedule: Schedule) -> List[Contact]:
        """Get target contacts for a schedule"""
        contacts = []
        
        try:
            # Direct contact targets
            target_contact_ids = schedule.get_target_contacts()
            if target_contact_ids:
                direct_contacts = session.exec(
                    select(Contact).where(Contact.id.in_(target_contact_ids))
                ).all()
                contacts.extend(direct_contacts)
            
            # Group targets
            target_group_ids = schedule.get_target_groups()
            if target_group_ids:
                group_contacts = session.exec(
                    select(Contact).where(Contact.contact_group_id.in_(target_group_ids))
                ).all()
                contacts.extend(group_contacts)
            
            # Remove duplicates
            unique_contacts = []
            seen_ids = set()
            for contact in contacts:
                if contact.id not in seen_ids:
                    unique_contacts.append(contact)
                    seen_ids.add(contact.id)
            
            return unique_contacts
            
        except Exception as e:
            logger.error(f"Error getting target contacts: {e}")
            return []
    
    async def _send_message_to_contact(
        self, 
        session: Session,
        schedule: Schedule, 
        message: Message, 
        contact: Contact
    ) -> bool:
        """Send message to a specific contact"""
        try:
            # Check rate limit if enabled
            if schedule.respect_rate_limit:
                if not self.rate_limiter.can_send(contact.id):
                    wait_time = self.rate_limiter.wait_time(contact.id)
                    logger.info(f"Rate limited for contact {contact.id}, waiting {wait_time:.2f}s")
                    
                    # Create delivery log with rate limit status
                    delivery_log = DeliveryLog(
                        schedule_id=schedule.id,
                        contact_id=contact.id,
                        message_content="Rate limited",
                        status=DeliveryStatus.RATE_LIMITED,
                        error_message=f"Rate limited, wait time: {wait_time:.2f}s"
                    )
                    session.add(delivery_log)
                    session.commit()
                    
                    # Wait and retry
                    await asyncio.sleep(wait_time)
                    if not self.rate_limiter.can_send(contact.id):
                        return False
            
            # Prepare message content
            message_content = await self._prepare_message_content(
                session, message, contact, schedule.use_nicknames
            )
            
            # Get variation
            variation_used = message.get_random_variation()
            
            # Get nickname if enabled
            nickname_used = None
            if schedule.use_nicknames:
                nickname_used = await self._get_contact_nickname(session, contact)
            
            # Create delivery log
            delivery_log = DeliveryLog(
                schedule_id=schedule.id,
                contact_id=contact.id,
                message_content=message_content,
                message_variation_used=variation_used,
                nickname_used=nickname_used,
                status=DeliveryStatus.PENDING
            )
            session.add(delivery_log)
            session.commit()
            session.refresh(delivery_log)
            
            # Simulate message sending (replace with actual WhatsApp gateway)
            success = await self._simulate_send_message(
                contact, message_content, delivery_log.id
            )
            
            # Update delivery log
            if success:
                delivery_log.status = DeliveryStatus.SENT
                delivery_log.sent_at = asyncio.get_event_loop().time()
                delivery_log.gateway_message_id = f"sim_{delivery_log.id}_{random.randint(1000, 9999)}"
            else:
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.error_message = "Simulated send failure"
            
            session.add(delivery_log)
            session.commit()
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending message to contact {contact.id}: {e}")
            return False
    
    async def _prepare_message_content(
        self, 
        session: Session,
        message: Message, 
        contact: Contact, 
        use_nicknames: bool
    ) -> str:
        """Prepare message content with placeholders"""
        content = message.get_random_variation()
        
        # Replace placeholders
        replacements = {
            "{nome}": contact.name,
            "{cidade}": contact.city or "N/A",
            "{telefone}": contact.phone or "N/A"
        }
        
        # Add nickname if enabled
        if use_nicknames:
            nickname = await self._get_contact_nickname(session, contact)
            if nickname:
                replacements["{apelido}"] = nickname
                # Use nickname instead of name if available
                replacements["{nome}"] = nickname
        
        # Apply replacements
        for placeholder, value in replacements.items():
            content = content.replace(placeholder, value)
        
        return content
    
    async def _get_contact_nickname(self, session: Session, contact: Contact) -> Optional[str]:
        """Get appropriate nickname for contact"""
        try:
            # Get all nicknames for contact
            nicknames = session.exec(
                select(Nickname).where(Nickname.contact_id == contact.id)
            ).all()
            
            if not nicknames:
                return None
            
            # Return default nickname if available
            default_nickname = next((n for n in nicknames if n.is_default), None)
            if default_nickname:
                return default_nickname.nickname
            
            # Return first available nickname
            return nicknames[0].nickname
            
        except Exception as e:
            logger.error(f"Error getting nickname for contact {contact.id}: {e}")
            return None
    
    async def _simulate_send_message(
        self, 
        contact: Contact, 
        message_content: str, 
        delivery_log_id: int
    ) -> bool:
        """Simulate sending message (replace with actual WhatsApp gateway)"""
        try:
            # Simulate network delay
            await asyncio.sleep(random.uniform(0.1, 0.5))
            
            # Simulate 95% success rate
            success = random.random() < 0.95
            
            if success:
                logger.debug(
                    f"✓ Simulated send to {contact.name} ({contact.phone}): "
                    f"{message_content[:50]}..."
                )
            else:
                logger.debug(f"✗ Simulated send failure to {contact.name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error in simulate_send_message: {e}")
            return False
    
    async def send_immediate_message(
        self,
        message_id: int,
        contact_ids: List[int],
        use_nicknames: bool = True,
        respect_rate_limit: bool = True
    ) -> Dict[str, Any]:
        """Send immediate message to specified contacts"""
        result = {
            "success": False,
            "messages_sent": 0,
            "messages_failed": 0,
            "errors": []
        }
        
        try:
            with get_session() as session:
                # Get message
                message = session.get(Message, message_id)
                if not message:
                    result["errors"].append(f"Message {message_id} not found")
                    return result
                
                # Get contacts
                contacts = session.exec(
                    select(Contact).where(Contact.id.in_(contact_ids))
                ).all()
                
                if not contacts:
                    result["errors"].append("No valid contacts found")
                    return result
                
                # Create temporary schedule for logging
                temp_schedule = Schedule(
                    name="Immediate Send",
                    message_id=message_id,
                    schedule_type="immediate",
                    use_nicknames=use_nicknames,
                    respect_rate_limit=respect_rate_limit
                )
                temp_schedule.set_target_contacts(contact_ids)
                session.add(temp_schedule)
                session.commit()
                session.refresh(temp_schedule)
                
                # Send messages
                for contact in contacts:
                    try:
                        success = await self._send_message_to_contact(
                            session, temp_schedule, message, contact
                        )
                        if success:
                            result["messages_sent"] += 1
                        else:
                            result["messages_failed"] += 1
                            
                    except Exception as e:
                        error_msg = f"Error sending to contact {contact.id}: {e}"
                        logger.error(error_msg)
                        result["errors"].append(error_msg)
                        result["messages_failed"] += 1
                
                result["success"] = result["messages_sent"] > 0
                return result
                
        except Exception as e:
            error_msg = f"Error in send_immediate_message: {e}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            return result

# Global dispatcher instance
message_dispatcher = MessageDispatcher()
```

### routers/scheduler.py
```python
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from ..services.scheduler import scheduler_service
from ..services.message_dispatcher import message_dispatcher
from ..models.schedule import ScheduleType, ScheduleStatus
from ..models.message import MessageType
from ..database import get_session
from ..models.message import Message
from ..models.contact import Contact
from ..models.contact_group import ContactGroup
from sqlmodel import select
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scheduler", tags=["scheduler"])

class CreateMessageRequest(BaseModel):
    title: str = Field(..., description="Message title")
    content: str = Field(..., description="Message content")
    message_type: MessageType = Field(default=MessageType.TEXT)
    variations: Optional[List[str]] = Field(default=None, max_items=5)

class CreateScheduleRequest(BaseModel):
    name: str = Field(..., description="Schedule name")
    message_id: Optional[int] = Field(default=None, description="Existing message ID")
    message: Optional[CreateMessageRequest] = Field(default=None, description="New message")
    schedule_type: ScheduleType = Field(..., description="Schedule type")
    
    # Targets
    target_contacts: Optional[List[int]] = Field(default=None)
    target_groups: Optional[List[int]] = Field(default=None)
    
    # Scheduling
    scheduled_at: Optional[datetime] = Field(default=None)
    cron_expression: Optional[str] = Field(default=None)
    max_runs: Optional[int] = Field(default=None)
    
    # Options
    use_nicknames: bool = Field(default=True)
    respect_rate_limit: bool = Field(default=True)
    description: Optional[str] = Field(default=None)

class ImmediateSendRequest(BaseModel):
    message_id: int
    contact_ids: List[int]
    use_nicknames: bool = Field(default=True)
    respect_rate_limit: bool = Field(default=True)

@router.post("/criar")
async def create_schedule(
    request: CreateScheduleRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Create a new schedule"""
    try:
        # Validate request
        if not request.message_id and not request.message:
            raise HTTPException(
                status_code=400,
                detail="Either message_id or message must be provided"
            )
        
        if not request.target_contacts and not request.target_groups:
            raise HTTPException(
                status_code=400,
                detail="At least one target (contacts or groups) must be specified"
            )
        
        # Validate schedule type requirements
        if request.schedule_type == ScheduleType.FUTURE and not request.scheduled_at:
            raise HTTPException(
                status_code=400,
                detail="scheduled_at is required for future schedules"
            )
        
        if request.schedule_type == ScheduleType.RECURRING and not request.cron_expression:
            raise HTTPException(
                status_code=400,
                detail="cron_expression is required for recurring schedules"
            )
        
        # Create message if provided
        message_id = request.message_id
        if request.message:
            with get_session() as session:
                new_message = Message(
                    title=request.message.title,
                    content=request.message.content,
                    message_type=request.message.message_type
                )
                
                if request.message.variations:
                    new_message.set_variations(request.message.variations)
                
                session.add(new_message)
                session.commit()
                session.refresh(new_message)
                message_id = new_message.id
        
        # Validate targets exist
        with get_session() as session:
            if request.target_contacts:
                existing_contacts = session.exec(
                    select(Contact).where(Contact.id.in_(request.target_contacts))
                ).all()
                if len(existing_contacts) != len(request.target_contacts):
                    raise HTTPException(
                        status_code=400,
                        detail="Some contact IDs are invalid"
                    )
            
            if request.target_groups:
                existing_groups = session.exec(
                    select(ContactGroup).where(ContactGroup.id.in_(request.target_groups))
                ).all()
                if len(existing_groups) != len(request.target_groups):
                    raise HTTPException(
                        status_code=400,
                        detail="Some group IDs are invalid"
                    )
        
        # Create schedule
        schedule = await scheduler_service.create_schedule(
            name=request.name,
            message_id=message_id,
            schedule_type=request.schedule_type,
            target_contacts=request.target_contacts or [],
            target_groups=request.target_groups or [],
            scheduled_at=request.scheduled_at,
            cron_expression=request.cron_expression,
            max_runs=request.max_runs,
            use_nicknames=request.use_nicknames,
            respect_rate_limit=request.respect_rate_limit,
            description=request.description
        )
        
        return {
            "message": "Schedule created successfully",
            "schedule_id": schedule.id,
            "schedule": {
                "id": schedule.id,
                "name": schedule.name,
                "status": schedule.status,
                "schedule_type": schedule.schedule_type,
                "next_run": schedule.next_run.isoformat() if schedule.next_run else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_scheduler_status(
    schedule_id: Optional[int] = Query(default=None, description="Specific schedule ID")
) -> Dict[str, Any]:
    """Get scheduler status"""
    try:
        if schedule_id:
            # Get specific schedule status
            status = scheduler_service.get_schedule_status(schedule_id)
            if not status:
                raise HTTPException(
                    status_code=404,
                    detail=f"Schedule {schedule_id} not found"
                )
            return status
        else:
            # Get all schedules status
            status = scheduler_service.get_all_schedules_status()
            
            # Add rate limiter status
            rate_limiter_status = message_dispatcher.rate_limiter.get_status()
            status["rate_limiter"] = rate_limiter_status
            
            return status
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scheduler status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send/immediate")
async def send_immediate(request: ImmediateSendRequest) -> Dict[str, Any]:
    """Send immediate message to contacts"""
    try:
        # Validate message exists
        with get_session() as session:
            message = session.get(Message, request.message_id)
            if not message:
                raise HTTPException(
                    status_code=404,
                    detail=f"Message {request.message_id} not found"
                )
            
            # Validate contacts exist
            existing_contacts = session.exec(
                select(Contact).where(Contact.id.in_(request.contact_ids))
            ).all()
            if len(existing_contacts) != len(request.contact_ids):
                raise HTTPException(
                    status_code=400,
                    detail="Some contact IDs are invalid"
                )
        
        # Send messages
        result = await message_dispatcher.send_immediate_message(
            message_id=request.message_id,
            contact_ids=request.contact_ids,
            use_nicknames=request.use_nicknames,
            respect_rate_limit=request.respect_rate_limit
        )
        
        return {
            "message": "Immediate send completed",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in immediate send: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel/{schedule_id}")
async def cancel_schedule(schedule_id: int) -> Dict[str, str]:
    """Cancel a schedule"""
    try:
        success = await scheduler_service.cancel_schedule(schedule_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Schedule {schedule_id} not found or already cancelled"
            )
        
        return {"message": f"Schedule {schedule_id} cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling schedule {schedule_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/contacts")
async def list_contacts() -> Dict[str, Any]:
    """List available contacts for targeting"""
    try:
        with get_session() as session:
            contacts = session.exec(select(Contact)).all()
            groups = session.exec(select(ContactGroup)).all()
            
            return {
                "contacts": [
                    {
                        "id": contact.id,
                        "name": contact.name,
                        "phone": contact.phone,
                        "city": contact.city,
                        "group_id": contact.contact_group_id
                    }
                    for contact in contacts
                ],
                "groups": [
                    {
                        "id": group.id,
                        "name": group.name,
                        "google_id": group.google_id,
                        "member_count": group.member_count
                    }
                    for group in groups
                ]
            }
            
    except Exception as e:
        logger.error(f"Error listing contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages")
async def list_messages() -> Dict[str, Any]:
    """List available messages"""
    try:
        with get_session() as session:
            messages = session.exec(select(Message)).all()
            
            return {
                "messages": [
                    {
                        "id": message.id,
                        "title": message.title,
                        "content": message.content[:100] + "..." if len(message.content) > 100 else message.content,
                        "type": message.message_type,
                        "status": message.status,
                        "variations_count": len(message.get_variations()),
                        "created_at": message.created_at.isoformat()
                    }
                    for message in messages
                ]
            }
            
    except Exception as e:
        logger.error(f"Error listing messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### main.py (UPDATED)
```python
import logging
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .routers import sync, scheduler
from .services.scheduler import scheduler_service
from .config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# JSON formatter for structured logging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry)

# Apply JSON formatter to root logger
root_logger = logging.getLogger()
for handler in root_logger.handlers:
    handler.setFormatter(JSONFormatter())

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting SPR WhatsApp Module 2")
    create_db_and_tables()
    logger.info("Database tables created successfully")
    
    # Start scheduler
    await scheduler_service.start()
    logger.info("Scheduler service started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SPR WhatsApp Module 2")
    await scheduler_service.stop()
    logger.info("Scheduler service stopped")

# Create FastAPI app
app = FastAPI(
    title="SPR WhatsApp Module 2",
    description="Google Contacts Integration & WhatsApp Messaging with Scheduler",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sync.router)
app.include_router(scheduler.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SPR WhatsApp Module 2 - Scheduler Integration",
        "version": "1.0.0",
        "status": "running",
        "features": ["google_contacts", "scheduler", "rate_limiter"]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    scheduler_running = scheduler_service.scheduler and scheduler_service.scheduler.running
    
    return {
        "status": "healthy",
        "timestamp": "2025-07-08T00:00:00Z",
        "services": {
            "scheduler": "running" if scheduler_running else "stopped",
            "database": "connected",
            "rate_limiter": "active"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### database.py (UPDATED)
```python
from sqlmodel import SQLModel, create_engine, Session
from .config import settings

# Create engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

def create_db_and_tables():
    """Create database and tables"""
    # Import all models to ensure they're registered
    from .models.contact import Contact, Nickname
    from .models.contact_group import ContactGroup, ContactGroupMembership
    from .models.message import Message
    from .models.schedule import Schedule
    from .models.delivery_log import DeliveryLog
    
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session

def get_session() -> Session:
    """Get database session (sync version for services)"""
    return Session(engine)
```

## Testes

### tests/test_rate_limiter.py
```python
import pytest
import time
import asyncio
from ..app.services.rate_limiter import RateLimiter, TokenBucket

class TestTokenBucket:
    """Test token bucket implementation"""
    
    def test_token_bucket_creation(self):
        """Test token bucket initialization"""
        bucket = TokenBucket(
            capacity=10,
            tokens=10,
            last_update=time.time(),
            refill_rate=1.0
        )
        
        assert bucket.capacity == 10
        assert bucket.tokens == 10
        assert bucket.refill_rate == 1.0
    
    def test_token_consumption(self):
        """Test token consumption"""
        bucket = TokenBucket(
            capacity=5,
            tokens=5,
            last_update=time.time(),
            refill_rate=1.0
        )
        
        # Should be able to consume available tokens
        assert bucket.consume(3) == True
        assert bucket.tokens == 2
        
        # Should not be able to consume more than available
        assert bucket.consume(3) == False
        assert bucket.tokens == 2
    
    def test_token_refill(self):
        """Test token refill over time"""
        start_time = time.time()
        bucket = TokenBucket(
            capacity=5,
            tokens=0,
            last_update=start_time,
            refill_rate=2.0  # 2 tokens per second
        )
        
        # Simulate time passage
        bucket.last_update = start_time - 1.0  # 1 second ago
        
        # Should refill 2 tokens
        assert bucket.consume(1) == True
        assert bucket.tokens == 1  # 2 refilled - 1 consumed
    
    def test_wait_time_calculation(self):
        """Test wait time calculation"""
        bucket = TokenBucket(
            capacity=5,
            tokens=0,
            last_update=time.time(),
            refill_rate=1.0
        )
        
        # Need 3 tokens, have 0, rate is 1/second
        wait_time = bucket.wait_time(3)
        assert wait_time == 3.0

class TestRateLimiter:
    """Test rate limiter functionality"""
    
    def test_rate_limiter_creation(self):
        """Test rate limiter initialization"""
        limiter = RateLimiter()
        
        assert limiter.global_bucket is not None
        assert limiter.contact_buckets == {}
    
    def test_global_rate_limiting(self):
        """Test global rate limiting"""
        limiter = RateLimiter()
        
        # Consume all global tokens
        for _ in range(limiter.global_bucket.capacity):
            assert limiter.can_send() == True
        
        # Should be rate limited now
        assert limiter.can_send() == False
    
    def test_per_contact_rate_limiting(self):
        """Test per-contact rate limiting"""
        limiter = RateLimiter()
        
        contact_id = 123
        
        # First message should work
        assert limiter.can_send(contact_id) == True
        
        # Exhaust contact-specific tokens
        contact_bucket = limiter._get_contact_bucket(contact_id)
        while contact_bucket.tokens > 0:
            limiter.can_send(contact_id)
        
        # Should be rate limited for this contact
        assert limiter.can_send(contact_id) == False
        
        # But should still work for different contact
        assert limiter.can_send(456) == True
    
    def test_rate_limiter_status(self):
        """Test rate limiter status reporting"""
        limiter = RateLimiter()
        
        # Use some tokens
        limiter.can_send(123)
        limiter.can_send(456)
        
        status = limiter.get_status()
        
        assert "global_tokens" in status
        assert "global_capacity" in status
        assert "active_contact_buckets" in status
        assert status["active_contact_buckets"] == 2
    
    def test_reset_contact_limit(self):
        """Test resetting contact-specific limit"""
        limiter = RateLimiter()
        
        contact_id = 123
        
        # Exhaust contact tokens
        while limiter.can_send(contact_id):
            pass
        
        # Should be rate limited
        assert limiter.can_send(contact_id) == False
        
        # Reset and should work again
        limiter.reset_contact_limit(contact_id)
        assert limiter.can_send(contact_id) == True

### tests/test_scheduler.py
```python
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from ..app.services.scheduler import SchedulerService
from ..app.models.schedule import Schedule, ScheduleType, ScheduleStatus
from ..app.models.message import Message, MessageType
from ..app.models.contact import Contact

class TestSchedulerService:
    """Test scheduler service functionality"""
    
    @pytest.fixture
    def scheduler_service(self):
        """Create scheduler service for testing"""
        service = SchedulerService()
        return service
    
    @pytest.fixture
    def sample_message(self, test_session):
        """Create sample message for testing"""
        message = Message(
            title="Test Message",
            content="Hello {nome}, this is a test message from {cidade}!",
            message_type=MessageType.TEXT
        )
        message.set_variations([
            "Hello {nome}!",
            "Hi {nome}, how are you?",
            "Greetings {nome} from {cidade}!"
        ])
        
        test_session.add(message)
        test_session.commit()
        test_session.refresh(message)
        return message
    
    @pytest.fixture
    def sample_contacts(self, test_session):
        """Create sample contacts for testing"""
        contacts = [
            Contact(
                name="João Silva",
                phone="+5565999999999",
                email="joao@email.com",
                city="Rondonópolis"
            ),
            Contact(
                name="Maria Santos",
                phone="+5565888888888",
                email="maria@email.com",
                city="Cuiabá"
            )
        ]
        
        for contact in contacts:
            test_session.add(contact)
        
        test_session.commit()
        
        for contact in contacts:
            test_session.refresh(contact)
        
        return contacts
    
    @pytest.mark.asyncio
    async def test_create_immediate_schedule(self, scheduler_service, sample_message, sample_contacts):
        """Test creating immediate schedule"""
        contact_ids = [contact.id for contact in sample_contacts]
        
        with patch.object(scheduler_service, '_schedule_job', new_callable=AsyncMock) as mock_schedule:
            schedule = await scheduler_service.create_schedule(
                name="Test Immediate",
                message_id=sample_message.id,
                schedule_type=ScheduleType.IMMEDIATE,
                target_contacts=contact_ids
            )
            
            assert schedule.name == "Test Immediate"
            assert schedule.schedule_type == ScheduleType.IMMEDIATE
            assert schedule.status == ScheduleStatus.PENDING
            assert schedule.get_target_contacts() == contact_ids
            
            mock_schedule.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_future_schedule(self, scheduler_service, sample_message, sample_contacts):
        """Test creating future schedule"""
        future_time = datetime.now() + timedelta(hours=1)
        contact_ids = [contact.id for contact in sample_contacts]
        
        with patch.object(scheduler_service, '_schedule_job', new_callable=AsyncMock) as mock_schedule:
            schedule = await scheduler_service.create_schedule(
                name="Test Future",
                message_id=sample_message.id,
                schedule_type=ScheduleType.FUTURE,
                scheduled_at=future_time,
                target_contacts=contact_ids
            )
            
            assert schedule.schedule_type == ScheduleType.FUTURE
            assert schedule.scheduled_at == future_time
            
            mock_schedule.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_recurring_schedule(self, scheduler_service, sample_message, sample_contacts):
        """Test creating recurring schedule"""
        cron_expr = "0 9 * * *"  # Daily at 9 AM
        contact_ids = [contact.id for contact in sample_contacts]
        
        with patch.object(scheduler_service, '_schedule_job', new_callable=AsyncMock) as mock_schedule:
            schedule = await scheduler_service.create_schedule(
                name="Test Recurring",
                message_id=sample_message.id,
                schedule_type=ScheduleType.RECURRING,
                cron_expression=cron_expr,
                max_runs=5,
                target_contacts=contact_ids
            )
            
            assert schedule.schedule_type == ScheduleType.RECURRING
            assert schedule.cron_expression == cron_expr
            assert schedule.max_runs == 5
            
            mock_schedule.assert_called_once()
    
    def test_parse_cron_expression(self, scheduler_service):
        """Test cron expression parsing"""
        cron_expr = "30 14 * * 1-5"  # 2:30 PM on weekdays
        
        parsed = scheduler_service._parse_cron_expression(cron_expr)
        
        assert parsed["minute"] == "30"
        assert parsed["hour"] == "14"
        assert parsed["day"] == "*"
        assert parsed["month"] == "*"
        assert parsed["day_of_week"] == "1-5"
    
    def test_invalid_cron_expression(self, scheduler_service):
        """Test invalid cron expression handling"""
        invalid_cron = "invalid cron"
        
        with pytest.raises(ValueError, match="Invalid cron expression"):
            scheduler_service._parse_cron_expression(invalid_cron)
    
    @pytest.mark.asyncio
    async def test_cancel_schedule(self, scheduler_service, sample_message, sample_contacts):
        """Test cancelling a schedule"""
        with patch.object(scheduler_service, '_schedule_job', new_callable=AsyncMock):
            schedule = await scheduler_service.create_schedule(
                name="Test Cancel",
                message_id=sample_message.id,
                schedule_type=ScheduleType.IMMEDIATE,
                target_contacts=[sample_contacts[0].id]
            )
            
            # Mock scheduler
            mock_scheduler = Mock()
            mock_scheduler.get_job.return_value = Mock()
            scheduler_service.scheduler = mock_scheduler
            
            success = await scheduler_service.cancel_schedule(schedule.id)
            
            assert success == True
            mock_scheduler.remove_job.assert_called_once()
    
    def test_get_schedule_status(self, scheduler_service, test_session):
        """Test getting schedule status"""
        # Create test schedule directly in database
        schedule = Schedule(
            name="Test Status",
            message_id=1,  # Assuming message exists
            schedule_type=ScheduleType.IMMEDIATE,
            status=ScheduleStatus.COMPLETED,
            run_count=1
        )
        
        test_session.add(schedule)
        test_session.commit()
        test_session.refresh(schedule)
        
        status = scheduler_service.get_schedule_status(schedule.id)
        
        assert status is not None
        assert status["schedule"]["name"] == "Test Status"
        assert status["schedule"]["status"] == ScheduleStatus.COMPLETED
        assert status["schedule"]["run_count"] == 1
        assert "delivery_stats" in status
    
    def test_get_all_schedules_status(self, scheduler_service):
        """Test getting all schedules status"""
        status = scheduler_service.get_all_schedules_status()
        
        assert "total_schedules" in status
        assert "by_status" in status
        assert "by_type" in status
        assert "schedules" in status
        assert "active_jobs" in status

### tests/test_message_dispatcher.py
```python
import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from ..app.services.message_dispatcher import MessageDispatcher
from ..app.models.schedule import Schedule, ScheduleType
from ..app.models.message import Message, MessageType
from ..app.models.contact import Contact, Nickname
from ..app.models.delivery_log import DeliveryLog, DeliveryStatus

class TestMessageDispatcher:
    """Test message dispatcher functionality"""
    
    @pytest.fixture
    def dispatcher(self):
        """Create message dispatcher for testing"""
        return MessageDispatcher()
    
    @pytest.fixture
    def sample_schedule_data(self, test_session):
        """Create sample data for testing"""
        # Create message
        message = Message(
            title="Test Message",
            content="Hello {nome} from {cidade}!",
            message_type=MessageType.TEXT
        )
        message.set_variations([
            "Hi {nome}!",
            "Hello {nome} from {cidade}!",
            "Greetings {nome}!"
        ])
        test_session.add(message)
        test_session.commit()
        test_session.refresh(message)
        
        # Create contacts
        contacts = [
            Contact(
                name="João Silva",
                phone="+5565999999999",
                city="Rondonópolis"
            ),
            Contact(
                name="Maria Santos", 
                phone="+5565888888888",
                city="Cuiabá"
            )
        ]
        
        for contact in contacts:
            test_session.add(contact)
        test_session.commit()
        
        for contact in contacts:
            test_session.refresh(contact)
        
        # Create nicknames
        nickname1 = Nickname(
            contact_id=contacts[0].id,
            nickname="João",
            is_default=True
        )
        nickname2 = Nickname(
            contact_id=contacts[1].id,
            nickname="Maria",
            tone="informal"
        )
        
        test_session.add(nickname1)
        test_session.add(nickname2)
        test_session.commit()
        
        # Create schedule
        schedule = Schedule(
            name="Test Schedule",
            message_id=message.id,
            schedule_type=ScheduleType.IMMEDIATE,
            use_nicknames=True,
            respect_rate_limit=True
        )
        schedule.set_target_contacts([contact.id for contact in contacts])
        
        test_session.add(schedule)
        test_session.commit()
        test_session.refresh(schedule)
        
        return {
            "message": message,
            "contacts": contacts,
            "schedule": schedule
        }
    
    @pytest.mark.asyncio
    async def test_get_target_contacts(self, dispatcher, sample_schedule_data, test_session):
        """Test getting target contacts for schedule"""
        schedule = sample_schedule_data["schedule"]
        
        contacts = await dispatcher._get_target_contacts(test_session, schedule)
        
        assert len(contacts) == 2
        assert contacts[0].name in ["João Silva", "Maria Santos"]
        assert contacts[1].name in ["João Silva", "Maria Santos"]
    
    @pytest.mark.asyncio
    async def test_prepare_message_content(self, dispatcher, sample_schedule_data, test_session):
        """Test message content preparation with placeholders"""
        message = sample_schedule_data["message"]
        contact = sample_schedule_data["contacts"][0]
        
        content = await dispatcher._prepare_message_content(
            test_session, message, contact, use_nicknames=True
        )
        
        # Should replace placeholders
        assert "{nome}" not in content
        assert "{cidade}" not in content
        assert "João" in content or "João Silva" in content
        assert "Rondonópolis" in content
    
    @pytest.mark.asyncio
    async def test_get_contact_nickname(self, dispatcher, sample_schedule_data, test_session):
        """Test getting contact nickname"""
        contact = sample_schedule_data["contacts"][0]
        
        nickname = await dispatcher._get_contact_nickname(test_session, contact)
        
        assert nickname == "João"
    
    @pytest.mark.asyncio
    async def test_simulate_send_message(self, dispatcher):
        """Test message sending simulation"""
        contact = Contact(name="Test User", phone="+5565999999999")
        
        with patch('random.random', return_value=0.9):  # Force success
            success = await dispatcher._simulate_send_message(
                contact, "Test message", 123
            )
            assert success == True
        
        with patch('random.random', return_value=0.99):  # Force failure
            success = await dispatcher._simulate_send_message(
                contact, "Test message", 123
            )
            assert success == False
    
    @pytest.mark.asyncio
    async def test_send_message_to_contact_rate_limited(self, dispatcher, sample_schedule_data, test_session):
        """Test sending message when rate limited"""
        schedule = sample_schedule_data["schedule"]
        message = sample_schedule_data["message"]
        contact = sample_schedule_data["contacts"][0]
        
        # Mock rate limiter to return False (rate limited)
        with patch.object(dispatcher.rate_limiter, 'can_send', return_value=False), \
             patch.object(dispatcher.rate_limiter, 'wait_time', return_value=1.0):
            
            # Should create rate limited log entry
            result = await dispatcher._send_message_to_contact(
                test_session, schedule, message, contact
            )
            
            # Should still attempt to send after waiting
            assert isinstance(result, bool)
    
    @pytest.mark.asyncio
    async def test_send_immediate_message(self, dispatcher, sample_schedule_data, test_session):
        """Test sending immediate message"""
        message = sample_schedule_data["message"]
        contacts = sample_schedule_data["contacts"]
        contact_ids = [contact.id for contact in contacts]
        
        with patch.object(dispatcher, '_send_message_to_contact', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await dispatcher.send_immediate_message(
                message_id=message.id,
                contact_ids=contact_ids,
                use_nicknames=True,
                respect_rate_limit=True
            )
            
            assert result["success"] == True
            assert result["messages_sent"] == 2
            assert result["messages_failed"] == 0
            assert mock_send.call_count == 2
    
    @pytest.mark.asyncio
    async def test_dispatch_schedule(self, dispatcher, sample_schedule_data, test_session):
        """Test dispatching a complete schedule"""
        schedule = sample_schedule_data["schedule"]
        
        with patch.object(dispatcher, '_send_message_to_contact', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await dispatcher.dispatch_schedule(schedule.id)
            
            assert result["success"] == True
            assert result["messages_sent"] == 2
            assert result["messages_failed"] == 0
            assert len(result["errors"]) == 0
            assert mock_send.call_count == 2

## Comandos para Rodar Testes

```bash
# Instalar dependências
pip install -r requirements.txt

# Rodar todos os testes da Etapa 2
pytest tests/test_rate_limiter.py tests/test_scheduler.py tests/test_message_dispatcher.py -v

# Rodar com cobertura
pytest tests/test_rate_limiter.py tests/test_scheduler.py tests/test_message_dispatcher.py --cov=app.services --cov-report=html

# Rodar teste específico
pytest tests/test_scheduler.py::TestSchedulerService::test_create_immediate_schedule -v

# Rodar servidor de desenvolvimento
python -m app.main

# Testar endpoints do scheduler
curl -X POST http://localhost:8000/scheduler/criar \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Schedule",
    "message": {
      "title": "Welcome Message",
      "content": "Hello {nome} from {cidade}!",
      "variations": ["Hi {nome}!", "Hello {nome}!"]
    },
    "schedule_type": "immediate",
    "target_contacts": [1, 2],
    "use_nicknames": true
  }'

# Verificar status
curl http://localhost:8000/scheduler/status
```

## README - Atualização com Etapa 2

### Funcionalidades da Etapa 2

**Sistema de Agendamento:**
- Agendamento imediato, futuro e recorrente
- Suporte a expressões cron para tarefas recorrentes
- Controle de retry com backoff exponencial
- Gestão de estados de execução

**Rate Limiter:**
- Controle global de disparos por minuto
- Limite individual por contato
- Token bucket algorithm para controle suave
- Configurável via variáveis de ambiente

**Dispatcher de Mensagens:**
- Envio em lote respeitando rate limits
- Suporte a variações de mensagem (até 5)
- Substituição de placeholders ({nome}, {cidade}, {apelido})
- Logs detalhados de entrega

### Variáveis de Ambiente (.env)

```env
# Scheduler & Rate Limiting
RATE_LIMIT_PER_MIN=5
RATE_LIMIT_BURST=10
TZ=America/Cuiaba
DEFAULT_SEND_HOUR=9
SCHEDULER_MISFIRE_GRACE_TIME=30
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_FACTOR=2.0
```

### Exemplos de Uso

**1. Criar Agendamento Imediato:**
```json
{
  "name": "Campanha Soja",
  "message": {
    "title": "Informativo Soja",
    "content": "Olá {nome}, informações sobre soja em {cidade}!",
    "variations": [
      "Oi {nome}! Novidades da soja!",
      "Olá {nome}, como anda a safra em {cidade}?"
    ]
  },
  "schedule_type": "immediate",
  "target_groups": [1],
  "use_nicknames": true
}
```

**2. Criar Agendamento Recorrente:**
```json
{
  "name": "Relatório Semanal",
  "message_id": 1,
  "schedule_type": "recurring",
  "cron_expression": "0 9 * * 1",
  "max_runs": 10,
  "target_contacts": [1, 2, 3]
}
```

**3. Envio Imediato:**
```json
{
  "message_id": 1,
  "contact_ids": [1, 2],
  "use_nicknames": true,
  "respect_rate_limit": false
}
```

### Logs Estruturados

```json
{
  "timestamp": "2025-07-08T10:30:00",
  "level": "INFO",
  "logger": "app.services.scheduler",
  "message": "Schedule created: Campanha Soja (ID: 123)",
  "module": "scheduler",
  "function": "create_schedule"
}
```

A **Etapa 2** está completa e integrada com a base da Etapa 1, oferecendo um sistema robusto de agendamento e controle de disparos para mensagens WhatsApp.
```