#!/usr/bin/env python3
"""
Teste da integração real do WhatsApp com SPR 1.1
Verifica se whatsapp-web.js está funcionando corretamente
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Adicionar path do projeto
sys.path.append(str(Path(__file__).parent))

from app.services.whatsapp_web_client import WhatsAppWebClient, get_whatsapp_web_client
from app.precificacao.previsao_precos import PrevisorDePrecos

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WhatsAppRealTest:
    """Classe para testar integração real do WhatsApp"""
    
    def __init__(self):
        self.whatsapp_client = None
        self.test_results = {
            "initialization": False,
            "connection": False,
            "qr_code": False,
            "message_send": False,
            "message_receive": False,
            "spr_integration": False
        }

    async def run_all_tests(self):
        """Executar todos os testes"""
        logger.info("🧪 Iniciando testes da integração WhatsApp Real...")
        
        try:
            # Teste 1: Inicialização
            await self.test_initialization()
            
            # Teste 2: Conexão
            await self.test_connection()
            
            # Teste 3: QR Code
            await self.test_qr_code_generation()
            
            # Aguardar autenticação manual
            await self.wait_for_authentication()
            
            # Teste 4: Envio de mensagem
            await self.test_message_sending()
            
            # Teste 5: Integração com SPR
            await self.test_spr_integration()
            
            # Mostrar resultados
            self.show_test_results()
            
        except Exception as e:
            logger.error(f"❌ Erro durante os testes: {e}")
            return False

    async def test_initialization(self):
        """Teste 1: Inicialização do cliente"""
        logger.info("🔧 Teste 1: Inicializando cliente WhatsApp...")
        
        try:
            self.whatsapp_client = get_whatsapp_web_client()
            
            # Verificar se Node.js está disponível
            import subprocess
            result = subprocess.run(["node", "--version"], 
                                  capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("❌ Node.js não encontrado!")
                logger.info("💡 Instale Node.js 16+ primeiro:")
                logger.info("   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -")
                logger.info("   sudo apt-get install -y nodejs")
                return False
            
            logger.info(f"✅ Node.js encontrado: {result.stdout.strip()}")
            
            # Inicializar cliente
            success = await self.whatsapp_client.initialize()
            self.test_results["initialization"] = success
            
            if success:
                logger.info("✅ Teste 1: Cliente inicializado com sucesso!")
            else:
                logger.error("❌ Teste 1: Falha na inicialização!")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Teste 1: Erro na inicialização: {e}")
            return False

    async def test_connection(self):
        """Teste 2: Conexão com WhatsApp"""
        logger.info("🌐 Teste 2: Testando conexão...")
        
        try:
            # Aguardar alguns segundos para inicialização
            await asyncio.sleep(5)
            
            # Verificar se o processo Node.js está rodando
            if self.whatsapp_client.node_process is None:
                logger.error("❌ Processo Node.js não está rodando!")
                return False
            
            if self.whatsapp_client.node_process.returncode is not None:
                logger.error("❌ Processo Node.js terminou inesperadamente!")
                return False
            
            self.test_results["connection"] = True
            logger.info("✅ Teste 2: Conexão estabelecida!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Teste 2: Erro na conexão: {e}")
            return False

    async def test_qr_code_generation(self):
        """Teste 3: Geração do QR Code"""
        logger.info("📱 Teste 3: Aguardando QR Code...")
        
        try:
            # Aguardar QR code por até 30 segundos
            for i in range(30):
                qr_code = self.whatsapp_client.get_qr_code()
                if qr_code:
                    self.test_results["qr_code"] = True
                    logger.info("✅ Teste 3: QR Code gerado!")
                    logger.info("📱 QR Code salvo em: whatsapp_session/qr_code.txt")
                    logger.info("🔗 Escaneie com seu WhatsApp para conectar")
                    return True
                
                await asyncio.sleep(1)
                if i % 5 == 0:
                    logger.info(f"⏳ Aguardando QR Code... ({i}/30s)")
            
            logger.error("❌ Teste 3: QR Code não foi gerado em 30s")
            return False
            
        except Exception as e:
            logger.error(f"❌ Teste 3: Erro na geração do QR Code: {e}")
            return False

    async def wait_for_authentication(self):
        """Aguardar autenticação manual do usuário"""
        logger.info("⏳ Aguardando autenticação...")
        logger.info("📱 Escaneie o QR Code com seu WhatsApp Business")
        logger.info("⌛ Aguardando até 60 segundos...")
        
        try:
            # Aguardar autenticação por até 60 segundos
            for i in range(60):
                if self.whatsapp_client.is_connected():
                    logger.info("✅ WhatsApp autenticado e conectado!")
                    return True
                
                await asyncio.sleep(1)
                if i % 10 == 0:
                    logger.info(f"⏳ Aguardando autenticação... ({i}/60s)")
            
            logger.warning("⚠️ Autenticação não concluída em 60s")
            logger.info("💡 Continue os testes manualmente após a autenticação")
            return False
            
        except Exception as e:
            logger.error(f"❌ Erro durante autenticação: {e}")
            return False

    async def test_message_sending(self):
        """Teste 4: Envio de mensagem"""
        logger.info("📤 Teste 4: Testando envio de mensagem...")
        
        try:
            if not self.whatsapp_client.is_connected():
                logger.warning("⚠️ WhatsApp não está conectado. Pulando teste de mensagem.")
                return False
            
            # Número de teste (substitua pelo seu número)
            test_number = input("📱 Digite seu número para teste (ex: 5511999999999): ").strip()
            
            if not test_number:
                logger.warning("⚠️ Número não fornecido. Pulando teste de mensagem.")
                return False
            
            # Mensagem de teste
            test_message = """
