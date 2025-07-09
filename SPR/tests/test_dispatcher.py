# test_dispatcher.py

import pytest
from unittest.mock import patch
from app.dispatcher import send_via_gateway

@patch('app.dispatcher.requests.post')
def test_send_via_gateway_success(mock_post):
    mock_post.return_value.status_code = 200
    assert send_via_gateway('1234567890', 'Hello') is True

@patch('app.dispatcher.requests.post')
def test_send_via_gateway_failure(mock_post):
    mock_post.return_value.status_code = 500
    assert send_via_gateway('1234567890', 'Hello') is False 