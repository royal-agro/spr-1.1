import pytest
from unittest.mock import patch, MagicMock
from app.suporte_tecnico.whatsapp_login.whatsapp_client import WhatsAppClient

def test_validate_contact(mock_whatsapp_client, mock_contact):
    """Testa validação de contato"""
    mock_whatsapp_client.validate_contact.return_value = True
    
    result = mock_whatsapp_client.validate_contact(mock_contact["phone"])
    
    assert result is True
    mock_whatsapp_client.validate_contact.assert_called_once_with(mock_contact["phone"])

def test_validate_invalid_contact(mock_whatsapp_client):
    """Testa validação de contato inválido"""
    invalid_phone = "123"
    mock_whatsapp_client.validate_contact.return_value = False
    
    result = mock_whatsapp_client.validate_contact(invalid_phone)
    
    assert result is False
    mock_whatsapp_client.validate_contact.assert_called_once_with(invalid_phone)

def test_search_contact(mock_whatsapp_client, mock_contact):
    """Testa busca de contato"""
    mock_whatsapp_client.search_contact.return_value = mock_contact
    
    result = mock_whatsapp_client.search_contact(mock_contact["phone"])
    
    assert result == mock_contact
    assert result["name"] == "Contato Teste"
    mock_whatsapp_client.search_contact.assert_called_once_with(mock_contact["phone"])

def test_search_nonexistent_contact(mock_whatsapp_client):
    """Testa busca de contato inexistente"""
    mock_whatsapp_client.search_contact.return_value = None
    
    result = mock_whatsapp_client.search_contact("5511999999999")
    
    assert result is None
    mock_whatsapp_client.search_contact.assert_called_once()

def test_update_contact_list(mock_whatsapp_client):
    """Testa atualização da lista de contatos"""
    new_contacts = [
        {"phone": "5511999999991", "name": "Contato 1"},
        {"phone": "5511999999992", "name": "Contato 2"}
    ]
    mock_whatsapp_client.update_contacts.return_value = True
    
    result = mock_whatsapp_client.update_contacts(new_contacts)
    
    assert result is True
    mock_whatsapp_client.update_contacts.assert_called_once_with(new_contacts)

def test_get_all_contacts(mock_whatsapp_client):
    """Testa obtenção de todos os contatos"""
    contacts = [
        {"phone": "5511999999991", "name": "Contato 1"},
        {"phone": "5511999999992", "name": "Contato 2"}
    ]
    mock_whatsapp_client.get_all_contacts.return_value = contacts
    
    result = mock_whatsapp_client.get_all_contacts()
    
    assert len(result) == 2
    assert all(isinstance(contact, dict) for contact in result)
    mock_whatsapp_client.get_all_contacts.assert_called_once() 