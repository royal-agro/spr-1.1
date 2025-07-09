# test_frontend_routes.py

from fastapi.testclient import TestClient
from app.routers.frontend import router

client = TestClient(router)

def test_painel():
    response = client.get('/painel')
    assert response.status_code == 200
    assert "Painel do Operador" in response.text

def test_create_template():
    response = client.post('/mensagens/templates', data={'name': 'Template1', 'content': 'Hello'})
    assert response.status_code == 200
    assert response.json() == {"name": "Template1", "content": "Hello"}

def test_create_schedule():
    response = client.post('/scheduler/criar', data={'template_id': 1, 'contact': '1234567890', 'time': '10:00'})
    assert response.status_code == 200
    assert response.json() == {"template_id": 1, "contact": '1234567890', "time": '10:00'}

def test_generate_tts():
    response = client.post('/mensagens/tts/generate', data={'text': 'Hello'})
    assert response.status_code == 200
    assert response.json() == {"text": 'Hello'}

def test_get_status():
    response = client.get('/scheduler/status')
    assert response.status_code == 200
    assert response.json() == {"status": "All systems operational"} 