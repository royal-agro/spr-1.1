#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPR 1.1 - Inicializador Completo WhatsApp
Script para inicializar servidor Node.js e testar integração Python
"""

import os
import sys
import time
import json
import subprocess
import threading
import logging
from pathlib import Path
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('SPRWhatsApp')

class WhatsAppSystemManager:
    """
    Gerenciador completo do sistema WhatsApp
    """
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.whatsapp_server_path = self.project_root / 'whatsapp_server'
        self.node_process = None
        self.is_running = False
        
    def check_prerequisites(self):
        """Verifica pré-requisitos do sistema"""
        logger.info("🔍 Verificando pré-requisitos...")
        
        # Verificar Node.js
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"✅ Node.js encontrado: {result.stdout.strip()}")
            else:
                logger.error("❌ Node.js não encontrado")
                return False
        except FileNotFoundError:
            logger.error("❌ Node.js não está instalado")
            return False
        
        # Verificar npm
        try:
            result = subprocess.run(['npm', '--version'], 
                                  capture_output=True, text=True, shell=True)   
            if result.returncode == 0:
                logger.info(f"✅ npm encontrado: {result.stdout.strip()}")
            else:
                logger.error("❌ npm não encontrado")
                return False
        except FileNotFoundError:
            logger.error("❌ npm não está instalado")
            return False
        
        # Verificar diretório do servidor WhatsApp
        if not self.whatsapp_server_path.exists():
            logger.error(f"❌ Diretório do servidor WhatsApp não encontrado: {self.whatsapp_server_path}")
            return False
        
        # Verificar package.json
        package_json = self.whatsapp_server_path / 'package.json'
        if not package_json.exists():
            logger.error("❌ package.json não encontrado")
            return False
        
        logger.info("✅ Todos os pré-requisitos verificados")
        return True
    
    def install_dependencies(self):
        """Instala dependências do servidor Node.js"""
        logger.info("📦 Instalando dependências do servidor WhatsApp...")
        
        try:
            # Verificar se node_modules existe
            node_modules = self.whatsapp_server_path / 'node_modules'
            if node_modules.exists():
                logger.info("📦 Dependências já instaladas")
                return True
            
            # Instalar dependências
            result = subprocess.run(
                ['npm', 'install'],
                cwd=self.whatsapp_server_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("✅ Dependências instaladas com sucesso")
                return True
            else:
                logger.error(f"❌ Erro ao instalar dependências: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao instalar dependências: {e}")
            return False
    
    def start_whatsapp_server(self):
        """Inicia o servidor WhatsApp Node.js"""
        logger.info("🚀 Iniciando servidor WhatsApp...")
        
        try:
            # Comando para iniciar o servidor
            cmd = ['node', 'server.js']
            
            # Iniciar processo
            self.node_process = subprocess.Popen(
                cmd,
                cwd=self.whatsapp_server_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Thread para monitorar output
            threading.Thread(
                target=self._monitor_server_output,
                daemon=True
            ).start()
            
            # Aguardar inicialização
            time.sleep(5)
            
            if self.node_process.poll() is None:
                logger.info("✅ Servidor WhatsApp iniciado com sucesso")
                self.is_running = True
                return True
            else:
                logger.error("❌ Servidor WhatsApp falhou ao iniciar")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar servidor: {e}")
            return False
    
    def _monitor_server_output(self):
        """Monitora output do servidor Node.js"""
        if not self.node_process or not self.node_process.stdout:
            return
        
        for line in iter(self.node_process.stdout.readline, ''):
            if line:
                # Filtrar logs importantes
                if any(keyword in line for keyword in ['error', 'Error', 'ERROR']):
                    logger.error(f"[Node.js] {line.strip()}")
                elif any(keyword in line for keyword in ['QR', 'ready', 'connected']):
                    logger.info(f"[Node.js] {line.strip()}")
                elif 'WhatsApp' in line:
                    logger.info(f"[Node.js] {line.strip()}")
    
    def wait_for_whatsapp_ready(self, timeout=60):
        """Aguarda WhatsApp ficar pronto"""
        logger.info("⏳ Aguardando WhatsApp ficar pronto...")
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Importar dispatcher aqui para evitar problemas de import
                sys.path.append(str(self.project_root / 'app'))
                from app.dispatcher import dispatcher
                
                # Verificar status
                result = dispatcher.get_status()
                
                if result['success'] and result['status'].get('isReady'):
                    logger.info("✅ WhatsApp está pronto!")
                    return True
                
                time.sleep(2)
                
            except Exception as e:
                logger.debug(f"Aguardando WhatsApp... ({e})")
                time.sleep(2)
        
        logger.error("❌ Timeout aguardando WhatsApp ficar pronto")
        return False
    
    def run_integration_tests(self):
        """Executa testes de integração"""
        logger.info("🧪 Executando testes de integração...")
        
        try:
            # Importar e executar testes
            sys.path.append(str(self.project_root))
            from test_whatsapp_integration import WhatsAppIntegrationTest
            
            test_runner = WhatsAppIntegrationTest()
            test_runner.run_all_tests()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro nos testes de integração: {e}")
            return False
    
    def stop_whatsapp_server(self):
        """Para o servidor WhatsApp"""
        logger.info("🔄 Parando servidor WhatsApp...")
        
        if self.node_process:
            try:
                self.node_process.terminate()
                self.node_process.wait(timeout=10)
                logger.info("✅ Servidor WhatsApp parado")
            except subprocess.TimeoutExpired:
                logger.warning("⚠️ Forçando parada do servidor...")
                self.node_process.kill()
                self.node_process.wait()
            except Exception as e:
                logger.error(f"❌ Erro ao parar servidor: {e}")
        
        self.is_running = False
    
    def show_qr_instructions(self):
        """Mostra instruções para escanear QR Code"""
        logger.info("📱 INSTRUÇÕES PARA CONECTAR WHATSAPP:")
        logger.info("=" * 50)
        logger.info("1. Abra o WhatsApp no seu celular")
        logger.info("2. Toque em 'Mais opções' (três pontos)")
        logger.info("3. Selecione 'Dispositivos conectados'")
        logger.info("4. Toque em 'Conectar um dispositivo'")
        logger.info("5. Escaneie o QR Code que aparecerá no terminal")
        logger.info("6. Aguarde a conexão ser estabelecida")
        logger.info("=" * 50)
        logger.info("📌 O QR Code também estará disponível em:")
        logger.info("   http://localhost:3000")
        logger.info("=" * 50)
    
    def run_complete_system(self):
        """Executa o sistema completo"""
        logger.info("🌾 SPR 1.1 - Sistema WhatsApp Completo")
        logger.info("=" * 60)
        
        try:
            # 1. Verificar pré-requisitos
            if not self.check_prerequisites():
                return False
            
            # 2. Instalar dependências
            if not self.install_dependencies():
                return False
            
            # 3. Iniciar servidor WhatsApp
            if not self.start_whatsapp_server():
                return False
            
            # 4. Mostrar instruções QR
            self.show_qr_instructions()
            
            # 5. Aguardar WhatsApp ficar pronto
            if not self.wait_for_whatsapp_ready():
                logger.warning("⚠️ WhatsApp não ficou pronto, mas continuando...")
            
            # 6. Executar testes de integração
            logger.info("🧪 Executando testes básicos...")
            self.run_integration_tests()
            
            # 7. Manter sistema rodando
            logger.info("✅ Sistema WhatsApp iniciado com sucesso!")
            logger.info("🌐 Interface web: http://localhost:3000")
            logger.info("📱 API: http://localhost:3000/api")
            logger.info("🔄 Pressione Ctrl+C para parar")
            
            # Loop principal
            try:
                while self.is_running:
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("\n🔄 Parando sistema...")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro no sistema: {e}")
            return False
        
        finally:
            self.stop_whatsapp_server()

def main():
    """Função principal"""
    manager = WhatsAppSystemManager()
    
    try:
        success = manager.run_complete_system()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n🔄 Sistema interrompido pelo usuário")
        return 0
    except Exception as e:
        print(f"\n\n❌ Erro fatal: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 