import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture
def mock_whatsapp_client():
    """Fixture que fornece um cliente WhatsApp mockado"""
    mock_client = MagicMock()
    mock_client.is_connected.return_value = True
    return mock_client

@pytest.fixture
def mock_contact():
    """Fixture que fornece um contato de teste"""
    return {
        "phone": "5511999999999",
        "name": "Contato Teste",
        "is_business": False,
        "is_enterprise": False
    }

@pytest.fixture
def mock_message():
    """Fixture que fornece uma mensagem de teste"""
    return {
        "id": "message_id_123",
        "body": "Mensagem de teste",
        "type": "text",
        "timestamp": "2024-01-01 12:00:00",
        "from_me": True
    }

@pytest.fixture
def mock_media_message():
    """Fixture que fornece uma mensagem de mídia de teste"""
    return {
        "id": "media_message_id_123",
        "body": "Arquivo de teste",
        "type": "image",
        "mime_type": "image/jpeg",
        "filename": "test.jpg",
        "timestamp": "2024-01-01 12:00:00",
        "from_me": True
    } 