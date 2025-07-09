# frontend.py

from fastapi import APIRouter, Form, UploadFile
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get('/painel', response_class=HTMLResponse)
def painel():
    return "<h1>Painel do Operador</h1>"

@router.post('/mensagens/templates')
def create_template(name: str = Form(...), content: str = Form(...)):
    return {"name": name, "content": content}

@router.post('/scheduler/criar')
def create_schedule(template_id: int = Form(...), contact: str = Form(...), time: str = Form(...)):
    return {"template_id": template_id, "contact": contact, "time": time}

@router.post('/mensagens/tts/generate')
def generate_tts(text: str = Form(...)):
    return {"text": text}

@router.get('/scheduler/status')
def get_status():
    return {"status": "All systems operational"} 