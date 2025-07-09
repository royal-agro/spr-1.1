import pytest
from unittest.mock import patch, MagicMock
from app.suporte_tecnico.whatsapp_login.whatsapp_client import WhatsAppClient

def test_whatsapp_client_initialization():
    """Testa a inicialização do cliente WhatsApp"""
    with patch('app.suporte_tecnico.whatsapp_login.whatsapp_client.WhatsAppClient') as mock_client:
        client = WhatsAppClient()
        assert isinstance(client, WhatsAppClient)

def test_successful_connection(mock_whatsapp_client):
    """Testa conexão bem-sucedida com WhatsApp"""
    assert mock_whatsapp_client.is_connected() is True

def test_failed_connection():
    """Testa falha na conexão com WhatsApp"""
    with patch('app.suporte_tecnico.whatsapp_login.whatsapp_client.WhatsAppClient') as mock_client:
        mock_client.return_value.is_connected.return_value = False
        client = mock_client()
        assert client.is_connected() is False

def test_connection_timeout():
    """Testa timeout na conexão com WhatsApp"""
    with patch('app.suporte_tecnico.whatsapp_login.whatsapp_client.WhatsAppClient') as mock_client:
        mock_client.return_value.connect.side_effect = TimeoutError("Conexão expirou")
        client = mock_client()
        with pytest.raises(TimeoutError):
            client.connect()

def test_reconnection_attempt():
    """Testa tentativa de reconexão após falha"""
    with patch('app.suporte_tecnico.whatsapp_login.whatsapp_client.WhatsAppClient') as mock_client:
        client = mock_client()
        client.is_connected.side_effect = [False, False, True]
        client.reconnect()
        assert client.is_connected() is True
        assert client.reconnect.call_count == 1

def test_authentication_failure():
    """Testa falha de autenticação"""
    with patch('app.suporte_tecnico.whatsapp_login.whatsapp_client.WhatsAppClient') as mock_client:
        mock_client.return_value.authenticate.side_effect = ValueError("Credenciais inválidas")
        client = mock_client()
        with pytest.raises(ValueError):
            client.authenticate() 