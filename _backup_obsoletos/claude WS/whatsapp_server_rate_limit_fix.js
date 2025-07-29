const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3003;

// Configuração CORS melhorada
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:3002', 
        'http://localhost:3004'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Headers de resposta padronizados
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Rate limiting MUITO MAIS LIBERAL para desenvolvimento
const rateLimitMap = new Map();
const RATE_LIMIT = 1000; // 1000 requests per minute (era 200)
const RATE_WINDOW = 60000; // 1 minute
const RETRY_DELAY = 1000; // 1 segundo (era 5 segundos)

// Rate limiting mais permissivo para desenvolvimento
const rateLimit = (req, res, next) => {
    // APENAS APLICAR RATE LIMITING PARA IPs EXTERNOS
    const ip = req.ip || req.connection.remoteAddress;
    
    // Permitir localhost sem rate limiting
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost') {
        return next();
    }
    
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }
    
    const client = rateLimitMap.get(ip);
    if (now > client.resetTime) {
        client.count = 1;
        client.resetTime = now + RATE_WINDOW;
        return next();
    }
    
    if (client.count >= RATE_LIMIT) {
        console.log(`🚫 Rate limit excedido para IP ${ip}: ${client.count}/${RATE_LIMIT}`);
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Máximo de ${RATE_LIMIT} requisições por minuto`,
            retryAfter: Math.ceil((client.resetTime - now) / 1000),
            timestamp: new Date().toISOString(),
            note: 'Rate limiting está DESABILITADO para localhost em desenvolvimento'
        });
    }
    
    client.count++;
    next();
};

// APLICAR RATE LIMITING APENAS PARA ROTAS ESPECÍFICAS (NÃO PARA STATUS)
app.use('/api/send-message', rateLimit);
app.use('/api/whatsapp/send', rateLimit);

// Estado do sistema
let systemStatus = {
    whatsappConnected: false,
    qrCode: null,
    lastActivity: new Date(),
    totalMessages: 0,
    activeChats: 0,
    clientInfo: null,
    lastMessageTime: 0
};

// Garantir que o diretório de sessões existe
const sessionsDir = './sessions';
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

// Garantir que o diretório de QR codes existe
const qrcodesDir = './qrcodes';
if (!fs.existsSync(qrcodesDir)) {
    fs.mkdirSync(qrcodesDir, { recursive: true });
}

// Cliente WhatsApp com configuração melhorada
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: sessionsDir
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--disable-default-apps'
        ],
        timeout: 60000
    }
});

// Eventos do WhatsApp
client.on('qr', async (qr) => {
    console.log('🎯 QR CODE GERADO!');
    console.log('📱 Escaneie com WhatsApp:');
    qrcodeTerminal.generate(qr, { small: true });
    
    try {
        systemStatus.qrCode = await qrcode.toDataURL(qr);
        // Salvar QR code como imagem
        const qrBuffer = await qrcode.toBuffer(qr);
        fs.writeFileSync(path.join(qrcodesDir, 'qr_latest.png'), qrBuffer);
        console.log('✅ QR code salvo em ./qrcodes/qr_latest.png');
    } catch (err) {
        console.error('❌ Erro ao gerar QR code:', err);
    }
});

client.on('ready', async () => {
    console.log('✅ WhatsApp conectado com sucesso!');
    systemStatus.whatsappConnected = true;
    systemStatus.lastActivity = new Date();
    
    try {
        const clientInfo = client.info;
        systemStatus.clientInfo = {
            pushname: clientInfo.pushname,
            wid: clientInfo.wid._serialized,
            platform: clientInfo.platform
        };
        console.log('📱 Informações do cliente:', systemStatus.clientInfo);
    } catch (error) {
        console.log('⚠️ Não foi possível obter informações do cliente:', error.message);
    }
});

client.on('message', async (message) => {
    systemStatus.totalMessages++;
    systemStatus.lastActivity = new Date();
    
    console.log(`📩 Mensagem recebida de ${message.from}: ${message.body}`);
    
    // Resposta automática para consultas de preços
    if (message.body.toLowerCase().includes('preço') || 
        message.body.toLowerCase().includes('soja') ||
        message.body.toLowerCase().includes('milho') ||
        message.body.toLowerCase().includes('café') ||
        message.body.toLowerCase().includes('boi') ||
        message.body.toLowerCase().includes('algodão')) {
        
        const resposta = `🌾 *SPR - Sistema Preditivo Royal*\n\n` +
                        `Consulta de preços recebida!\n\n` +
                        `📊 *Commodities disponíveis:*\n` +
                        `• Soja: R$ 125,30/sc\n` +
                        `• Milho: R$ 68,50/sc\n` +
                        `• Café: R$ 890,00/sc\n` +
                        `• Boi Gordo: R$ 285,00/@\n` +
                        `• Algodão: R$ 145,20/@\n\n` +
                        `💡 *Previsão para próximos 7 dias:* Tendência de alta\n\n` +
                        `🔗 Acesse nosso dashboard: http://localhost:3002`;
        
        try {
            await message.reply(resposta);
            console.log('✅ Resposta automática enviada');
        } catch (error) {
            console.error('❌ Erro ao enviar resposta automática:', error);
        }
    }
});

