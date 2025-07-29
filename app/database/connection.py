"""
Database Connection Manager for SPR System
Gerenciador de conexões PostgreSQL com SQLAlchemy
"""

import os
import logging
from typing import Optional, Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import QueuePool
import redis
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Base para modelos SQLAlchemy
Base = declarative_base()


class DatabaseManager:
    """Gerenciador principal de conexões de banco de dados"""
    
    def __init__(self, database_url: Optional[str] = None, redis_url: Optional[str] = None):
        # Configurar URL do PostgreSQL
        self.database_url = database_url or os.getenv(
            'DATABASE_URL', 
            'postgresql://spr_user:spr_password@localhost:5432/spr_db'
        )
        
        # Configurar URL do Redis
        self.redis_url = redis_url or os.getenv(
            'REDIS_URL',
            'redis://localhost:6379/0'
        )
        
        # Engine PostgreSQL
        self.engine = create_engine(
            self.database_url,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            pool_pre_ping=True,
            echo=os.getenv('DATABASE_DEBUG', 'false').lower() == 'true'
        )
        
        # Session factory
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
        
        # Redis client
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            self.redis_client.ping()  # Test connection
            logger.info("✅ Redis conectado com sucesso")
        except Exception as e:
            logger.warning(f"⚠️ Redis não disponível: {e}")
            self.redis_client = None
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """Context manager para sessões de banco"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"❌ Erro na sessão de banco: {e}")
            raise
        finally:
            session.close()
    
    def get_db_session(self) -> Generator[Session, None, None]:
        """Generator para dependency injection FastAPI"""
        with self.get_session() as session:
            yield session
    
    def create_tables(self):
        """Cria todas as tabelas no banco"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("✅ Tabelas criadas com sucesso")
        except Exception as e:
            logger.error(f"❌ Erro ao criar tabelas: {e}")
            raise
    
    def test_connection(self) -> bool:
        """Testa conexão com PostgreSQL"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                conn.commit()
                logger.info("✅ Conexão PostgreSQL testada com sucesso")
                return True
        except Exception as e:
            logger.error(f"❌ Erro na conexão PostgreSQL: {e}")
            return False
    
    def get_redis_client(self) -> Optional[redis.Redis]:
        """Retorna cliente Redis se disponível"""
        return self.redis_client
    
    def cache_set(self, key: str, value: str, ttl: int = 3600) -> bool:
        """Set valor no cache Redis"""
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl, value)
                return True
            except Exception as e:
                logger.warning(f"⚠️ Erro ao definir cache: {e}")
        return False
    
    def cache_get(self, key: str) -> Optional[str]:
        """Get valor do cache Redis"""
        if self.redis_client:
            try:
                return self.redis_client.get(key)
            except Exception as e:
                logger.warning(f"⚠️ Erro ao obter cache: {e}")
        return None
    
    def cache_delete(self, key: str) -> bool:
        """Delete valor do cache Redis"""
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return True
            except Exception as e:
                logger.warning(f"⚠️ Erro ao deletar cache: {e}")
        return False


# Instância global do gerenciador
db_manager = DatabaseManager()