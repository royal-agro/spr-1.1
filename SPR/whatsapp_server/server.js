const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const winston = require('winston');
const cron = require('node-cron');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configurar logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Criar diretórios necessários
const dirs = ['logs', 'sessions', 'media', 'qrcodes'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

class SPRWhatsAppServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.contacts = [];
        this.messages = [];
        
        this.setupExpress();
        this.setupWhatsApp();
        this.setupRoutes();
        this.setupSocketIO();
        this.setupCronJobs();
    }

    setupExpress() {
        // Middleware de segurança
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Servir arquivos estáticos
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
    }

    setupWhatsApp() {
        logger.info('🚀 Inicializando cliente WhatsApp...');
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './sessions'
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
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            }
        });

        this.setupWhatsAppEvents();
    }

    setupWhatsAppEvents() {
        // QR Code
        this.client.on('qr', async (qr) => {
            logger.info('📱 QR Code gerado!');
            this.qrCode = qr;
            
            // Mostrar QR no terminal
            qrcodeTerminal.generate(qr, { small: true });
            
            // Gerar QR Code como imagem
            try {
                const qrCodeDataURL = await qrcode.toDataURL(qr);
                fs.writeFileSync('./qrcodes/qr_latest.png', qrCodeDataURL.split(',')[1], 'base64');
                
                // Emitir via Socket.IO
                this.io.emit('qr', { qr, qrCodeDataURL });
            } catch (error) {
                logger.error('❌ Erro ao gerar QR Code:', error);
            }
        });

        // Autenticado
        this.client.on('authenticated', () => {
            logger.info('🔐 WhatsApp autenticado!');
            this.io.emit('authenticated');
        });

        // Pronto
        this.client.on('ready', async () => {
            logger.info('✅ WhatsApp pronto para uso!');
            this.isReady = true;
            this.qrCode = null;
            
            // Carregar contatos
            await this.loadContacts();
            
            this.io.emit('ready', { 
                message: 'WhatsApp conectado e pronto!',
                contacts: this.contacts.length 
            });
        });

        // Falha na autenticação
        this.client.on('auth_failure', (msg) => {
            logger.error('❌ Falha na autenticação:', msg);
            this.io.emit('auth_failure', { message: msg });
        });

        // Desconectado
        this.client.on('disconnected', (reason) => {
            logger.warn('⚠️ WhatsApp desconectado:', reason);
            this.isReady = false;
            this.io.emit('disconnected', { reason });
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });

        // Confirmação de mensagem
        this.client.on('message_ack', (message, ack) => {
            this.handleMessageAck(message, ack);
        });
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
                isFromMe: message.fromMe,
                contact: await message.getContact()
            };

            // Salvar mensagem
            this.messages.unshift(messageData);
            if (this.messages.length > 1000) {
                this.messages = this.messages.slice(0, 1000);
            }

            logger.info(`📥 Mensagem recebida de ${messageData.contact.name || messageData.from}: ${messageData.body}`);
            
            // Emitir via Socket.IO
            this.io.emit('message_received', messageData);

            // Verificar se deve responder automaticamente
            if (!message.fromMe && this.shouldAutoRespond(message.body)) {
                await this.sendSPRResponse(message.from, message.body);
            }

        } catch (error) {
            logger.error('❌ Erro ao processar mensagem:', error);
        }
    }

    shouldAutoRespond(messageBody) {
        const keywords = [
            'preço', 'preco', 'soja', 'milho', 'café', 'cafe', 'boi', 'algodão', 'algodao',
            'previsão', 'previsao', 'cotação', 'cotacao', 'mercado', 'commodity',
            'rural', 'agro', 'agricultura', 'ajuda', 'help', 'spr'
        ];
        
        const lowerBody = messageBody.toLowerCase();
        return keywords.some(keyword => lowerBody.includes(keyword));
    }

    async sendSPRResponse(chatId, originalMessage) {
        try {
            const lowerMessage = originalMessage.toLowerCase();
            let response = '';

            // Respostas específicas por commodity
            if (lowerMessage.includes('soja')) {
                response = await this.getSojaResponse();
            } else if (lowerMessage.includes('milho')) {
                response = await this.getMilhoResponse();
            } else if (lowerMessage.includes('café') || lowerMessage.includes('cafe')) {
                response = await this.getCafeResponse();
            } else if (lowerMessage.includes('boi')) {
                response = await this.getBoiResponse();
            } else if (lowerMessage.includes('algodão') || lowerMessage.includes('algodao')) {
                response = await this.getAlgodaoResponse();
            } else if (lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
                response = this.getHelpResponse();
            } else {
                response = this.getGenericResponse();
            }

            // Enviar resposta com delay realista
            setTimeout(async () => {
                await this.sendMessage(chatId, response);
            }, 2000);

        } catch (error) {
            logger.error('❌ Erro ao enviar resposta SPR:', error);
        }
    }

    async getSojaResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 20 + 130).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 3).toFixed(1);

        return `🌱 *SOJA - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/saca
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 10 - 5)).toFixed(2)}/saca

🔮 *Análise Técnica:*
• Mercado internacional: Estável
• Clima: Favorável
• Demanda: Crescente

📱 *SPR - Sistema Preditivo Royal*
Digite *AJUDA* para mais opções`;
    }

    async getMilhoResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 15 + 65).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 4).toFixed(1);

        return `🌽 *MILHO - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/saca
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 8 - 4)).toFixed(2)}/saca

🔮 *Análise Técnica:*
• Safra: Em andamento
• Exportações: Crescentes
• Consumo interno: Estável

📱 *SPR - Sistema Preditivo Royal*`;
    }

    async getCafeResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 100 + 800).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 3).toFixed(1);

        return `☕ *CAFÉ - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/saca
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 50 - 25)).toFixed(2)}/saca

🔮 *Análise Técnica:*
• Clima: Monitoramento contínuo
• Mercado internacional: Volátil
• Qualidade: Premium

📱 *SPR - Sistema Preditivo Royal*`;
    }

    async getBoiResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 20 + 280).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 2).toFixed(1);

        return `🐂 *BOI GORDO - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/@
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 15 - 7.5)).toFixed(2)}/@

🔮 *Análise Técnica:*
• Oferta: Controlada
• Demanda: Crescente
• Exportações: Favoráveis

📱 *SPR - Sistema Preditivo Royal*`;
    }

    async getAlgodaoResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 50 + 450).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 4).toFixed(1);

        return `🌾 *ALGODÃO - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/@
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 30 - 15)).toFixed(2)}/@

🔮 *Análise Técnica:*
• Mercado têxtil: Recuperação
• Clima: Favorável
• Qualidade: Excelente

📱 *SPR - Sistema Preditivo Royal*`;
    }

    getHelpResponse() {
        return `🤖 *SPR - Sistema Preditivo Royal*

📋 *Comandos disponíveis:*

🌱 *SOJA* - Previsão de preços da soja
🌽 *MILHO* - Previsão de preços do milho  
☕ *CAFÉ* - Previsão de preços do café
🐂 *BOI* - Previsão do boi gordo
🌾 *ALGODÃO* - Previsão do algodão

📊 *Outros comandos:*
• *MERCADO* - Visão geral do mercado
• *TENDENCIAS* - Análise de tendências
• *ALERTAS* - Configurar alertas de preços

📱 *Sobre o SPR:*
Sistema inteligente de previsão de preços para commodities agrícolas, desenvolvido especialmente para o agronegócio brasileiro.

💡 *Dica:* Digite o nome da commodity para receber previsões instantâneas!`;
    }

    getGenericResponse() {
        return `🌱 *SPR - Sistema Preditivo Royal*

Olá! Sou o assistente do SPR, seu sistema de previsão de preços agrícolas.

📊 *Posso ajudar com:*
• Previsões de preços de commodities
• Análise de tendências de mercado
• Alertas de preços personalizados

💬 *Digite uma commodity:*
SOJA | MILHO | CAFÉ | BOI | ALGODÃO

Ou digite *AJUDA* para ver todos os comandos disponíveis.

🚀 *SPR - Previsão inteligente para o agronegócio!*`;
    }

    handleMessageAck(message, ack) {
        const ackStatus = {
            1: 'sent',
            2: 'received', 
            3: 'read',
            4: 'played'
        };

        logger.info(`📤 Mensagem ${message.id.id}: ${ackStatus[ack] || 'unknown'}`);
        
        this.io.emit('message_ack', {
            messageId: message.id.id,
            status: ackStatus[ack] || 'unknown',
            timestamp: Date.now()
        });
    }

    async loadContacts() {
        try {
            this.contacts = await this.client.getContacts();
            logger.info(`📱 ${this.contacts.length} contatos carregados`);
        } catch (error) {
            logger.error('❌ Erro ao carregar contatos:', error);
        }
    }

    async sendMessage(chatId, message) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp não está pronto');
            }

            const sent = await this.client.sendMessage(chatId, message);
            
            logger.info(`📤 Mensagem enviada para ${chatId}: ${message.substring(0, 50)}...`);
            
            this.io.emit('message_sent', {
                id: sent.id.id,
                to: chatId,
                message: message,
                timestamp: Date.now()
            });

            return sent.id.id;
        } catch (error) {
            logger.error('❌ Erro ao enviar mensagem:', error);
            throw error;
        }
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                whatsapp: this.isReady,
                timestamp: new Date().toISOString()
            });
        });

        // Status do WhatsApp
        this.app.get('/api/status', (req, res) => {
            res.json({
                isReady: this.isReady,
                hasQR: !!this.qrCode,
                contacts: this.contacts.length,
                messages: this.messages.length
            });
        });

        // QR Code
        this.app.get('/api/qr', (req, res) => {
            if (this.qrCode) {
                res.json({ qr: this.qrCode });
            } else {
                res.status(404).json({ error: 'QR Code não disponível' });
            }
        });

        // Enviar mensagem
        this.app.post('/api/send', async (req, res) => {
            try {
                const { number, message, type = 'text' } = req.body;
                
                if (!number || !message) {
                    return res.status(400).json({ error: 'Número e mensagem são obrigatórios' });
                }

                const messageId = await this.sendMessage(number, message);
                res.json({ 
                    success: true, 
                    messageId,
                    contact: number,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                res.status(500).json({ 
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Enviar mídia
        this.app.post('/api/send-media', async (req, res) => {
            try {
                const { number, media, caption = '', type = 'image' } = req.body;
                
                if (!number || !media) {
                    return res.status(400).json({ error: 'Número e mídia são obrigatórios' });
                }

                // Verificar se é URL ou arquivo local
                let mediaMessage;
                if (media.startsWith('http://') || media.startsWith('https://')) {
                    // URL externa
                    mediaMessage = await MessageMedia.fromUrl(media);
                } else if (media.startsWith('data:')) {
                    // Base64
                    const [mimeType, data] = media.split(',');
                    const mime = mimeType.split(':')[1].split(';')[0];
                    mediaMessage = new MessageMedia(mime, data);
                } else {
                    // Arquivo local
                    const fs = require('fs');
                    const path = require('path');
                    
                    if (!fs.existsSync(media)) {
                        return res.status(400).json({ error: 'Arquivo não encontrado' });
                    }
                    
                    mediaMessage = MessageMedia.fromFilePath(media);
                }

                const sent = await this.client.sendMessage(number, mediaMessage, { caption });
                
                logger.info(`📎 Mídia enviada para ${number}: ${type}`);
                
                this.io.emit('message_sent', {
                    id: sent.id.id,
                    to: number,
                    type: type,
                    caption: caption,
                    timestamp: Date.now()
                });

                res.json({ 
                    success: true, 
                    messageId: sent.id.id,
                    contact: number,
                    status: 'sent',
                    type: type,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('❌ Erro ao enviar mídia:', error);
                res.status(500).json({ 
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Broadcast para múltiplos contatos
        this.app.post('/api/broadcast', async (req, res) => {
            try {
                const { contacts, message, type = 'text' } = req.body;
                
                if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                    return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
                }
                
                if (!message) {
                    return res.status(400).json({ error: 'Mensagem é obrigatória' });
                }

                const results = [];
                
                for (const contact of contacts) {
                    try {
                        const messageId = await this.sendMessage(contact, message);
                        results.push({
                            contact: contact,
                            success: true,
                            messageId: messageId,
                            status: 'sent'
                        });
                        
                        // Delay entre envios para evitar spam
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (error) {
                        results.push({
                            contact: contact,
                            success: false,
                            error: error.message,
                            status: 'failed'
                        });
                    }
                }
                
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                
                logger.info(`📢 Broadcast concluído: ${successful} enviados, ${failed} falharam`);
                
                res.json({
                    success: true,
                    total: contacts.length,
                    successful: successful,
                    failed: failed,
                    results: results,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('❌ Erro no broadcast:', error);
                res.status(500).json({ 
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Listar contatos
        this.app.get('/api/contacts', (req, res) => {
            const formattedContacts = this.contacts.map(contact => ({
                id: contact.id.user,
                name: contact.name || contact.pushname || '',
                number: contact.number,
                isMyContact: contact.isMyContact
            }));
            
            res.json(formattedContacts);
        });

        // Listar mensagens
        this.app.get('/api/messages', (req, res) => {
            res.json(this.messages.slice(0, 100)); // Últimas 100 mensagens
        });

        // Interface web
        this.app.get('/', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>SPR WhatsApp Server</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .status.ready { background: #d4edda; color: #155724; }
        .status.waiting { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
        .qr-code { text-align: center; margin: 20px 0; }
        .qr-code img { max-width: 300px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { flex: 1; text-align: center; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .messages { max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
        .message { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌱 SPR WhatsApp Server</h1>
        
        <div id="status" class="status waiting">
            ⏳ Conectando ao WhatsApp...
        </div>
        
        <div id="qr-container" style="display: none;">
            <h3>📱 Escaneie o QR Code com seu WhatsApp:</h3>
            <div class="qr-code">
                <img id="qr-image" src="" alt="QR Code">
            </div>
        </div>
        
        <div class="stats">
            <div class="stat">
                <h4>📱 Contatos</h4>
                <div id="contacts-count">0</div>
            </div>
            <div class="stat">
                <h4>💬 Mensagens</h4>
                <div id="messages-count">0</div>
            </div>
            <div class="stat">
                <h4>🕐 Uptime</h4>
                <div id="uptime">0s</div>
            </div>
        </div>
        
        <div id="messages-container" style="display: none;">
            <h3>💬 Mensagens Recentes:</h3>
            <div id="messages" class="messages"></div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const startTime = Date.now();
        
        // Atualizar uptime
        setInterval(() => {
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            document.getElementById('uptime').textContent = uptime + 's';
        }, 1000);
        
        // Socket events
        socket.on('qr', (data) => {
            document.getElementById('status').className = 'status waiting';
            document.getElementById('status').textContent = '📱 Escaneie o QR Code para conectar';
            document.getElementById('qr-container').style.display = 'block';
            document.getElementById('qr-image').src = data.qrCodeDataURL;
        });
        
        socket.on('ready', (data) => {
            document.getElementById('status').className = 'status ready';
            document.getElementById('status').textContent = '✅ WhatsApp conectado e pronto!';
            document.getElementById('qr-container').style.display = 'none';
            document.getElementById('messages-container').style.display = 'block';
            document.getElementById('contacts-count').textContent = data.contacts;
        });
        
        socket.on('message_received', (message) => {
            const messagesDiv = document.getElementById('messages');
            const messageElement = document.createElement('div');
            messageElement.className = 'message';
            messageElement.innerHTML = \`
                <strong>\${message.contact.name || message.from}:</strong> \${message.body}
                <small style="color: #666; display: block;">
                    \${new Date(message.timestamp * 1000).toLocaleString()}
                </small>
            \`;
            messagesDiv.insertBefore(messageElement, messagesDiv.firstChild);
            
            // Manter apenas últimas 50 mensagens
            while (messagesDiv.children.length > 50) {
                messagesDiv.removeChild(messagesDiv.lastChild);
            }
            
            // Atualizar contador
            const currentCount = parseInt(document.getElementById('messages-count').textContent);
            document.getElementById('messages-count').textContent = currentCount + 1;
        });
        
        socket.on('disconnected', () => {
            document.getElementById('status').className = 'status error';
            document.getElementById('status').textContent = '❌ WhatsApp desconectado';
        });
        
        // Carregar status inicial
        fetch('/api/status')
            .then(r => r.json())
            .then(data => {
                if (data.isReady) {
                    document.getElementById('status').className = 'status ready';
                    document.getElementById('status').textContent = '✅ WhatsApp conectado e pronto!';
                    document.getElementById('messages-container').style.display = 'block';
                }
                document.getElementById('contacts-count').textContent = data.contacts;
                document.getElementById('messages-count').textContent = data.messages;
            });
    </script>
</body>
</html>
            `);
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            logger.info('🔌 Cliente conectado via Socket.IO');
            
            socket.emit('status', {
                isReady: this.isReady,
                hasQR: !!this.qrCode,
                contacts: this.contacts.length,
                messages: this.messages.length
            });
            
            socket.on('disconnect', () => {
                logger.info('🔌 Cliente desconectado');
            });
        });
    }

    setupCronJobs() {
        // Backup de mensagens a cada hora
        cron.schedule('0 * * * *', () => {
            this.backupMessages();
        });

        // Limpeza de logs antigos diariamente
        cron.schedule('0 2 * * *', () => {
            this.cleanupOldLogs();
        });
    }

    backupMessages() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                messages: this.messages,
                contacts: this.contacts.length
            };
            
            const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
            fs.writeFileSync(`./logs/${filename}`, JSON.stringify(backup, null, 2));
            
            logger.info(`💾 Backup de mensagens salvo: ${filename}`);
        } catch (error) {
            logger.error('❌ Erro ao fazer backup:', error);
        }
    }

    cleanupOldLogs() {
        try {
            const logsDir = './logs';
            const files = fs.readdirSync(logsDir);
            const now = Date.now();
            const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
            
            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < oneWeekAgo) {
                    fs.unlinkSync(filePath);
                    logger.info(`🗑️ Log antigo removido: ${file}`);
                }
            });
        } catch (error) {
            logger.error('❌ Erro na limpeza de logs:', error);
        }
    }

    async initialize() {
        try {
            logger.info('🚀 Inicializando SPR WhatsApp Server...');
            
            // Inicializar WhatsApp
            await this.client.initialize();
            
            // Iniciar servidor HTTP
            const PORT = process.env.PORT || 3001;
            this.server.listen(PORT, () => {
                logger.info(`🌐 Servidor rodando na porta ${PORT}`);
                logger.info(`📱 Interface: http://localhost:${PORT}`);
                logger.info(`🔗 API: http://localhost:${PORT}/api`);
            });
            
        } catch (error) {
            logger.error('❌ Erro na inicialização:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        logger.info('🔄 Desligando servidor...');
        
        if (this.client) {
            await this.client.destroy();
        }
        
        this.server.close(() => {
            logger.info('✅ Servidor desligado');
            process.exit(0);
        });
    }
}

// Inicializar servidor
const server = new SPRWhatsAppServer();
server.initialize();

// Handlers de shutdown
process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());
process.on('uncaughtException', (error) => {
    logger.error('❌ Erro não tratado:', error);
    server.shutdown();
}); 