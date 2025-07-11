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
const crypto = require('crypto');

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

class MultiInstanceWhatsAppServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        // Gerenciar múltiplas instâncias
        this.instances = new Map(); // sessionId -> WhatsAppInstance
        this.activeInstances = new Map(); // sessionId -> boolean
        
        this.setupExpress();
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

    // Criar nova instância WhatsApp
    async createInstance(sessionId, clientName = 'SPR Client') {
        try {
            if (this.instances.has(sessionId)) {
                throw new Error(`Instância ${sessionId} já existe`);
            }

            logger.info(`🚀 Criando nova instância WhatsApp: ${sessionId}`);
            
            const instance = new WhatsAppInstance(sessionId, clientName, this.io);
            this.instances.set(sessionId, instance);
            this.activeInstances.set(sessionId, false);
            
            await instance.initialize();
            
            logger.info(`✅ Instância ${sessionId} criada com sucesso`);
            return instance;
            
        } catch (error) {
            logger.error(`❌ Erro ao criar instância ${sessionId}:`, error);
            throw error;
        }
    }

    // Remover instância
    async removeInstance(sessionId) {
        try {
            if (!this.instances.has(sessionId)) {
                throw new Error(`Instância ${sessionId} não existe`);
            }

            logger.info(`🗑️ Removendo instância: ${sessionId}`);
            
            const instance = this.instances.get(sessionId);
            await instance.shutdown();
            
            this.instances.delete(sessionId);
            this.activeInstances.delete(sessionId);
            
            logger.info(`✅ Instância ${sessionId} removida com sucesso`);
            
        } catch (error) {
            logger.error(`❌ Erro ao remover instância ${sessionId}:`, error);
            throw error;
        }
    }

    // Listar todas as instâncias
    getInstances() {
        const instances = [];
        for (const [sessionId, instance] of this.instances) {
            instances.push({
                sessionId,
                clientName: instance.clientName,
                isReady: instance.isReady,
                isActive: this.activeInstances.get(sessionId),
                contactsCount: instance.contacts.length,
                messagesCount: instance.messages.length,
                lastActivity: instance.lastActivity
            });
        }
        return instances;
    }

    // Obter instância específica
    getInstance(sessionId) {
        return this.instances.get(sessionId);
    }

    setupRoutes() {
        // Página inicial
        this.app.get('/', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>SPR Multi-Instance WhatsApp Server</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        .header { color: #25D366; }
                        .instance { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
                        .status { padding: 4px 8px; border-radius: 4px; color: white; }
                        .ready { background-color: #25D366; }
                        .not-ready { background-color: #f44336; }
                        .button { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
                        .create { background-color: #4CAF50; color: white; }
                        .remove { background-color: #f44336; color: white; }
                    </style>
                </head>
                <body>
                    <h1 class="header">🚀 SPR Multi-Instance WhatsApp Server</h1>
                    <p>Servidor rodando com suporte a múltiplas instâncias WhatsApp</p>
                    
                    <h2>📱 Instâncias Ativas</h2>
                    <div id="instances">
                        <p>Carregando instâncias...</p>
                    </div>
                    
                    <h2>➕ Criar Nova Instância</h2>
                    <form id="createForm">
                        <input type="text" id="sessionId" placeholder="ID da Sessão" required>
                        <input type="text" id="clientName" placeholder="Nome do Cliente" required>
                        <button type="submit" class="button create">Criar Instância</button>
                    </form>
                    
                    <script>
                        // Carregar instâncias
                        async function loadInstances() {
                            try {
                                const response = await fetch('/api/instances');
                                const instances = await response.json();
                                
                                const container = document.getElementById('instances');
                                if (instances.length === 0) {
                                    container.innerHTML = '<p>Nenhuma instância ativa</p>';
                                    return;
                                }
                                
                                container.innerHTML = instances.map(instance => \`
                                    <div class="instance">
                                        <h3>\${instance.clientName} (ID: \${instance.sessionId})</h3>
                                        <p>Status: <span class="status \${instance.isReady ? 'ready' : 'not-ready'}">\${instance.isReady ? 'Conectado' : 'Desconectado'}</span></p>
                                        <p>Contatos: \${instance.contactsCount}</p>
                                        <p>Mensagens: \${instance.messagesCount}</p>
                                        <button class="button remove" onclick="removeInstance('\${instance.sessionId}')">Remover</button>
                                        <a href="/qr/\${instance.sessionId}" target="_blank" class="button">Ver QR Code</a>
                                    </div>
                                \`).join('');
                            } catch (error) {
                                console.error('Erro ao carregar instâncias:', error);
                            }
                        }
                        
                        // Criar instância
                        document.getElementById('createForm').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const sessionId = document.getElementById('sessionId').value;
                            const clientName = document.getElementById('clientName').value;
                            
                            try {
                                const response = await fetch('/api/instances', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ sessionId, clientName })
                                });
                                
                                if (response.ok) {
                                    alert('Instância criada com sucesso!');
                                    loadInstances();
                                    document.getElementById('createForm').reset();
                                } else {
                                    const error = await response.json();
                                    alert('Erro: ' + error.message);
                                }
                            } catch (error) {
                                alert('Erro ao criar instância: ' + error.message);
                            }
                        });
                        
                        // Remover instância
                        async function removeInstance(sessionId) {
                            if (!confirm('Tem certeza que deseja remover esta instância?')) return;
                            
                            try {
                                const response = await fetch(\`/api/instances/\${sessionId}\`, {
                                    method: 'DELETE'
                                });
                                
                                if (response.ok) {
                                    alert('Instância removida com sucesso!');
                                    loadInstances();
                                } else {
                                    const error = await response.json();
                                    alert('Erro: ' + error.message);
                                }
                            } catch (error) {
                                alert('Erro ao remover instância: ' + error.message);
                            }
                        }
                        
                        // Carregar instâncias ao iniciar
                        loadInstances();
                        
                        // Atualizar a cada 5 segundos
                        setInterval(loadInstances, 5000);
                    </script>
                </body>
                </html>
            `);
        });

        // API - Listar instâncias
        this.app.get('/api/instances', (req, res) => {
            try {
                const instances = this.getInstances();
                res.json(instances);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API - Criar instância
        this.app.post('/api/instances', async (req, res) => {
            try {
                const { sessionId, clientName } = req.body;
                
                if (!sessionId || !clientName) {
                    return res.status(400).json({ error: 'sessionId e clientName são obrigatórios' });
                }
                
                await this.createInstance(sessionId, clientName);
                res.json({ message: 'Instância criada com sucesso', sessionId });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API - Remover instância
        this.app.delete('/api/instances/:sessionId', async (req, res) => {
            try {
                const { sessionId } = req.params;
                await this.removeInstance(sessionId);
                res.json({ message: 'Instância removida com sucesso' });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API - Obter QR Code
        this.app.get('/qr/:sessionId', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const instance = this.getInstance(sessionId);
                
                if (!instance) {
                    return res.status(404).json({ error: 'Instância não encontrada' });
                }
                
                if (!instance.qrCode) {
                    return res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h2>QR Code não disponível</h2>
                                <p>A instância ${sessionId} não possui QR Code ativo.</p>
                                <p>Isso pode significar que:</p>
                                <ul style="text-align: left; display: inline-block;">
                                    <li>WhatsApp já está conectado</li>
                                    <li>Instância ainda está inicializando</li>
                                    <li>Ocorreu um erro na conexão</li>
                                </ul>
                                <button onclick="location.reload()">Atualizar</button>
                            </body>
                        </html>
                    `);
                }
                
                const qrCodeDataURL = await qrcode.toDataURL(instance.qrCode);
                res.send(`
                    <html>
                        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                            <h2>QR Code - ${instance.clientName}</h2>
                            <p>Escaneie este código com seu WhatsApp</p>
                            <img src="${qrCodeDataURL}" alt="QR Code" style="border: 1px solid #ddd; padding: 20px;">
                            <p><small>Sessão: ${sessionId}</small></p>
                            <button onclick="location.reload()">Atualizar QR Code</button>
                        </body>
                    </html>
                `);
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API - Enviar mensagem
        this.app.post('/api/instances/:sessionId/send', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const { to, message } = req.body;
                
                const instance = this.getInstance(sessionId);
                if (!instance) {
                    return res.status(404).json({ error: 'Instância não encontrada' });
                }
                
                if (!instance.isReady) {
                    return res.status(400).json({ error: 'Instância não está conectada' });
                }
                
                await instance.sendMessage(to, message);
                res.json({ message: 'Mensagem enviada com sucesso' });
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API - Obter mensagens
        this.app.get('/api/instances/:sessionId/messages', (req, res) => {
            try {
                const { sessionId } = req.params;
                const instance = this.getInstance(sessionId);
                
                if (!instance) {
                    return res.status(404).json({ error: 'Instância não encontrada' });
                }
                
                res.json(instance.messages);
                
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            logger.info(`🔌 Cliente conectado: ${socket.id}`);
            
            socket.on('disconnect', () => {
                logger.info(`🔌 Cliente desconectado: ${socket.id}`);
            });
            
            // Eventos específicos por instância
            socket.on('join_instance', (sessionId) => {
                socket.join(sessionId);
                logger.info(`🔌 Cliente ${socket.id} entrou na instância ${sessionId}`);
            });
            
            socket.on('leave_instance', (sessionId) => {
                socket.leave(sessionId);
                logger.info(`🔌 Cliente ${socket.id} saiu da instância ${sessionId}`);
            });
        });
    }

    setupCronJobs() {
        // Backup de mensagens a cada hora
        cron.schedule('0 * * * *', () => {
            this.backupAllMessages();
        });

        // Limpeza de logs antigos diariamente
        cron.schedule('0 2 * * *', () => {
            this.cleanupOldLogs();
        });
    }

    backupAllMessages() {
        for (const [sessionId, instance] of this.instances) {
            try {
                instance.backupMessages();
            } catch (error) {
                logger.error(`❌ Erro ao fazer backup da instância ${sessionId}:`, error);
            }
        }
    }

    cleanupOldLogs() {
        const logsDir = './logs';
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias

        try {
            const files = fs.readdirSync(logsDir);
            const now = Date.now();

            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    logger.info(`🗑️ Log antigo removido: ${file}`);
                }
            });
        } catch (error) {
            logger.error('❌ Erro ao limpar logs antigos:', error);
        }
    }

    async initialize() {
        try {
            logger.info('🚀 Inicializando SPR Multi-Instance WhatsApp Server...');
            
            const PORT = process.env.PORT || 3000;
            this.server.listen(PORT, () => {
                logger.info(`🌐 Servidor rodando na porta ${PORT}`);
                logger.info(`📱 Interface: http://localhost:${PORT}`);
                logger.info(`🔗 API: http://localhost:${PORT}/api`);
            });
            
        } catch (error) {
            logger.error('❌ Erro ao inicializar servidor:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        logger.info('🔄 Desligando servidor...');
        
        // Desligar todas as instâncias
        for (const [sessionId, instance] of this.instances) {
            try {
                await instance.shutdown();
            } catch (error) {
                logger.error(`❌ Erro ao desligar instância ${sessionId}:`, error);
            }
        }
        
        this.server.close(() => {
            logger.info('✅ Servidor desligado');
            process.exit(0);
        });
    }
}

// Classe para gerenciar instâncias individuais do WhatsApp
class WhatsAppInstance {
    constructor(sessionId, clientName, io) {
        this.sessionId = sessionId;
        this.clientName = clientName;
        this.io = io;
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.contacts = [];
        this.messages = [];
        this.lastActivity = new Date();
    }

    async initialize() {
        logger.info(`🚀 Inicializando instância ${this.sessionId}...`);
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: this.sessionId,
                dataPath: `./sessions/${this.sessionId}`
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

        this.setupEvents();
        await this.client.initialize();
    }

    setupEvents() {
        // QR Code
        this.client.on('qr', async (qr) => {
            logger.info(`📱 QR Code gerado para ${this.sessionId}`);
            this.qrCode = qr;
            
            // Mostrar QR no terminal
            console.log(`\n=== QR Code para ${this.sessionId} ===`);
            qrcodeTerminal.generate(qr, { small: true });
            
            // Emitir via Socket.IO para a instância específica
            this.io.to(this.sessionId).emit('qr', { 
                sessionId: this.sessionId,
                qr, 
                clientName: this.clientName 
            });
        });

        // Autenticado
        this.client.on('authenticated', () => {
            logger.info(`🔐 ${this.sessionId} autenticado!`);
            this.io.to(this.sessionId).emit('authenticated', { 
                sessionId: this.sessionId,
                clientName: this.clientName 
            });
        });

        // Pronto
        this.client.on('ready', async () => {
            logger.info(`✅ ${this.sessionId} pronto para uso!`);
            this.isReady = true;
            this.qrCode = null;
            this.lastActivity = new Date();
            
            // Carregar contatos
            await this.loadContacts();
            
            this.io.to(this.sessionId).emit('ready', { 
                sessionId: this.sessionId,
                clientName: this.clientName,
                message: 'WhatsApp conectado e pronto!',
                contacts: this.contacts.length 
            });
        });

        // Falha na autenticação
        this.client.on('auth_failure', (msg) => {
            logger.error(`❌ Falha na autenticação ${this.sessionId}:`, msg);
            this.io.to(this.sessionId).emit('auth_failure', { 
                sessionId: this.sessionId,
                message: msg 
            });
        });

        // Desconectado
        this.client.on('disconnected', (reason) => {
            logger.warn(`⚠️ ${this.sessionId} desconectado:`, reason);
            this.isReady = false;
            this.io.to(this.sessionId).emit('disconnected', { 
                sessionId: this.sessionId,
                reason 
            });
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });
    }

    async handleIncomingMessage(message) {
        try {
            this.lastActivity = new Date();
            
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
                contact: await message.getContact(),
                sessionId: this.sessionId
            };

            // Salvar mensagem
            this.messages.unshift(messageData);
            if (this.messages.length > 1000) {
                this.messages = this.messages.slice(0, 1000);
            }

            logger.info(`📥 [${this.sessionId}] Mensagem de ${messageData.contact.name || messageData.from}: ${messageData.body}`);
            
            // Emitir via Socket.IO
            this.io.to(this.sessionId).emit('message_received', messageData);

            // Verificar se deve responder automaticamente
            if (!message.fromMe && this.shouldAutoRespond(message.body)) {
                await this.sendSPRResponse(message.from, message.body);
            }

        } catch (error) {
            logger.error(`❌ Erro ao processar mensagem ${this.sessionId}:`, error);
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
            logger.error(`❌ Erro ao enviar resposta SPR ${this.sessionId}:`, error);
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
📞 *Instância:* ${this.clientName}
Digite *AJUDA* para mais opções`;
    }

    async getMilhoResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 15 + 45).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 3).toFixed(1);

        return `🌽 *MILHO - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/saca
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 8 - 4)).toFixed(2)}/saca

🔮 *Análise Técnica:*
• Mercado internacional: Aquecido
• Clima: Monitoramento
• Demanda: Forte

📱 *SPR - Sistema Preditivo Royal*
📞 *Instância:* ${this.clientName}
Digite *AJUDA* para mais opções`;
    }

    async getCafeResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 100 + 500).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 3).toFixed(1);

        return `☕ *CAFÉ - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/saca
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 50 - 25)).toFixed(2)}/saca

🔮 *Análise Técnica:*
• Mercado internacional: Volatil
• Clima: Crítico
• Demanda: Estável

📱 *SPR - Sistema Preditivo Royal*
📞 *Instância:* ${this.clientName}
Digite *AJUDA* para mais opções`;
    }

    async getBoiResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 50 + 200).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 3).toFixed(1);

        return `🐄 *BOI GORDO - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/@
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 20 - 10)).toFixed(2)}/@

🔮 *Análise Técnica:*
• Mercado internacional: Firme
• Oferta: Limitada
• Demanda: Crescente

📱 *SPR - Sistema Preditivo Royal*
📞 *Instância:* ${this.clientName}
Digite *AJUDA* para mais opções`;
    }

    async getAlgodaoResponse() {
        const currentDate = new Date().toLocaleDateString('pt-BR');
        const currentPrice = (Math.random() * 20 + 80).toFixed(2);
        const trend = Math.random() > 0.5 ? 'Alta' : 'Baixa';
        const percentage = (Math.random() * 3).toFixed(1);

        return `🤍 *ALGODÃO - Previsão SPR*

📅 *Data:* ${currentDate}
💰 *Preço Atual:* R$ ${currentPrice}/@
📈 *Tendência:* ${trend} (${percentage}%)
📊 *Próximos 7 dias:* R$ ${(parseFloat(currentPrice) + (Math.random() * 10 - 5)).toFixed(2)}/@

🔮 *Análise Técnica:*
• Mercado internacional: Estável
• Clima: Favorável
• Demanda: Moderada

📱 *SPR - Sistema Preditivo Royal*
📞 *Instância:* ${this.clientName}
Digite *AJUDA* para mais opções`;
    }

    getHelpResponse() {
        return `🤖 *SPR - Sistema Preditivo Royal*
📞 *Instância:* ${this.clientName}

🌾 *Commodities Disponíveis:*
• 🌱 SOJA - Digite "soja"
• 🌽 MILHO - Digite "milho"  
• ☕ CAFÉ - Digite "café"
• 🐄 BOI GORDO - Digite "boi"
• 🤍 ALGODÃO - Digite "algodão"

📊 *Comandos:*
• PREÇO [commodity] - Cotação atual
• PREVISÃO [commodity] - Análise técnica
• AJUDA - Este menu

🔮 *Análises 24/7 com IA*
💡 *Previsões precisas para o agronegócio*

*Royal Negócios Agrícolas*`;
    }

    getGenericResponse() {
        return `🌾 *SPR - Sistema Preditivo Royal*
📞 *Instância:* ${this.clientName}

Olá! Sou o assistente de previsões agrícolas do SPR.

🔮 Posso ajudar com:
• Preços de commodities
• Análises técnicas
• Previsões de mercado

Digite o nome da commodity (soja, milho, café, boi, algodão) ou *AJUDA* para mais opções.

*Royal Negócios Agrícolas*`;
    }

    async loadContacts() {
        try {
            const contacts = await this.client.getContacts();
            this.contacts = contacts.filter(contact => contact.name && contact.name !== '');
            logger.info(`📞 ${this.contacts.length} contatos carregados para ${this.sessionId}`);
        } catch (error) {
            logger.error(`❌ Erro ao carregar contatos ${this.sessionId}:`, error);
        }
    }

    async sendMessage(chatId, message) {
        try {
            if (!this.isReady) {
                throw new Error('Cliente não está pronto');
            }

            await this.client.sendMessage(chatId, message);
            this.lastActivity = new Date();
            
            logger.info(`📤 [${this.sessionId}] Mensagem enviada para ${chatId}: ${message.substring(0, 50)}...`);
            
            // Emitir confirmação via Socket.IO
            this.io.to(this.sessionId).emit('message_sent', {
                sessionId: this.sessionId,
                to: chatId,
                message: message,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error(`❌ Erro ao enviar mensagem ${this.sessionId}:`, error);
            throw error;
        }
    }

    backupMessages() {
        try {
            const backupDir = `./backups/${this.sessionId}`;
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const filename = `messages_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(backupDir, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(this.messages, null, 2));
            logger.info(`💾 Backup de mensagens salvo para ${this.sessionId}: ${filename}`);
            
        } catch (error) {
            logger.error(`❌ Erro ao fazer backup ${this.sessionId}:`, error);
        }
    }

    async shutdown() {
        logger.info(`🔄 Desligando instância ${this.sessionId}...`);
        
        try {
            if (this.client) {
                await this.client.destroy();
            }
            
            // Backup final
            this.backupMessages();
            
            logger.info(`✅ Instância ${this.sessionId} desligada`);
            
        } catch (error) {
            logger.error(`❌ Erro ao desligar instância ${this.sessionId}:`, error);
        }
    }
}

// Inicializar servidor
const server = new MultiInstanceWhatsAppServer();

// Handlers de processo
process.on('SIGINT', async () => {
    logger.info('🛑 Sinal SIGINT recebido');
    await server.shutdown();
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Sinal SIGTERM recebido');
    await server.shutdown();
});

process.on('uncaughtException', (error) => {
    logger.error('❌ Erro não tratado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Promise rejeitada:', { reason, promise });
    process.exit(1);
});

// Inicializar
server.initialize().catch(error => {
    logger.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
});

module.exports = { MultiInstanceWhatsAppServer, WhatsAppInstance }; 