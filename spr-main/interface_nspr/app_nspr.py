from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from datetime import datetime
import os

# Criar a aplicação FastAPI
app = FastAPI(title="SPR 1.1 - Sistema de Produção Rural", version="1.1.0")

# Configurar arquivos estáticos e templates
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
templates = Jinja2Templates(directory="templates")

# Dados mock para o painel
def get_system_status():
    """Retorna status do sistema para o painel"""
    return {
        "status": "online",
        "last_update": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "active_modules": ["NDVI", "Clima", "Câmbio"],
        "alerts": 0
    }

def get_quick_stats():
    """Dados rápidos para o dashboard"""
    return {
        "ndvi_last": "0.75",
        "temp_atual": "24°C",
        "usd_brl": "R$ 5.12",
        "last_report": "15/06/2025"
    }

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Página principal do painel SPR"""
    context = {
        "request": request,
        "system_status": get_system_status(),
        "quick_stats": get_quick_stats(),
        "page_title": "SPR 1.1 - Painel Principal"
    }
    return templates.TemplateResponse("index.html", context)

@app.get("/ndvi", response_class=HTMLResponse)
async def ndvi_page(request: Request):
    """Página de análise NDVI"""
    context = {
        "request": request,
        "page_title": "Análise NDVI",
        "module": "ndvi"
    }
    return templates.TemplateResponse("module.html", context)

@app.get("/clima", response_class=HTMLResponse)
async def clima_page(request: Request):
    """Página de monitoramento climático"""
    context = {
        "request": request,
        "page_title": "Monitoramento Climático",
        "module": "clima"
    }
    return templates.TemplateResponse("module.html", context)

@app.get("/cambio", response_class=HTMLResponse)
async def cambio_page(request: Request):
    """Página de cotações de câmbio"""
    context = {
        "request": request,
        "page_title": "Cotações de Câmbio",
        "module": "cambio"
    }
    return templates.TemplateResponse("module.html", context)

@app.get("/relatorio", response_class=HTMLResponse)
async def relatorio_page(request: Request):
    """Página de relatórios da soja"""
    context = {
        "request": request,
        "page_title": "Relatórios da Soja",
        "module": "relatorio"
    }
    return templates.TemplateResponse("module.html", context)

@app.get("/status", response_class=HTMLResponse)
async def status_page(request: Request):
    """Página de status do sistema"""
    context = {
        "request": request,
        "page_title": "Status do Sistema",
        "module": "status",
        "system_status": get_system_status()
    }
    return templates.TemplateResponse("module.html", context)

@app.get("/api/status")
async def api_status():
    """API endpoint para status do sistema"""
    return get_system_status()

@app.get("/api/stats")
async def api_stats():
    """API endpoint para estatísticas rápidas"""
    return get_quick_stats()

if __name__ == "__main__":
    # Criar diretórios necessários se não existirem
    os.makedirs("templates", exist_ok=True)
    os.makedirs("assets/imagens_royal", exist_ok=True)
    
    print("🚀 Iniciando SPR 1.1 - Interface NSPR")
    print("📱 Painel acessível em: http://localhost:8000")
    print("🌱 Sistema pronto para produção rural")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)