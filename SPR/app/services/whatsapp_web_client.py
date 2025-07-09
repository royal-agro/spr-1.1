"""
Cliente WhatsApp Real usando whatsapp-web.js
Integração Python + Node.js para produção no DigitalOcean
"""

import asyncio
import json
import logging
import subprocess
import os
import signal
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class WhatsAppWebClient:
    """Cliente WhatsApp real usando whatsapp-web.js"""
    
    def __init__(self, session_path: str = "./whatsapp_session"):
        self.session_path = Path(session_path)
        self.session_path.mkdir(exist_ok=True)
        self.node_process = None
        self.is_ready = False
        self.qr_code = None
        self.connected = False
        
        # Configurações
        self.config = {
            "session_path": str(self.session_path),
            "headless": True,
            "devtools": False,
            "puppeteer_args": [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu"
            ]
        }

    async def initialize(self):
        """Inicializar cliente WhatsApp"""
        try:
            logger.info("🚀 Inicializando WhatsApp Web Client...")
            
            # Verificar se Node.js está instalado
            await self._check_nodejs()
            
            # Instalar dependências se necessário
            await self._install_dependencies()
            
            # Criar script Node.js
            await self._create_nodejs_script()
            
            # Iniciar processo Node.js
            await self._start_nodejs_process()
            
            logger.info("✅ WhatsApp Web Client inicializado!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao inicializar: {e}")
            return False

    async def _check_nodejs(self):
        """Verificar se Node.js está instalado"""
        try:
            result = subprocess.run(["node", "--version"], 
                                  capture_output=True, text=True, check=True)
            logger.info(f"Node.js encontrado: {result.stdout.strip()}")
        except subprocess.CalledProcessError:
            raise Exception("Node.js não encontrado. Instale Node.js 16+ primeiro.")

    async def _install_dependencies(self):
        """Instalar whatsapp-web.js e dependências"""
        package_json = self.session_path / "package.json"
        
        if not package_json.exists():
            logger.info("📦 Instalando dependências do WhatsApp...")
            
            # Criar package.json
            package_content = {
                "name": "spr-whatsapp-client",
                "version": "1.0.0",
                "description": "SPR WhatsApp Integration",
                "dependencies": {
                    "whatsapp-web.js": "^1.23.0",
                    "qrcode-terminal": "^0.12.0",
                    "puppeteer": "^21.0.0"
                }
            }
            
            with open(package_json, 'w') as f:
                json.dump(package_content, f, indent=2)
            
            # Instalar via npm
            install_process = await asyncio.create_subprocess_exec(
                "npm", "install",
                cwd=str(self.session_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await install_process.communicate()
            
            if install_process.returncode != 0:
                raise Exception(f"Erro ao instalar dependências: {stderr.decode()}")
            
            logger.info("✅ Dependências instaladas com sucesso!")

    async def _create_nodejs_script(self):
        """Criar script Node.js para WhatsApp"""
        script_path = self.session_path / "whatsapp_client.js"
        
        script_content = '''
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

class WhatsAppClient {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './session_data'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.on('qr', (qr) => {
            console.log('QR_CODE:', qr);
            qrcode.generate(qr, { small: true });
            this.saveQRCode(qr);
        });

        this.client.on('ready', () => {
            console.log('READY');
            this.saveStatus('ready');
        });

        this.client.on('authenticated', () => {
            console.log('AUTHENTICATED');
            this.saveStatus('authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            console.log('AUTH_FAILURE:', msg);
            this.saveStatus('auth_failure');
        });

        this.client.on('disconnected', (reason) => {
            console.log('DISCONNECTED:', reason);
            this.saveStatus('disconnected');
        });

        this.client.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });

        this.client.on('message_ack', (message, ack) => {
            this.handleMessageAck(message, ack);
        });
    }

    async initialize() {
        try {
            await this.client.initialize();
            return true;
        } catch (error) {
            console.error('INIT_ERROR:', error);
            return false;
        }
    }

    async sendMessage(number, message) {
        try {
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            const sent = await this.client.sendMessage(chatId, message);
            console.log('MESSAGE_SENT:', JSON.stringify({
                id: sent.id.id,
                to: number,
                message: message,
                timestamp: Date.now()
            }));
            return sent.id.id;
        } catch (error) {
            console.error('SEND_ERROR:', error);
            throw error;
        }
    }

    async sendMedia(number, mediaPath, caption = '') {
        try {
            const media = MessageMedia.fromFilePath(mediaPath);
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            const sent = await this.client.sendMessage(chatId, media, { caption });
            return sent.id.id;
        } catch (error) {
            console.error('SEND_MEDIA_ERROR:', error);
            throw error;
        }
    }

    async getContacts() {
        try {
            const contacts = await this.client.getContacts();
            return contacts.map(contact => ({
                id: contact.id.user,
                name: contact.name || contact.pushname || '',
                number: contact.number,
                isMyContact: contact.isMyContact,
                isBlocked: contact.isBlocked
            }));
        } catch (error) {
            console.error('GET_CONTACTS_ERROR:', error);
            return [];
        }
    }

    async handleIncomingMessage(message) {
        try {
            const messageData = {
                id: message.id.id,
                from: message.from,
                to: message.to,
                body: message.body,
                type: message.type,
                timestamp: message.timestamp,
                isForwarded: message.isForwarded,
                hasMedia: message.hasMedia,
                isFromMe: message.fromMe
            };

            console.log('MESSAGE_RECEIVED:', JSON.stringify(messageData));
            this.saveMessage(messageData);

            // Auto-resposta para mensagens específicas do SPR
            if (!message.fromMe && this.shouldAutoRespond(message.body)) {
                await this.sendAutoResponse(message.from, message.body);
            }
        } catch (error) {
            console.error('HANDLE_MESSAGE_ERROR:', error);
        }
    }

    shouldAutoRespond(messageBody) {
        const keywords = ['preço', 'soja', 'milho', 'café', 'boi', 'algodão', 'previsão'];
        return keywords.some(keyword => 
            messageBody.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    async sendAutoResponse(chatId, originalMessage) {
        const responses = [
            '🌱 Olá! Recebemos sua mensagem sobre commodities agrícolas.',
            '📊 Nossa equipe do SPR está analisando os dados mais recentes.',
            '⏰ Em breve enviaremos as previsões de preços atualizadas.',
            '📱 Para informações imediatas, digite "PRECOS" ou "AJUDA".'
        ];

        for (let i = 0; i < responses.length; i++) {
            setTimeout(async () => {
                try {
                    await this.client.sendMessage(chatId, responses[i]);
                } catch (error) {
                    console.error('AUTO_RESPONSE_ERROR:', error);
                }
            }, (i + 1) * 2000); // Delay de 2s entre mensagens
        }
    }

    handleMessageAck(message, ack) {
        const ackStatus = {
            1: 'sent',
            2: 'received',
            3: 'read',
            4: 'played'
        };

        console.log('MESSAGE_ACK:', JSON.stringify({
            messageId: message.id.id,
            status: ackStatus[ack] || 'unknown',
            timestamp: Date.now()
        }));
    }

    saveQRCode(qr) {
        fs.writeFileSync('./qr_code.txt', qr);
    }

    saveStatus(status) {
        const statusData = {
            status: status,
            timestamp: Date.now()
        };
        fs.writeFileSync('./status.json', JSON.stringify(statusData, null, 2));
    }

    saveMessage(messageData) {
        const messagesFile = './messages.json';
        let messages = [];
        
        if (fs.existsSync(messagesFile)) {
            try {
                messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
            } catch (error) {
                messages = [];
            }
        }
        
        messages.push(messageData);
        
        // Manter apenas as últimas 1000 mensagens
        if (messages.length > 1000) {
            messages = messages.slice(-1000);
        }
        
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    }

    async destroy() {
        try {
            await this.client.destroy();
            console.log('CLIENT_DESTROYED');
        } catch (error) {
            console.error('DESTROY_ERROR:', error);
        }
    }
}

// Processar comandos via stdin
const client = new WhatsAppClient();

process.stdin.setEncoding('utf8');
process.stdin.on('data', async (data) => {
    try {
        const command = JSON.parse(data.trim());
        
        switch (command.action) {
            case 'send_message':
                const messageId = await client.sendMessage(command.number, command.message);
                console.log('COMMAND_RESULT:', JSON.stringify({
                    action: 'send_message',
                    success: true,
                    messageId: messageId
                }));
                break;
                
            case 'send_media':
                const mediaMessageId = await client.sendMedia(command.number, command.mediaPath, command.caption);
                console.log('COMMAND_RESULT:', JSON.stringify({
                    action: 'send_media',
                    success: true,
                    messageId: mediaMessageId
                }));
                break;
                
            case 'get_contacts':
                const contacts = await client.getContacts();
                console.log('COMMAND_RESULT:', JSON.stringify({
                    action: 'get_contacts',
                    success: true,
                    contacts: contacts
                }));
                break;
                
            default:
                console.log('COMMAND_ERROR: Unknown action');
        }
    } catch (error) {
        console.error('COMMAND_ERROR:', error);
    }
});

// Inicializar cliente
client.initialize().then(() => {
    console.log('WhatsApp Client started successfully');
}).catch((error) => {
    console.error('Failed to start WhatsApp Client:', error);
    process.exit(1);
});

// Cleanup ao sair
process.on('SIGINT', async () => {
    console.log('Shutting down WhatsApp Client...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down WhatsApp Client...');
    await client.destroy();
    process.exit(0);
});
'''
        
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        logger.info("✅ Script Node.js criado!")

    async def _start_nodejs_process(self):
        """Iniciar processo Node.js"""
        try:
            script_path = self.session_path / "whatsapp_client.js"
            
            self.node_process = await asyncio.create_subprocess_exec(
                "node", str(script_path),
                cwd=str(self.session_path),
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Monitorar saída do processo
            asyncio.create_task(self._monitor_nodejs_output())
            
            logger.info("✅ Processo Node.js iniciado!")
            
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar Node.js: {e}")
            raise

    async def _monitor_nodejs_output(self):
        """Monitorar saída do processo Node.js"""
        while self.node_process and self.node_process.returncode is None:
            try:
                line = await self.node_process.stdout.readline()
                if line:
                    output = line.decode().strip()
                    await self._process_nodejs_output(output)
            except Exception as e:
                logger.error(f"Erro ao monitorar saída: {e}")
                break

    async def _process_nodejs_output(self, output: str):
        """Processar saída do Node.js"""
        try:
            if output.startswith('QR_CODE:'):
                self.qr_code = output.replace('QR_CODE:', '').strip()
                logger.info("📱 QR Code gerado! Escaneie com seu WhatsApp.")
                
            elif output == 'READY':
                self.is_ready = True
                self.connected = True
                logger.info("✅ WhatsApp conectado e pronto!")
                
            elif output == 'AUTHENTICATED':
                logger.info("🔐 WhatsApp autenticado!")
                
            elif output.startswith('MESSAGE_RECEIVED:'):
                message_data = json.loads(output.replace('MESSAGE_RECEIVED:', ''))
                await self._handle_received_message(message_data)
                
            elif output.startswith('MESSAGE_SENT:'):
                message_data = json.loads(output.replace('MESSAGE_SENT:', ''))
                logger.info(f"📤 Mensagem enviada: {message_data['id']}")
                
            elif output.startswith('COMMAND_RESULT:'):
                result_data = json.loads(output.replace('COMMAND_RESULT:', ''))
                logger.info(f"✅ Comando executado: {result_data}")
                
        except Exception as e:
            logger.error(f"Erro ao processar saída: {e}")

    async def _handle_received_message(self, message_data: Dict[str, Any]):
        """Processar mensagem recebida"""
        try:
            logger.info(f"📥 Mensagem recebida de {message_data['from']}: {message_data['body']}")
            
            # Aqui você pode integrar com o sistema de previsões do SPR
            # Por exemplo, se a mensagem contém "preço soja"
            if 'preço' in message_data['body'].lower() and 'soja' in message_data['body'].lower():
                await self._send_price_prediction(message_data['from'], 'soja')
                
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {e}")

    async def _send_price_prediction(self, phone: str, commodity: str):
        """Enviar previsão de preços (integração com SPR)"""
        try:
            # Aqui você integraria com o sistema de previsões do SPR
            prediction_message = f"""
🌱 *PREVISÃO DE PREÇOS - {commodity.upper()}*

📅 *Data:* {datetime.now().strftime('%d/%m/%Y')}
💰 *Preço Atual:* R$ 145,50/saca
📈 *Tendência:* Alta (+2,3%)
📊 *Próximos 7 dias:* R$ 148,20/saca

🤖 *SPR - Sistema de Previsão Rural*
            """.strip()
            
            await self.send_message(phone, prediction_message)
            
        except Exception as e:
            logger.error(f"Erro ao enviar previsão: {e}")

    async def send_message(self, phone: str, message: str) -> bool:
        """Enviar mensagem via WhatsApp"""
        try:
            if not self.is_ready:
                logger.error("❌ WhatsApp não está pronto")
                return False
            
            command = {
                "action": "send_message",
                "number": phone,
                "message": message
            }
            
            command_json = json.dumps(command) + '\n'
            self.node_process.stdin.write(command_json.encode())
            await self.node_process.stdin.drain()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar mensagem: {e}")
            return False

    async def send_media(self, phone: str, media_path: str, caption: str = "") -> bool:
        """Enviar mídia via WhatsApp"""
        try:
            if not self.is_ready:
                logger.error("❌ WhatsApp não está pronto")
                return False
            
            command = {
                "action": "send_media",
                "number": phone,
                "mediaPath": media_path,
                "caption": caption
            }
            
            command_json = json.dumps(command) + '\n'
            self.node_process.stdin.write(command_json.encode())
            await self.node_process.stdin.drain()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar mídia: {e}")
            return False

    async def get_contacts(self) -> List[Dict[str, Any]]:
        """Obter lista de contatos"""
        try:
            if not self.is_ready:
                logger.error("❌ WhatsApp não está pronto")
                return []
            
            command = {
                "action": "get_contacts"
            }
            
            command_json = json.dumps(command) + '\n'
            self.node_process.stdin.write(command_json.encode())
            await self.node_process.stdin.drain()
            
            # Aguardar resposta (implementar sistema de callback)
            return []
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter contatos: {e}")
            return []

    def get_qr_code(self) -> Optional[str]:
        """Obter QR code para autenticação"""
        return self.qr_code

    def is_connected(self) -> bool:
        """Verificar se está conectado"""
        return self.connected and self.is_ready

    async def disconnect(self):
        """Desconectar do WhatsApp"""
        try:
            if self.node_process:
                self.node_process.terminate()
                await self.node_process.wait()
                logger.info("✅ WhatsApp desconectado")
        except Exception as e:
            logger.error(f"❌ Erro ao desconectar: {e}")

# Instância global
whatsapp_web_client = None

def get_whatsapp_web_client() -> WhatsAppWebClient:
    """Obter instância do cliente WhatsApp"""
    global whatsapp_web_client
    if whatsapp_web_client is None:
        whatsapp_web_client = WhatsAppWebClient()
    return whatsapp_web_client 