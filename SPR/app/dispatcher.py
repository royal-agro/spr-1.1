# dispatcher.py

import os
import requests

# Function to send message via WhatsApp gateway
def send_via_gateway(contact, message):
    url = os.getenv('WHATSAPP_GATEWAY_URL')
    api_key = os.getenv('WHATSAPP_API_KEY')
    headers = {'Authorization': f'Bearer {api_key}'}
    data = {'contact': contact, 'message': message}
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        return True
    else:
        # Log the failure
        print(f'Failed to send message: {response.text}')
        return False 