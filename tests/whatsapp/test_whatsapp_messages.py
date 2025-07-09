import pytest
from unittest.mock import patch, MagicMock
from app.suporte_tecnico.whatsapp_login.whatsapp_client import WhatsAppClient

def test_send_text_message(mock_whatsapp_client, mock_contact):
    """Testa envio de mensagem de texto simples"""
    message = "Olá, isso é um teste!"
    mock_whatsapp_client.send_message.return_value = True
    
    result = mock_whatsapp_client.send_message(
        phone=mock_contact["phone"],
        message=message
    )
    
    assert result is True
    mock_whatsapp_client.send_message.assert_called_once_with(
        phone=mock_contact["phone"],
        message=message
    )

def test_send_formatted_message(mock_whatsapp_client, mock_contact):
    """Testa envio de mensagem formatada"""
    message = "*Título em negrito*\n_Texto em itálico_"
    mock_whatsapp_client.send_message.return_value = True
    
    result = mock_whatsapp_client.send_message(
        phone=mock_contact["phone"],
        message=message
    )
    
    assert result is True
    mock_whatsapp_client.send_message.assert_called_once()

def test_send_message_to_multiple_contacts(mock_whatsapp_client):
    """Testa envio de mensagem para múltiplos contatos"""
    contacts = ["5511999999991", "5511999999992", "5511999999993"]
    message = "Mensagem em massa"
    mock_whatsapp_client.send_bulk_message.return_value = {
        "success": 2,
        "failed": 1,
        "failures": ["5511999999993"]
    }
    
    result = mock_whatsapp_client.send_bulk_message(
        phones=contacts,
        message=message
    )
    
    assert result["success"] == 2
    assert result["failed"] == 1
    assert "5511999999993" in result["failures"]

def test_receive_text_message(mock_whatsapp_client, mock_message):
    """Testa recebimento de mensagem de texto"""
    mock_whatsapp_client.get_unread_messages.return_value = [mock_message]
    
    messages = mock_whatsapp_client.get_unread_messages()
    
    assert len(messages) == 1
    assert messages[0]["type"] == "text"
    assert messages[0]["body"] == "Mensagem de teste"

def test_receive_media_message(mock_whatsapp_client, mock_media_message):
    """Testa recebimento de mensagem com mídia"""
    mock_whatsapp_client.get_unread_messages.return_value = [mock_media_message]
    
    messages = mock_whatsapp_client.get_unread_messages()
    
    assert len(messages) == 1
    assert messages[0]["type"] == "image"
    assert messages[0]["mime_type"] == "image/jpeg"

def test_invalid_phone_number():
    """Testa envio para número de telefone inválido"""
    with patch('app.suporte_tecnico.whatsapp_login.whatsapp_client.WhatsAppClient') as mock_client:
        client = mock_client()
        client.send_message.side_effect = ValueError("Número de telefone inválido")
        
        with pytest.raises(ValueError):
            client.send_message(phone="número_inválido", message="teste") 