client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp desconectado:', reason);
    systemStatus.whatsappConnected = false;
    systemStatus.clientInfo = null;
    systemStatus.qrCode = null;
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    systemStatus.whatsappConnected = false;
});

// Timeout handler para operações assíncronas
const withTimeout = (promise, timeoutMs = 30000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
    ]);
};

// Rotas da API REST - SEM RATE LIMITING
app.get('/health', (req, res) => {
    console.log('💚 Health check - OK');
    res.json({
        status: 'OK',
        timestamp: new Date(),
        whatsapp: systemStatus.whatsappConnected,
        uptime: process.uptime(),
        rateLimiting: 'DISABLED for localhost development'
    });
});

// STATUS ENDPOINT - SEM RATE LIMITING
app.get('/api/status', (req, res) => {
    console.log('📊 Status endpoint chamado - respondendo imediatamente');
    res.json({
        ...systemStatus,
        connected: systemStatus.whatsappConnected,
        whatsappConnected: systemStatus.whatsappConnected,
        timestamp: new Date().toISOString(),
        rateLimiting: {
            enabled: false,
            note: 'Rate limiting DESABILITADO para localhost',
            limit: RATE_LIMIT,
            window: RATE_WINDOW
        }
    });
});

app.get('/api/qr', (req, res) => {
    console.log('🔲 QR endpoint chamado');
    if (systemStatus.qrCode) {
        res.json({ 
            qrCode: systemStatus.qrCode,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(404).json({ 
            error: 'QR code não disponível',
            connected: systemStatus.whatsappConnected,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/chats', async (req, res) => {
    console.log('💬 Chats endpoint chamado');
    try {
        if (!systemStatus.whatsappConnected) {
            return res.json({ 
                chats: [],
                error: 'WhatsApp não conectado',
                connected: false,
                timestamp: new Date().toISOString()
            });
        }
        
        const chats = await withTimeout(client.getChats(), 20000);
        const chatList = chats.slice(0, 50).map(chat => ({
            id: chat.id._serialized,
            name: chat.name || chat.id.user || 'Contato',
            lastMessage: chat.lastMessage?.body || 'Nenhuma mensagem',
            timestamp: chat.timestamp || Date.now(),
            unreadCount: chat.unreadCount || 0,
            isGroup: chat.isGroup || false
        }));
        
        // Ordenar por timestamp (mais recente primeiro)
        chatList.sort((a, b) => b.timestamp - a.timestamp);
        
        systemStatus.activeChats = chats.length;
        res.json({ 
            chats: chatList,
            total: chatList.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao buscar chats:', error);
        res.json({
            chats: [],
            error: error.message,
            connected: systemStatus.whatsappConnected,
            timestamp: new Date().toISOString()
        });
    }
});

// API para buscar mensagens de um chat específico
app.get('/api/chats/:chatId/messages', async (req, res) => {
    console.log(`📥 Mensagens endpoint chamado para chat: ${req.params.chatId}`);
    try {
        if (!systemStatus.whatsappConnected) {
            return res.json({ 
                messages: [],
                error: 'WhatsApp não conectado',
                connected: false,
                timestamp: new Date().toISOString()
            });
        }
        
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const chat = await withTimeout(client.getChatById(chatId), 15000);
        const messages = await withTimeout(chat.fetchMessages({ limit }), 20000);
        
        const messageList = messages.map(msg => ({
            id: msg.id._serialized,
            body: msg.body,
            from: msg.from,
            to: msg.to,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            type: msg.type,
            author: msg.author || msg.from,
            hasMedia: msg.hasMedia
        }));
        
        console.log(`✅ ${messageList.length} mensagens carregadas para ${chatId}`);
        
        res.json({ 
            messages: messageList,
            chatId: chatId,
            total: messageList.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.json({
            messages: [],
            error: error.message,
            chatId: req.params.chatId,
            connected: systemStatus.whatsappConnected,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint principal para envio de mensagens - COM RATE LIMITING
app.post('/api/send-message', async (req, res) => {
    console.log('📤 Send message endpoint chamado');
    try {
        const { number, message } = req.body;
        
        if (!systemStatus.whatsappConnected) {
            return res.status(503).json({ 
                success: false,
                error: 'WhatsApp não conectado',
                connected: false,
                timestamp: new Date().toISOString()
            });
        }
        
        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Número e mensagem são obrigatórios',
                timestamp: new Date().toISOString()
            });
        }
        
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        console.log(`📤 Enviando mensagem para ${chatId}: ${message}`);
        
        // Delay mínimo apenas para envio de mensagens
        if (systemStatus.lastMessageTime && Date.now() - systemStatus.lastMessageTime < 500) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await withTimeout(client.sendMessage(chatId, message), 15000);
        systemStatus.totalMessages++;
        systemStatus.lastMessageTime = Date.now();
        
        console.log('✅ Mensagem enviada com sucesso');
        res.json({ 
            success: true, 
            message: 'Mensagem enviada',
            chatId: chatId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint alternativo para compatibilidade - COM RATE LIMITING  
app.post('/api/whatsapp/send', async (req, res) => {
    console.log('📤 WhatsApp send endpoint chamado');
    try {
        const { number, message } = req.body;
        
        if (!systemStatus.whatsappConnected) {
            return res.status(503).json({ 
                success: false,
                error: 'WhatsApp não conectado',
                connected: false,
                timestamp: new Date().toISOString()
            });
        }
        
        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Número e mensagem são obrigatórios',
                timestamp: new Date().toISOString()
            });
        }
        
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        console.log(`📤 Enviando mensagem via /api/whatsapp/send para ${chatId}: ${message}`);
        
        await withTimeout(client.sendMessage(chatId, message), 15000);
        systemStatus.totalMessages++;
        
        console.log('✅ Mensagem enviada com sucesso via endpoint alternativo');
        res.json({ 
            success: true, 
            message: 'Mensagem enviada',
            chatId: chatId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem via endpoint alternativo:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoints adicionais para status específico do WhatsApp - SEM RATE LIMITING
app.get('/api/whatsapp/status', (req, res) => {
    console.log('📱 WhatsApp status endpoint chamado');
    res.json({
        connected: systemStatus.whatsappConnected,
        whatsappConnected: systemStatus.whatsappConnected,
        qrCode: systemStatus.qrCode,
        clientInfo: systemStatus.clientInfo,  
        lastSeen: systemStatus.lastActivity.toISOString(),
        totalMessages: systemStatus.totalMessages,
        activeChats: systemStatus.activeChats,
        timestamp: new Date().toISOString(),
        rateLimiting: 'DISABLED for status endpoints'
    });
});

app.post('/api/whatsapp/connect', async (req, res) => {
    console.log('🔗 Connect endpoint chamado');
    try {
        if (systemStatus.whatsappConnected) {
            return res.json({
                success: true,
                message: 'WhatsApp já conectado',
                connected: true,
                timestamp: new Date().toISOString()
            });
        }
        
        // Reinicializar cliente se necessário
        if (!client.pupPage) {
            console.log('🔄 Reinicializando cliente WhatsApp...');
            client.initialize();
        }
        
        res.json({
            success: true,
            message: 'Tentativa de conexão iniciada',
            connected: systemStatus.whatsappConnected,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao conectar WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    console.log('🔌 Disconnect endpoint chamado');
    try {
        if (client.pupPage) {
            await client.destroy();
        }
        
        systemStatus.whatsappConnected = false;
        systemStatus.clientInfo = null;
        systemStatus.qrCode = null;
        
        console.log('🔌 WhatsApp desconectado manualmente');
        res.json({
            success: true,
            message: 'WhatsApp desconectado',
            connected: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao desconectar WhatsApp:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Métricas do WhatsApp - SEM RATE LIMITING
app.get('/api/whatsapp/metrics', (req, res) => {
    console.log('📈 Metrics endpoint chamado');
    res.json({
        totalMessages: systemStatus.totalMessages,
        activeChats: systemStatus.activeChats,
        connected: systemStatus.whatsappConnected,
        uptime: process.uptime(),
        lastActivity: systemStatus.lastActivity,
        clientInfo: systemStatus.clientInfo,
        timestamp: new Date().toISOString(),
        rateLimiting: {
            enabled: true,
            onlyForSendMessages: true,
            limit: RATE_LIMIT,
            note: 'Status endpoints são livres de rate limiting'
        }
    });
});

// Página inicial
app.get('/', (req, res) => {
    res.send(`
        <h1>🌾 SPR WhatsApp Server v1.2.1 - RATE LIMITING CORRIGIDO</h1>
        <h2>Status: ${systemStatus.whatsappConnected ? '✅ Conectado' : '❌ Desconectado'}</h2>
        <p><strong>⚠️ RATE LIMITING CONFIGURAÇÃO:</strong></p>
        <ul>
            <li><strong>Status/Health endpoints:</strong> ✅ SEM RATE LIMITING</li>
            <li><strong>Send message endpoints:</strong> ⚡ Rate limiting apenas para IPs externos</li>
            <li><strong>Localhost (127.0.0.1):</strong> 🚀 TOTALMENTE LIVRE</li>
            <li><strong>IPs externos:</strong> 🛡️ 1000 req/min (muito permissivo)</li>
        </ul>
        <p><strong>Interfaces disponíveis:</strong></p>
        <ul>
            <li><a href="/chat">💬 Interface de Chat</a></li>
        </ul>
        <p><strong>APIs disponíveis (SEM RATE LIMITING):</strong></p>
        <ul>
            <li><a href="/health">/health</a> - Health check</li>
            <li><a href="/api/status">/api/status</a> - Status do sistema</li>
            <li><a href="/api/chats">/api/chats</a> - Lista de chats</li>
            <li><a href="/api/whatsapp/status">/api/whatsapp/status</a> - Status WhatsApp</li>
        </ul>
        <p><strong>Melhorias Rate Limiting v1.2.1:</strong></p>
        <ul>
            <li>✅ Localhost TOTALMENTE LIVRE de rate limiting</li>
            <li>✅ Status endpoints SEM rate limiting</li>
            <li>✅ Rate limiting APENAS para envio de mensagens</li>
            <li>✅ Limite aumentado para 1000 req/min</li>
            <li>✅ Logs detalhados de todas as requisições</li>
        </ul>
        <p><strong>Mensagens processadas:</strong> ${systemStatus.totalMessages}</p>
        <p><strong>Última atividade:</strong> ${systemStatus.lastActivity}</p>
        <p><strong>Dashboard:</strong> <a href="http://localhost:3002">http://localhost:3002</a></p>
    `);
});

// Middleware para capturar rotas não encontradas
app.use('*', (req, res) => {
    console.log(`❌ Rota não encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: "Endpoint não encontrado",
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        note: "Esta resposta de 404 NÃO tem rate limiting",
        availableEndpoints: [
            'GET / - Página inicial',
            'GET /health - Health check (SEM rate limiting)',
            'GET /api/status - Status (SEM rate limiting)',
            'GET /api/qr - QR Code (SEM rate limiting)',
            'GET /api/chats - Lista de chats (SEM rate limiting)',
            'GET /api/chats/:chatId/messages - Mensagens (SEM rate limiting)',
            'POST /api/send-message - Enviar mensagem (COM rate limiting)',
            'POST /api/whatsapp/send - Enviar mensagem alt (COM rate limiting)',
            'GET /api/whatsapp/status - Status WhatsApp (SEM rate limiting)',
            'POST /api/whatsapp/connect - Conectar (SEM rate limiting)',
            'POST /api/whatsapp/disconnect - Desconectar (SEM rate limiting)',
            'GET /api/whatsapp/metrics - Métricas (SEM rate limiting)',
            'GET /chat - Interface de chat'
        ]
    });
});

// Tratamento de erros global
app.use((error, req, res, next) => {
    console.error('❌ Erro global:', error);
    res.status(500).json({
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString(),
        note: "Esta resposta de erro NÃO tem rate limiting"
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 SPR WhatsApp Server v1.2.1 - RATE LIMITING CORRIGIDO`);
    console.log(`🌐 Rodando na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:3002`);
    console.log(`💬 Interface de Chat: http://localhost:${PORT}/chat`);
    console.log('');
    console.log('🛡️ CONFIGURAÇÃO DE RATE LIMITING:');
    console.log('   ✅ Localhost (127.0.0.1): SEM RATE LIMITING');
    console.log('   ✅ Status/Health endpoints: SEM RATE LIMITING');
    console.log('   ⚡ Send message endpoints: Rate limiting apenas para IPs externos');
    console.log('   📈 Limite: 1000 requisições por minuto (muito permissivo)');
    console.log('');
    console.log('🔄 Iniciando cliente WhatsApp...');
    console.log('✅ Rate limiting CORRIGIDO para desenvolvimento!');
});

// Inicializar cliente WhatsApp
client.initialize();

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando servidor...');
    if (client.pupPage) {
        client.destroy();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, encerrando servidor...');
    if (client.pupPage) {
        client.destroy();
    }
    process.exit(0);
});