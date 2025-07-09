"""
📦 SPR 1.1 - Conexão com Banco de Dados
Gerenciamento de conexões SQLite para ingestão de dados
"""

import os
import logging
from sqlmodel import create_engine, Session, text
from contextlib import contextmanager

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração do banco de dados
DATABASE_DIR = "database"
DATABASE_FILE = "spr.db"
DATABASE_PATH = os.path.join(DATABASE_DIR, DATABASE_FILE)
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Engine global
engine = None

def init_database():
    """Inicializa o banco de dados e cria diretório se necessário"""
    global engine
    
    # Criar diretório se não existir
    os.makedirs(DATABASE_DIR, exist_ok=True)
    
    # Criar engine
    engine = create_engine(DATABASE_URL, echo=False)
    
    logger.info(f"✅ Banco de dados inicializado: {DATABASE_PATH}")
    return engine

def get_engine():
    """Retorna a engine do banco de dados"""
    global engine
    if engine is None:
        engine = init_database()
    return engine

@contextmanager
def get_session():
    """Context manager para sessões do banco de dados"""
    session = Session(get_engine())
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"❌ Erro na sessão do banco: {e}")
        raise
    finally:
        session.close()

def verificar_conexao():
    """Verifica se a conexão com o banco está funcionando"""
    try:
        with get_session() as session:
            # Teste simples de conexão
            result = session.exec(text("SELECT 1")).first()
            logger.info("✅ Conexão com banco funcionando!")
            return True
    except Exception as e:
        logger.error(f"❌ Erro na conexão: {e}")
        return False

def obter_info_banco():
    """Obtém informações sobre o banco de dados"""
    try:
        with get_session() as session:
            # Listar tabelas
            tables = session.exec("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """).all()
            
            info = {
                "database_path": DATABASE_PATH,
                "database_exists": os.path.exists(DATABASE_PATH),
                "tables": [table[0] for table in tables] if tables else []
            }
            
            # Contar registros por tabela
            counts = {}
            for table in info["tables"]:
                try:
                    count = session.exec(f"SELECT COUNT(*) FROM {table}").first()
                    counts[table] = count[0] if count else 0
                except:
                    counts[table] = 0
            
            info["record_counts"] = counts
            return info
            
    except Exception as e:
        logger.error(f"❌ Erro ao obter info do banco: {e}")
        return None

if __name__ == "__main__":
    # Teste de conexão
    init_database()
    if verificar_conexao():
        info = obter_info_banco()
        print(f"📊 Info do banco: {info}")
    else:
        print("❌ Falha na conexão com o banco") 