🤖 *SPR 1.1 - Teste de Integração*

✅ WhatsApp conectado com sucesso!
📊 Sistema de previsão de preços ativo
🌱 Commodities monitoradas: Soja, Milho, Café, Boi, Algodão

🔗 Integração funcionando perfeitamente!
            """.strip()
            
            # Enviar mensagem
            success = await self.whatsapp_client.send_message(test_number, test_message)
            
            if success:
                self.test_results["message_send"] = True
                logger.info("✅ Teste 4: Mensagem enviada com sucesso!")
                logger.info(f"📱 Mensagem enviada para: {test_number}")
            else:
                logger.error("❌ Teste 4: Falha no envio da mensagem!")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Teste 4: Erro no envio: {e}")
            return False

    async def test_spr_integration(self):
        """Teste 5: Integração com sistema SPR"""
        logger.info("🌱 Teste 5: Testando integração SPR...")
        
        try:
            # Criar previsor de preços
            previsor = PrevisorDePrecos(commodity="soja")
            
            # Carregar dados e treinar modelo
            logger.info("📊 Carregando dados e treinando modelo...")
            dados = previsor.carregar_dados()
            metricas = previsor.treinar_modelo()
            
            logger.info(f"📈 Modelo treinado - R²: {metricas.get('r2', 0):.3f}")
            
            # Gerar previsão
            logger.info("🔮 Gerando previsão de preços...")
            previsao = previsor.prever_precos_futuros(dias=7)
            
            if previsao and len(previsao['previsoes']) > 0:
                # Criar mensagem com previsão
                primeira_previsao = previsao['previsoes'][0]
                preco_previsto = primeira_previsao['preco_previsto']
                
                mensagem_previsao = f"""
🌱 *PREVISÃO SPR - SOJA*

📅 *Data:* {primeira_previsao['data'].strftime('%d/%m/%Y')}
💰 *Preço Previsto:* R$ {preco_previsto:.2f}/saca
📊 *Modelo:* R² = {metricas.get('r2', 0):.3f}

🤖 *Sistema SPR 1.1 - Funcionando!*
                """.strip()
                
                logger.info("✅ Previsão gerada com sucesso!")
                logger.info(f"💰 Preço previsto: R$ {preco_previsto:.2f}/saca")
                
                # Se WhatsApp estiver conectado, enviar previsão
                if self.whatsapp_client.is_connected():
                    test_number = input("📱 Enviar previsão para número (Enter para pular): ").strip()
                    if test_number:
                        await self.whatsapp_client.send_message(test_number, mensagem_previsao)
                        logger.info("📤 Previsão enviada via WhatsApp!")
                
                self.test_results["spr_integration"] = True
                logger.info("✅ Teste 5: Integração SPR funcionando!")
                return True
            else:
                logger.error("❌ Teste 5: Falha na geração de previsão!")
                return False
            
        except Exception as e:
            logger.error(f"❌ Teste 5: Erro na integração SPR: {e}")
            return False

    def show_test_results(self):
        """Mostrar resultados dos testes"""
        logger.info("\n" + "="*50)
        logger.info("📋 RESULTADOS DOS TESTES")
        logger.info("="*50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, result in self.test_results.items():
            status = "✅ PASSOU" if result else "❌ FALHOU"
            logger.info(f"{test_name.replace('_', ' ').title()}: {status}")
        
        logger.info("-"*50)
        logger.info(f"Total: {passed_tests}/{total_tests} testes passaram")
        
        if passed_tests == total_tests:
            logger.info("🎉 TODOS OS TESTES PASSARAM!")
            logger.info("✅ WhatsApp + SPR integração está funcionando!")
        elif passed_tests >= total_tests * 0.7:
            logger.info("⚠️ MAIORIA DOS TESTES PASSOU")
            logger.info("💡 Verifique os testes que falharam")
        else:
            logger.info("❌ MUITOS TESTES FALHARAM")
            logger.info("🔧 Revise a configuração do sistema")
        
        logger.info("="*50)

    async def cleanup(self):
        """Limpeza após testes"""
        logger.info("🧹 Limpando recursos...")
        
        try:
            if self.whatsapp_client:
                await self.whatsapp_client.disconnect()
            logger.info("✅ Limpeza concluída!")
        except Exception as e:
            logger.error(f"❌ Erro na limpeza: {e}")

async def main():
    """Função principal"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("""
SPR WhatsApp Real Test

Uso: python3 test_whatsapp_real.py

Este script testa:
1. ✅ Inicialização do cliente WhatsApp
2. 🌐 Conexão com WhatsApp Web
3. 📱 Geração do QR Code
4. 📤 Envio de mensagens
5. 🌱 Integração com sistema SPR

Requisitos:
- Node.js 16+ instalado
- WhatsApp Business no celular
- Conexão com internet

Exemplo de uso:
cd SPR
python3 test_whatsapp_real.py
""")
        return
    
    tester = WhatsAppRealTest()
    
    try:
        await tester.run_all_tests()
    except KeyboardInterrupt:
        logger.info("\n⏹️ Testes interrompidos pelo usuário")
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main()) 