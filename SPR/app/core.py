"""
Módulo core do SPR 1.1
Contém as funcionalidades principais do sistema
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routers import previsao, dashboard

app = FastAPI(
    title="SPR API",
    description="API do Sistema Preditivo Royal",
    version="1.1"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique as origens permitidas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rotas
app.include_router(previsao.router)
app.include_router(dashboard.router)

# Configurar porta
port = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port) 