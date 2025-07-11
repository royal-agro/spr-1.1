#!/usr/bin/env python3
"""
Teste do sistema WhatsApp do SPR
Verifica se o servidor está funcionando e testa o envio de mensagens
"""

import sys
import os
import time
import requests
from datetime import datetime

# Adicionar path do projeto
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.dispatcher import WhatsAppDispatcher

def test_whatsapp_server():
    """Testa se o servidor WhatsApp está funcionando"""
    print("🔍 Testando servidor WhatsApp...")
    
    try:
        # Testar conexão com servidor
        response = requests.get('http://localhost:3000/health', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Servidor WhatsApp OK: {data}")
            return True
        else:
            print(f"❌ Servidor retornou status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Servidor WhatsApp não está rodando")
        print("💡 Execute: cd SPR/whatsapp_server && node spr_whatsapp.js")
        return False
    except Exception as e:
        print(f"❌ Erro ao testar servidor: {e}")
        return False

def test_dispatcher():
    """Testa o dispatcher Python"""
    print("\n🔍 Testando dispatcher Python...")
    
    try:
        dispatcher = WhatsAppDispatcher()
        
        # Testar health check
        health = dispatcher.health_check()
        print(f"🏥 Health check: {health}")
        
        # Testar status
        status = dispatcher.get_status()
        print(f"📊 Status: {status}")
        
        return health.get('success', False)
        
    except Exception as e:
        print(f"❌ Erro no dispatcher: {e}")
        return False

def test_message_sending():
    """Testa envio de mensagem (apenas se WhatsApp estiver conectado)"""
    print("\n🔍 Testando envio de mensagem...")
    
    try:
        dispatcher = WhatsAppDispatcher()
        
        # Verificar se WhatsApp está conectado
        status = dispatcher.get_status()
        
        if not status.get('success'):
            print("⚠️ WhatsApp não está conectado - pulando teste de envio")
            return True
        
        whatsapp_status = status.get('status', {})
        if whatsapp_status.get('status') != 'connected':
            print("⚠️ WhatsApp não está conectado - pulando teste de envio")
            return True
        
        # Número de teste (substitua pelo seu número)
        test_number = input("📱 Digite seu número para teste (ou Enter para pular): ").strip()
        
        if not test_number:
            print("⏭️ Teste de envio pulado")
            return True
        
        # Enviar mensagem de teste
        test_message = f"🌾 SPR - Teste de funcionamento\n\nData: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n\nSistema funcionando corretamente! ✅"
        
        result = dispatcher.send_message(test_number, test_message)
        
        if result.get('success'):
            print(f"✅ Mensagem enviada com sucesso: {result.get('message_id')}")
            return True
        else:
            print(f"❌ Erro ao enviar mensagem: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste de envio: {e}")
        return False

def main():
    """Função principal do teste"""
    print("🌾 SPR - Teste do Sistema WhatsApp")
    print("=" * 50)
    
    # Testes
    tests = [
        ("Servidor WhatsApp", test_whatsapp_server),
        ("Dispatcher Python", test_dispatcher),
        ("Envio de Mensagem", test_message_sending)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 30)
        
        try:
            result = test_func()
            results.append((test_name, result))
            
            if result:
                print(f"✅ {test_name}: PASSOU")
            else:
                print(f"❌ {test_name}: FALHOU")
                
        except Exception as e:
            print(f"❌ {test_name}: ERRO - {e}")
            results.append((test_name, False))
    
    # Resumo
    print("\n" + "=" * 50)
    print("📊 RESUMO DOS TESTES")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n📈 {passed}/{len(results)} testes passaram")
    
    if passed == len(results):
        print("🎉 Todos os testes passaram! WhatsApp está funcionando!")
    else:
        print("⚠️ Alguns testes falharam. Verifique a configuração.")
    
    print("\n💡 Dicas:")
    print("• Certifique-se de que o servidor Node.js está rodando")
    print("• Escaneie o QR Code em http://localhost:3000")
    print("• Verifique se o WhatsApp está conectado antes de enviar mensagens")

if __name__ == "__main__":
    main() 