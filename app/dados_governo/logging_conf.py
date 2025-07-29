"""
SPR 1.1 - Configuração de logging estruturado
Setup de logs JSON + humano com RotatingFileHandler
"""

import json
import logging
import logging.handlers
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.config import Config


class JsonFormatter(logging.Formatter):
    """Formatter para logs estruturados em JSON"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Formata log record como JSON"""
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Adiciona informações extras se presentes
        if hasattr(record, 'extra'):
            log_entry.update(record.extra)
        
        # Adiciona exception info se presente
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=False, default=str)


class HumanFormatter(logging.Formatter):
    """Formatter para logs legibles por humanos"""
    
    def __init__(self):
        super().__init__(
            fmt="%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )


def setup_logging(
    name: str = "spr",
    level: str = None,
    log_to_file: bool = True,
    log_to_console: bool = True
) -> logging.Logger:
    """
    Configura logging estruturado para o SPR
    
    Args:
        name: Nome do logger
        level: Nível de log (DEBUG, INFO, WARN, ERROR)
        log_to_file: Se deve logar para arquivo
        log_to_console: Se deve logar para console
    
    Returns:
        Logger configurado
    """
    level = level or Config.LOG_LEVEL
    logger = logging.getLogger(name)
    
    # Evita duplicar handlers
    if logger.handlers:
        return logger
    
    logger.setLevel(getattr(logging, level.upper()))
    
    # Handler para arquivo (JSON estruturado)
    if log_to_file:
        log_file = Config.LOGS_DIR / f"{name}.log"
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=Config.LOG_MAX_BYTES,
            backupCount=Config.LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setFormatter(JsonFormatter())
        logger.addHandler(file_handler)
    
    # Handler para console (formato humano)
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(HumanFormatter())
        logger.addHandler(console_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """Obtém logger com configuração padrão"""
    return setup_logging(name)


class LogContext:
    """Context manager para adicionar contexto aos logs"""
    
    def __init__(self, logger: logging.Logger, **context):
        self.logger = logger
        self.context = context
        self.old_factory = None
    
    def __enter__(self):
        self.old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self.old_factory)


def log_execution_time(logger: logging.Logger):
    """Decorator para logar tempo de execução de funções"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = func(*args, **kwargs)
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                logger.info(
                    f"Função {func.__name__} executada com sucesso",
                    extra={
                        "function": func.__name__,
                        "duration_seconds": duration,
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat()
                    }
                )
                return result
            except Exception as e:
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                logger.error(
                    f"Erro na função {func.__name__}: {str(e)}",
                    extra={
                        "function": func.__name__,
                        "duration_seconds": duration,
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "error": str(e)
                    },
                    exc_info=True
                )
                raise
        return wrapper
    return decorator


def log_api_call(logger: logging.Logger, url: str, method: str = "GET", **kwargs):
    """Context manager para logar chamadas de API"""
    class ApiCallContext:
        def __init__(self):
            self.start_time = None
            self.response_status = None
            self.response_size = None
        
        def __enter__(self):
            self.start_time = datetime.now()
            logger.info(
                f"Iniciando chamada {method} para {url}",
                extra={
                    "api_method": method,
                    "api_url": url,
                    "api_params": kwargs
                }
            )
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = (datetime.now() - self.start_time).total_seconds()
            
            if exc_type is None:
                logger.info(
                    f"Chamada {method} {url} concluída",
                    extra={
                        "api_method": method,
                        "api_url": url,
                        "duration_seconds": duration,
                        "response_status": self.response_status,
                        "response_size_bytes": self.response_size
                    }
                )
            else:
                logger.error(
                    f"Erro na chamada {method} {url}: {str(exc_val)}",
                    extra={
                        "api_method": method,
                        "api_url": url,
                        "duration_seconds": duration,
                        "error": str(exc_val)
                    },
                    exc_info=True
                )
        
        def set_response_info(self, status_code: int, content_length: int = None):
            """Define informações da resposta"""
            self.response_status = status_code
            self.response_size = content_length
    
    return ApiCallContext()


# Logger principal do SPR
spr_logger = setup_logging("spr")

# Função de conveniência para outros módulos
def get_module_logger(module_name: str) -> logging.Logger:
    """Obtém logger específico para um módulo"""
    return setup_logging(f"spr.{module_name}")
