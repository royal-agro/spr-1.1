const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configurações
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG || 'true';

// Criar diretórios necessários
const dirs = ['logs', 'sessions', 'media', 'qrcodes'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

class SPRWhatsApp {
    constructor() {
        this.app = express();
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.sessionName = `spr_session_${Date.now()}`;
        
        this.setupExpress();
        this.setupWhatsApp();
        this.setupRoutes();
        
        console.log('🚀 SPR WhatsApp Server iniciando...');
    }

    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Servir arquivos estáticos
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
    }

    setupWhatsApp() {
        console.log('📱 Configurando cliente WhatsApp...');
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './sessions',
                clientId: this.sessionName
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

        this.setupWhatsAppEvents();
    }

    setupWhatsAppEvents() {
        // QR Code
        this.client.on('qr', async (qr) => {
            console.log('📱 QR Code gerado!');
            console.log('🌐 Acesse: http://localhost:' + PORT);
            this.qrCode = qr;
            
            // Mostrar QR no terminal
            qrcodeTerminal.generate(qr, { small: true });
            
            // Salvar QR Code como imagem
            try {
                const qrCodeDataURL = await qrcode.toDataURL(qr);
                const base64Data = qrCodeDataURL.split(',')[1];
                fs.writeFileSync('./qrcodes/qr_latest.png', base64Data, 'base64');
                console.log('💾 QR Code salvo em: ./qrcodes/qr_latest.png');
            } catch (error) {
                console.error('❌ Erro ao salvar QR Code:', error);
            }
        });

        // Autenticado
        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp autenticado com sucesso!');
        });

        // Pronto
        this.client.on('ready', () => {
            console.log('✅ WhatsApp conectado e pronto!');
            console.log('🎉 SPR WhatsApp está funcionando!');
            this.isReady = true;
            this.qrCode = null;
        });

        // Falha na autenticação
        this.client.on('auth_failure', (msg) => {
            console.error('❌ Falha na autenticação:', msg);
        });

        // Desconectado
        this.client.on('disconnected', (reason) => {
            console.warn('⚠️ WhatsApp desconectado:', reason);
            this.isReady = false;
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            if (!message.fromMe) {
                console.log(`📥 Mensagem recebida: ${message.body}`);
                
                // Resposta automática para teste
                if (message.body.toLowerCase().includes('spr') || 
                    message.body.toLowerCase().includes('preço') ||
                    message.body.toLowerCase().includes('preco')) {
                    
                    const response = `🌾 SPR - Sistema Preditivo Royal

Olá! Sou o assistente do SPR. Posso ajudar com:

📈 Previsões de preços de:
• Soja
• Milho  
• Café
• Algodão
• Boi

Digite o nome da commodity para receber a previsão!`;
                    
                    await message.reply(response);
                }
            }
        });
    }

    setupRoutes() {
        // Página inicial com QR Code
        this.app.get('/', (req, res) => {
            let statusHtml = '';
            
            if (this.isReady) {
                statusHtml = `
                    <div class="status connected">
                        ✅ WhatsApp Conectado!
                        <br>
                        <small>SPR está pronto para enviar mensagens</small>
                    </div>
                `;
            } else if (this.qrCode) {
                statusHtml = `
                    <div class="status waiting">
                        📱 Aguardando conexão...
                        <br>
                        <small>Escaneie o QR Code com seu WhatsApp</small>
                    </div>
                    <div class="qr-container">
                        <img src="/qr" alt="QR Code" class="qr-image">
                    </div>
                `;
            } else {
                statusHtml = `
                    <div class="status generating">
                        ⏳ Gerando QR Code...
                        <br>
                        <small>Aguarde alguns segundos</small>
                    </div>
                `;
            }

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>🌾 SPR WhatsApp</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 20px; 
                            background: linear-gradient(135deg, #25d366, #128c7e);
                            min-height: 100vh;
                            margin: 0;
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 0 auto; 
                            background: white; 
                            padding: 30px; 
                            border-radius: 20px; 
                            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        }
                        .header {
                            background: #25d366;
                            color: white;
                            padding: 20px;
                            border-radius: 15px;
                            margin-bottom: 20px;
                        }
                        .status { 
                            padding: 20px; 
                            margin: 20px 0; 
                            border-radius: 15px; 
                            font-weight: bold;
                            font-size: 18px;
                        }
                        .connected { 
                            background: #d4edda; 
                            color: #155724; 
                            border: 2px solid #c3e6cb;
                        }
                        .waiting { 
                            background: #fff3cd; 
                            color: #856404; 
                            border: 2px solid #ffeaa7;
                        }
                        .generating { 
                            background: #cce5ff; 
                            color: #004085; 
                            border: 2px solid #74b9ff;
                        }
                        .qr-container {
                            margin: 20px 0;
                            padding: 20px;
                            border: 3px dashed #25d366;
                            border-radius: 15px;
                            background: #f8fff8;
                        }
                        .qr-image { 
                            max-width: 300px; 
                            width: 100%; 
                            border: 3px solid #25d366; 
                            border-radius: 15px;
                        }
                        button { 
                            background: #25d366; 
                            color: white; 
                            border: none; 
                            padding: 15px 30px; 
                            border-radius: 10px; 
                            cursor: pointer; 
                            font-size: 16px; 
                            margin: 10px;
                        }
                        button:hover { 
                            background: #1ea952; 
                        }
                        .instructions {
                            background: #e8f5e8;
                            padding: 20px;
                            border-radius: 10px;
                            margin: 20px 0;
                            text-align: left;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🌾 SPR WhatsApp</h1>
                            <h2>Sistema Preditivo Royal</h2>
                            <p>Porta ${PORT}</p>
                        </div>
                        
                        ${statusHtml}
                        
                        <div class="instructions">
                            <h3>📱 Como conectar:</h3>
                            <p>1. Abra o <strong>WhatsApp</strong> no seu celular</p>
                            <p>2. Vá em <strong>Menu (⋮)</strong> → <strong>Dispositivos conectados</strong></p>
                            <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                            <p>4. <strong>Escaneie o QR Code</strong> acima</p>
                        </div>
                        
                        <button onclick="location.reload()">🔄 Atualizar</button>
                        <button onclick="window.open('/status', '_blank')">📊 Status</button>
                        
                        <div style="margin-top: 20px; color: #666; font-size: 12px;">
                            Última atualização: ${new Date().toLocaleString()}
                        </div>
                    </div>
                    
                    <script>
                        // Auto-refresh se não estiver conectado
                        ${!this.isReady ? 'setTimeout(() => location.reload(), 10000);' : ''}
                    </script>
                </body>
                </html>
            `);
        });

        // Endpoint para QR Code
        this.app.get('/qr', async (req, res) => {
            if (this.qrCode) {
                try {
                    const qrCodeDataURL = await qrcode.toDataURL(this.qrCode);
                    const base64Data = qrCodeDataURL.split(',')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    res.setHeader('Content-Type', 'image/png');
                    res.send(buffer);
                } catch (error) {
                    res.status(500).send('Erro ao gerar QR Code');
                }
            } else {
                res.status(404).send('QR Code não disponível');
            }
        });

        // Status do sistema
        this.app.get('/status', (req, res) => {
            res.json({
                status: this.isReady ? 'connected' : 'disconnected',
                hasQR: !!this.qrCode,
                timestamp: new Date().toISOString(),
                session: this.sessionName
            });
        });

        // API para enviar mensagens
        this.app.post('/api/send', async (req, res) => {
            try {
                const { number, message, type = 'text' } = req.body;
                
                if (!this.isReady) {
                    return res.status(503).json({
                        success: false,
                        error: 'WhatsApp não está conectado'
                    });
                }

                if (!number || !message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Número e mensagem são obrigatórios'
                    });
                }

                // Normalizar número
                const normalizedNumber = this.normalizeNumber(number);
                const chatId = normalizedNumber + '@c.us';

                // Enviar mensagem
                const sentMessage = await this.client.sendMessage(chatId, message);
                
                console.log(`📤 Mensagem enviada para ${normalizedNumber}: ${message}`);
                
                res.json({
                    success: true,
                    messageId: sentMessage.id.id,
                    to: normalizedNumber,
                    message: message,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Erro ao enviar mensagem:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API para enviar mídia
        this.app.post('/api/send-media', async (req, res) => {
            try {
                const { number, media, caption = '', type = 'image' } = req.body;
                
                if (!this.isReady) {
                    return res.status(503).json({
                        success: false,
                        error: 'WhatsApp não está conectado'
                    });
                }

                const normalizedNumber = this.normalizeNumber(number);
                const chatId = normalizedNumber + '@c.us';

                // Criar MessageMedia
                let messageMedia;
                if (media.startsWith('http')) {
                    messageMedia = await MessageMedia.fromUrl(media);
                } else if (fs.existsSync(media)) {
                    messageMedia = MessageMedia.fromFilePath(media);
                } else {
                    throw new Error('Mídia não encontrada');
                }

                const sentMessage = await this.client.sendMessage(chatId, messageMedia, { caption });
                
                console.log(`📎 Mídia enviada para ${normalizedNumber}`);
                
                res.json({
                    success: true,
                    messageId: sentMessage.id.id,
                    to: normalizedNumber,
                    type: type,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Erro ao enviar mídia:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                whatsapp: this.isReady ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString()
            });
        });
    }

    normalizeNumber(number) {
        // Remover caracteres não numéricos
        let cleaned = number.replace(/\D/g, '');
        
        // Adicionar código do país se necessário
        if (cleaned.length === 11 && cleaned.startsWith('0')) {
            cleaned = '55' + cleaned.substring(1);
        } else if (cleaned.length === 10) {
            cleaned = '55' + cleaned;
        } else if (cleaned.length === 11 && !cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        
        return cleaned;
    }

    async start() {
        try {
            console.log('🔄 Inicializando WhatsApp...');
            await this.client.initialize();
            
            this.app.listen(PORT, () => {
                console.log(`🌐 Servidor rodando em http://localhost:${PORT}`);
                console.log('📱 Aguardando QR Code...');
            });
            
        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
        }
    }

    async stop() {
        try {
            console.log('🛑 Parando servidor...');
            if (this.client) {
                await this.client.destroy();
            }
            process.exit(0);
        } catch (error) {
            console.error('❌ Erro ao parar servidor:', error);
            process.exit(1);
        }
    }
}

// Inicializar servidor
const server = new SPRWhatsApp();

// Handlers para encerramento
process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

// Iniciar
server.start().catch(console.error);

module.exports = SPRWhatsApp; 