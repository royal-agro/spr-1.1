"""
Módulo de Suporte Técnico do SPR 1.1
"""

from .backup_logs import ModuloBackupLogs
from .claude_sync import ModuloClaudeSync
from .clientes import ModuloClientes

__all__ = [
    'ModuloBackupLogs',
    'ModuloClaudeSync',
    'ModuloClientes'
] 