#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPR 1.1 - Teste de Integração WhatsApp
Script para testar a comunicação entre Python e servidor Node.js
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from pathlib import Path

# Adicionar o diretório app ao path
sys.path.append(str(Path(__file__).parent / 'app'))

from app.dispatcher import dispatcher
from app.services.whatsapp_previsao import WhatsAppPrevisaoService
from app.services.whatsapp_price_locator import WhatsAppPriceLocatorService

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('WhatsAppTest')

class WhatsAppIntegrationTest:
    """
    Classe para testar a integração completa do WhatsApp
    """
    
    def __init__(self):
        self.dispatcher = dispatcher
        self.previsao_service = WhatsAppPrevisaoService()
        self.price_locator_service = WhatsAppPriceLocatorService()
        
        # Números de teste (substitua pelos seus números reais)
        self.test_contacts = [
            '+5511999999999',  # Substitua pelo seu número
            '11999999999',     # Formato alternativo
        ]
        
        self.test_results = []
    
    def run_all_tests(self):
        """Executa todos os testes de integração"""
        logger.info("🧪 Iniciando testes de integração WhatsApp")
        logger.info("=" * 60)
        
        # Testes básicos
        self.test_health_check()
        self.test_status_check()
        self.test_contacts_list()
        
        # Testes de envio
        self.test_simple_message()
        self.test_message_with_emoji()
        self.test_long_message()
        self.test_multiple_messages()
        
        # Testes de serviços
        self.test_previsao_service()
        self.test_price_locator_service()
        
        # Testes de mídia (se disponível)
        self.test_media_message()
        
        # Relatório final
        self.generate_report()
    
    def test_health_check(self):
        """Teste de health check do servidor"""
        logger.info("🔍 Testando health check...")
        
        try:
            result = self.dispatcher.health_check()
            
            if result['success']:
                logger.info("✅ Health check OK")
                self.test_results.append({
                    'test': 'health_check',
                    'status': 'success',
                    'details': result
                })
            else:
                logger.error(f"❌ Health check falhou: {result['error']}")
                self.test_results.append({
                    'test': 'health_check',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro no health check: {e}")
            self.test_results.append({
                'test': 'health_check',
                'status': 'error',
                'error': str(e)
            })
    
    def test_status_check(self):
        """Teste de status do WhatsApp"""
        logger.info("📊 Testando status do WhatsApp...")
        
        try:
            result = self.dispatcher.get_status()
            
            if result['success']:
                status = result['status']
                logger.info(f"✅ Status obtido: {status}")
                
                if status.get('isReady'):
                    logger.info("🟢 WhatsApp está pronto!")
                else:
                    logger.warning("🟡 WhatsApp não está pronto")
                
                self.test_results.append({
                    'test': 'status_check',
                    'status': 'success',
                    'details': result
                })
            else:
                logger.error(f"❌ Falha ao obter status: {result['error']}")
                self.test_results.append({
                    'test': 'status_check',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro no status check: {e}")
            self.test_results.append({
                'test': 'status_check',
                'status': 'error',
                'error': str(e)
            })
    
    def test_contacts_list(self):
        """Teste de listagem de contatos"""
        logger.info("📱 Testando listagem de contatos...")
        
        try:
            result = self.dispatcher.get_contacts()
            
            if result['success']:
                contacts = result['contacts']
                count = result['count']
                logger.info(f"✅ {count} contatos obtidos")
                
                self.test_results.append({
                    'test': 'contacts_list',
                    'status': 'success',
                    'details': {'count': count}
                })
            else:
                logger.error(f"❌ Falha ao obter contatos: {result['error']}")
                self.test_results.append({
                    'test': 'contacts_list',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro ao obter contatos: {e}")
            self.test_results.append({
                'test': 'contacts_list',
                'status': 'error',
                'error': str(e)
            })
    
    def test_simple_message(self):
        """Teste de envio de mensagem simples"""
        logger.info("💬 Testando envio de mensagem simples...")
        
        if not self.test_contacts:
            logger.warning("⚠️ Nenhum contato de teste configurado")
            return
        
        contact = self.test_contacts[0]
        message = f"🧪 Teste SPR 1.1 - {datetime.now().strftime('%H:%M:%S')}"
        
        try:
            result = self.dispatcher.send_message(contact, message)
            
            if result['success']:
                logger.info(f"✅ Mensagem enviada com sucesso - ID: {result['message_id']}")
                self.test_results.append({
                    'test': 'simple_message',
                    'status': 'success',
                    'details': result
                })
            else:
                logger.error(f"❌ Falha no envio: {result['error']}")
                self.test_results.append({
                    'test': 'simple_message',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro no envio: {e}")
            self.test_results.append({
                'test': 'simple_message',
                'status': 'error',
                'error': str(e)
            })
    
    def test_message_with_emoji(self):
        """Teste de mensagem com emojis"""
        logger.info("😀 Testando mensagem com emojis...")
        
        if not self.test_contacts:
            return
        
        contact = self.test_contacts[0]
        message = "🌱 SPR 1.1 - Teste de emojis: 📈📊💰🚀✅❌⚠️🔍📱💬"
        
        try:
            result = self.dispatcher.send_message(contact, message)
            
            if result['success']:
                logger.info("✅ Mensagem com emojis enviada")
                self.test_results.append({
                    'test': 'emoji_message',
                    'status': 'success',
                    'details': result
                })
            else:
                logger.error(f"❌ Falha no envio: {result['error']}")
                self.test_results.append({
                    'test': 'emoji_message',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro no envio: {e}")
            self.test_results.append({
                'test': 'emoji_message',
                'status': 'error',
                'error': str(e)
            })
    
    def test_long_message(self):
        """Teste de mensagem longa"""
        logger.info("📝 Testando mensagem longa...")
        
        if not self.test_contacts:
            return
        
        contact = self.test_contacts[0]
        message = """🌾 SPR 1.1 - Teste de Mensagem Longa

Este é um teste de mensagem longa para verificar se o sistema consegue enviar textos maiores via WhatsApp.

📊 Funcionalidades testadas:
• Envio de texto longo
• Formatação com quebras de linha
• Emojis e caracteres especiais
• Integração Python-Node.js

🔧 Detalhes técnicos:
- Dispatcher: WhatsAppDispatcher
- Servidor: Node.js + whatsapp-web.js
- Timestamp: """ + datetime.now().strftime('%d/%m/%Y %H:%M:%S') + """

✅ Se você recebeu esta mensagem, a integração está funcionando corretamente!"""
        
        try:
            result = self.dispatcher.send_message(contact, message)
            
            if result['success']:
                logger.info("✅ Mensagem longa enviada")
                self.test_results.append({
                    'test': 'long_message',
                    'status': 'success',
                    'details': result
                })
            else:
                logger.error(f"❌ Falha no envio: {result['error']}")
                self.test_results.append({
                    'test': 'long_message',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro no envio: {e}")
            self.test_results.append({
                'test': 'long_message',
                'status': 'error',
                'error': str(e)
            })
    
    def test_multiple_messages(self):
        """Teste de múltiplas mensagens"""
        logger.info("🔄 Testando múltiplas mensagens...")
        
        if not self.test_contacts:
            return
        
        contact = self.test_contacts[0]
        messages = [
            "📨 Mensagem 1/3 - Teste de múltiplas mensagens",
            "📨 Mensagem 2/3 - Intervalo de 2 segundos",
            "📨 Mensagem 3/3 - Teste concluído! ✅"
        ]
        
        success_count = 0
        
        for i, message in enumerate(messages, 1):
            try:
                result = self.dispatcher.send_message(contact, message)
                
                if result['success']:
                    logger.info(f"✅ Mensagem {i}/3 enviada")
                    success_count += 1
                else:
                    logger.error(f"❌ Falha na mensagem {i}/3: {result['error']}")
                
                # Intervalo entre mensagens
                if i < len(messages):
                    time.sleep(2)
                    
            except Exception as e:
                logger.error(f"❌ Erro na mensagem {i}/3: {e}")
        
        self.test_results.append({
            'test': 'multiple_messages',
            'status': 'success' if success_count == len(messages) else 'partial',
            'details': {
                'total': len(messages),
                'successful': success_count,
                'failed': len(messages) - success_count
            }
        })
    
    def test_previsao_service(self):
        """Teste do serviço de previsão"""
        logger.info("📈 Testando serviço de previsão...")
        
        try:
            # Dados de teste
            previsao_mock = {
                'cultura': 'soja',
                'periodo_previsao': {
                    'inicio': '2025-01-08',
                    'fim': '2025-01-15',
                    'dias': 7
                },
                'estatisticas': {
                    'preco_medio': 127.50,
                    'preco_minimo': 125.00,
                    'preco_maximo': 130.00,
                    'tendencia': 'alta',
                    'volatilidade': 2.3
                },
                'previsoes': [
                    {
                        'data': datetime.now(),
                        'preco_previsto': 128.00,
                        'limite_inferior': 126.00,
                        'limite_superior': 130.00
                    }
                ]
            }
            
            if self.test_contacts:
                contact = self.test_contacts[0]
                result = self.previsao_service.enviar_previsao_por_whatsapp(
                    contact, previsao_mock, 'texto'
                )
                
                if result:
                    logger.info("✅ Serviço de previsão funcionando")
                    self.test_results.append({
                        'test': 'previsao_service',
                        'status': 'success'
                    })
                else:
                    logger.error("❌ Falha no serviço de previsão")
                    self.test_results.append({
                        'test': 'previsao_service',
                        'status': 'failed'
                    })
            else:
                logger.warning("⚠️ Teste de previsão pulado - sem contatos")
                
        except Exception as e:
            logger.error(f"❌ Erro no serviço de previsão: {e}")
            self.test_results.append({
                'test': 'previsao_service',
                'status': 'error',
                'error': str(e)
            })
    
    def test_price_locator_service(self):
        """Teste do serviço de localização de preços"""
        logger.info("🔍 Testando serviço de localização de preços...")
        
        try:
            if self.test_contacts:
                contact = self.test_contacts[0]
                # Simular mensagem de consulta
                message = "preço soja em 01310-100"
                
                result = self.price_locator_service.process_whatsapp_message(
                    contact, message
                )
                
                if result:
                    logger.info("✅ Serviço de price locator funcionando")
                    self.test_results.append({
                        'test': 'price_locator_service',
                        'status': 'success'
                    })
                else:
                    logger.error("❌ Falha no serviço de price locator")
                    self.test_results.append({
                        'test': 'price_locator_service',
                        'status': 'failed'
                    })
            else:
                logger.warning("⚠️ Teste de price locator pulado - sem contatos")
                
        except Exception as e:
            logger.error(f"❌ Erro no serviço de price locator: {e}")
            self.test_results.append({
                'test': 'price_locator_service',
                'status': 'error',
                'error': str(e)
            })
    
    def test_media_message(self):
        """Teste de envio de mídia"""
        logger.info("📎 Testando envio de mídia...")
        
        if not self.test_contacts:
            return
        
        contact = self.test_contacts[0]
        
        # Teste com URL de imagem
        image_url = "https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=SPR+1.1+Test"
        
        try:
            result = self.dispatcher.send_media(
                contact, image_url, "🧪 Teste de envio de imagem - SPR 1.1", "image"
            )
            
            if result['success']:
                logger.info("✅ Mídia enviada com sucesso")
                self.test_results.append({
                    'test': 'media_message',
                    'status': 'success',
                    'details': result
                })
            else:
                logger.error(f"❌ Falha no envio de mídia: {result['error']}")
                self.test_results.append({
                    'test': 'media_message',
                    'status': 'failed',
                    'error': result['error']
                })
                
        except Exception as e:
            logger.error(f"❌ Erro no envio de mídia: {e}")
            self.test_results.append({
                'test': 'media_message',
                'status': 'error',
                'error': str(e)
            })
    
    def generate_report(self):
        """Gera relatório final dos testes"""
        logger.info("=" * 60)
        logger.info("📋 RELATÓRIO FINAL DOS TESTES")
        logger.info("=" * 60)
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['status'] == 'success'])
        failed_tests = len([r for r in self.test_results if r['status'] == 'failed'])
        error_tests = len([r for r in self.test_results if r['status'] == 'error'])
        
        logger.info(f"📊 Total de testes: {total_tests}")
        logger.info(f"✅ Sucessos: {successful_tests}")
        logger.info(f"❌ Falhas: {failed_tests}")
        logger.info(f"⚠️ Erros: {error_tests}")
        
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        logger.info(f"📈 Taxa de sucesso: {success_rate:.1f}%")
        
        # Salvar relatório em arquivo
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': total_tests,
                'successful_tests': successful_tests,
                'failed_tests': failed_tests,
                'error_tests': error_tests,
                'success_rate': success_rate
            },
            'results': self.test_results
        }
        
        report_file = f"whatsapp_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Relatório salvo em: {report_file}")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar relatório: {e}")
        
        logger.info("=" * 60)
        
        if success_rate >= 80:
            logger.info("🎉 INTEGRAÇÃO WHATSAPP FUNCIONANDO CORRETAMENTE!")
        elif success_rate >= 50:
            logger.info("⚠️ INTEGRAÇÃO PARCIALMENTE FUNCIONAL - VERIFICAR FALHAS")
        else:
            logger.info("❌ INTEGRAÇÃO COM PROBLEMAS - REVISAR CONFIGURAÇÃO")

def main():
    """Função principal"""
    print("🌾 SPR 1.1 - Teste de Integração WhatsApp")
    print("=" * 50)
    
    # Verificar se o arquivo .env existe
    env_file = Path(__file__).parent / '.env'
    if not env_file.exists():
        print("⚠️ Arquivo .env não encontrado!")
        print("📝 Copie o arquivo env.example para .env e configure as variáveis")
        return 1
    
    # Executar testes
    test_runner = WhatsAppIntegrationTest()
    
    try:
        test_runner.run_all_tests()
        return 0
    except KeyboardInterrupt:
        print("\n\n🔄 Testes interrompidos pelo usuário")
        return 1
    except Exception as e:
        print(f"\n\n❌ Erro fatal nos testes: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 