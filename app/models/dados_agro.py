"""
📦 SPR 1.1 - Modelo de Dados Agropecuários
Tabelas SQLModel para ingestão de dados reais
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, create_engine, Session
import os

# Configuração do banco de dados
DATABASE_URL = "sqlite:///./database/spr.db"

class PrecoAgro(SQLModel, table=True):
    """Tabela de preços agrícolas por cultura e região"""
    __tablename__ = "precos_agro"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    cultura: str = Field(index=True)  # soja, milho, cafe, algodao, etc.
    data: datetime = Field(index=True)
    valor: float  # Preço em R$/saca ou R$/arroba
    regiao: str = Field(index=True)  # SP, MT, GO, etc.
    fonte: str = Field(default="CEPEA")  # CEPEA, CONAB, etc.
    created_at: datetime = Field(default_factory=datetime.now)

class Clima(SQLModel, table=True):
    """Tabela de dados climáticos e NDVI"""
    __tablename__ = "clima"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    data: datetime = Field(index=True)
    regiao: str = Field(index=True)  # Região geográfica
    temp_min: float  # Temperatura mínima em °C
    temp_max: float  # Temperatura máxima em °C
    chuva_mm: float  # Precipitação em mm
    ndvi: Optional[float] = Field(default=None)  # Índice de vegetação
    fonte: str = Field(default="INMET")
    created_at: datetime = Field(default_factory=datetime.now)

class Cambio(SQLModel, table=True):
    """Tabela de dados cambiais e econômicos"""
    __tablename__ = "cambio"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    data: datetime = Field(index=True)
    usd_brl: float  # Taxa de câmbio USD/BRL
    selic: Optional[float] = Field(default=None)  # Taxa SELIC
    ipca: Optional[float] = Field(default=None)  # IPCA mensal
    fonte: str = Field(default="BCB")
    created_at: datetime = Field(default_factory=datetime.now)

class Estoque(SQLModel, table=True):
    """Tabela de dados de estoque por cultura"""
    __tablename__ = "estoque"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    cultura: str = Field(index=True)
    data: datetime = Field(index=True)
    tipo: str  # "inicial", "final", "consumo", "producao"
    valor: float  # Quantidade em mil toneladas
    fonte: str = Field(default="CONAB")
    created_at: datetime = Field(default_factory=datetime.now)

class Sentimento(SQLModel, table=True):
    """Tabela de análise de sentimento de mercado"""
    __tablename__ = "sentimento"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    data: datetime = Field(index=True)
    manchete: str  # Título da notícia
    score: float = Field(ge=-1.0, le=1.0)  # Score de -1 (negativo) a 1 (positivo)
    fonte: str  # Portal de notícias
    categoria: Optional[str] = Field(default=None)  # economia, clima, politica
    created_at: datetime = Field(default_factory=datetime.now)

# Engine e funções de conexão
engine = create_engine(DATABASE_URL, echo=False)

def criar_tabelas():
    """Cria todas as tabelas no banco de dados"""
    # Criar diretório se não existir
    os.makedirs("database", exist_ok=True)
    
    # Criar todas as tabelas
    SQLModel.metadata.create_all(engine)
    print("✅ Tabelas criadas com sucesso!")

def get_session():
    """Retorna uma sessão do banco de dados"""
    return Session(engine)

def verificar_conexao():
    """Verifica se a conexão com o banco está funcionando"""
    try:
        with get_session() as session:
            # Teste simples de conexão
            session.exec("SELECT 1").first()
        print("✅ Conexão com banco funcionando!")
        return True
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        return False

if __name__ == "__main__":
    # Criar tabelas e testar conexão
    criar_tabelas()
    verificar_conexao() 