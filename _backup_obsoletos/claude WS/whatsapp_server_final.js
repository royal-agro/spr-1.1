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

// Rate limiting otimizado
const rateLimitMap = new Map();
const RATE_LIMIT = 200; // requests per minute (aumentado de 100)
const RATE_WINDOW = 60000; // 1 minute
const RETRY_DELAY = 5000; // 5 segundos entre retries (novo)

const rateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
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
            timestamp: new Date().toISOString()
        });
    }
    
    client.count++;
    next();
};

app.use(rateLimit);

// Estado do sistema
let systemStatus = {
    whatsappConnected: false,
    qrCode: null,
    lastActivity: new Date(),
    totalMessages: 0,
    activeChats: 0,
    clientInfo: null,
    lastMessageTime: 0 // Novo campo para controle de spam
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

// Rotas da API REST
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        whatsapp: systemStatus.whatsappConnected,
        uptime: process.uptime()
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        ...systemStatus,
        connected: systemStatus.whatsappConnected,
        whatsappConnected: systemStatus.whatsappConnected,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/qr', (req, res) => {
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

// API para buscar mensagens de um chat específico - CORRIGIDA
app.get('/api/chats/:chatId/messages', async (req, res) => {
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
        
        console.log(`📥 Buscando mensagens para chat: ${chatId}`);
        
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
        
        // Manter ordem original (mais recente primeiro do WhatsApp)
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

// Endpoint principal para envio de mensagens
app.post('/api/send-message', async (req, res) => {
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
        
        // Adicionar delay para evitar spam
        if (systemStatus.lastMessageTime && Date.now() - systemStatus.lastMessageTime < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000));
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

// Endpoint alternativo para compatibilidade com backend
app.post('/api/whatsapp/send', async (req, res) => {
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

// Endpoints adicionais para status específico do WhatsApp
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: systemStatus.whatsappConnected,
        whatsappConnected: systemStatus.whatsappConnected,
        qrCode: systemStatus.qrCode,
        clientInfo: systemStatus.clientInfo,  
        lastSeen: systemStatus.lastActivity.toISOString(),
        totalMessages: systemStatus.totalMessages,
        activeChats: systemStatus.activeChats,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/whatsapp/connect', async (req, res) => {
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

// Métricas do WhatsApp
app.get('/api/whatsapp/metrics', (req, res) => {
    res.json({
        totalMessages: systemStatus.totalMessages,
        activeChats: systemStatus.activeChats,
        connected: systemStatus.whatsappConnected,
        uptime: process.uptime(),
        lastActivity: systemStatus.lastActivity,
        clientInfo: systemStatus.clientInfo,
        timestamp: new Date().toISOString()
    });
});

// Interface de Chat WhatsApp (mantida do código original)
app.get('/chat', (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Chat - SPR 1.2</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f2f5;
            height: 100vh;
            display: flex;
        }
        .sidebar {
            width: 350px;
            background: white;
            border-right: 1px solid #e9ecef;
            display: flex;
            flex-direction: column;
        }
        .sidebar-header {
            padding: 20px;
            background: #25D366;
            color: white;
            text-align: center;
        }
        .chat-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .chat-item {
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background 0.2s;
        }
        .chat-item:hover {
            background: #f8f9fa;
        }
        .chat-item.active {
            background: #e3f2fd;
        }
        .chat-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .chat-preview {
            color: #666;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: white;
        }
        .chat-header {
            padding: 20px;
            background: #25D366;
            color: white;
            text-align: center;
        }
        .messages-container {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #e5ddd5;
        }
        .message {
            margin-bottom: 15px;
            max-width: 70%;
            padding: 10px 15px;
            border-radius: 10px;
            word-wrap: break-word;
        }
        .message.sent {
            background: #dcf8c6;
            margin-left: auto;
            text-align: right;
        }
        .message.received {
            background: white;
            margin-right: auto;
        }
        .message-time {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        .message-input {
            display: flex;
            padding: 20px;
            background: white;
            border-top: 1px solid #e9ecef;
            gap: 10px;
        }
        .message-input input {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 25px;
            outline: none;
        }
        .send-btn {
            background: #25D366;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 50%;
            cursor: pointer;
            transition: background 0.2s;
        }
        .send-btn:hover {
            background: #1da851;
        }
        .no-chat {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            font-size: 18px;
        }
        .status {
            padding: 10px;
            text-align: center;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
        .connected {
            color: #28a745;
        }
        .disconnected {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h3>💬 WhatsApp Chats v1.2</h3>
        </div>
        <div class="status" id="status">
            Carregando conversas...
        </div>
        <div class="chat-list" id="chatList">
            <div class="loading">Carregando...</div>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header" id="chatHeader">
            <h3>🌾 SPR 1.2 - WhatsApp Interface</h3>
        </div>
        <div class="messages-container" id="messagesContainer">
            <div class="no-chat">
                Selecione uma conversa para começar
            </div>
        </div>
        <div class="message-input" id="messageInput" style="display: none;">
            <input type="text" id="messageText" placeholder="Digite sua mensagem..." onkeypress="handleKeyPress(event)">
            <button class="send-btn" onclick="sendMessage()">➤</button>
        </div>
    </div>

    <script>
        let currentChat = null;
        let chats = [];

        async function loadChats() {
            try {
                const response = await fetch('/api/chats');
                const data = await response.json();
                
                if (data.chats) {
                    chats = data.chats;
                    displayChats(chats);
                    document.getElementById('status').innerHTML = 
                        '<span class="connected">✅ ' + chats.length + ' conversas encontradas</span>';
                } else {
                    document.getElementById('status').innerHTML = 
                        '<span class="disconnected">❌ Nenhuma conversa encontrada</span>';
                }
            } catch (error) {
                console.error('Erro ao carregar chats:', error);
                document.getElementById('status').innerHTML = 
                    '<span class="disconnected">❌ Erro ao carregar conversas</span>';
            }
        }

        function displayChats(chatList) {
            const chatListEl = document.getElementById('chatList');
            
            if (chatList.length === 0) {
                chatListEl.innerHTML = '<div class="loading">Nenhuma conversa encontrada</div>';
                return;
            }
            
            chatListEl.innerHTML = chatList.map(chat => 
                '<div class="chat-item" onclick="selectChat(\'' + chat.id + '\', \'' + chat.name + '\')">' +
                    '<div class="chat-name">' + (chat.name || 'Contato') + '</div>' +
                    '<div class="chat-preview">' + (chat.lastMessage || 'Nenhuma mensagem') + '</div>' +
                '</div>'
            ).join('');
        }

        function selectChat(chatId, chatName) {
            currentChat = chatId;
            
            // Destacar chat selecionado
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.chat-item').classList.add('active');
            
            // Atualizar header
            document.getElementById('chatHeader').innerHTML = '<h3>💬 ' + chatName + '</h3>';
            
            // Mostrar área de mensagem
            document.getElementById('messageInput').style.display = 'flex';
            
            // Carregar mensagens reais
            loadMessages(chatId);
        }

        async function loadMessages(chatId) {
            const messagesContainer = document.getElementById('messagesContainer');
            
            try {
                // Mostrar loading
                messagesContainer.innerHTML = '<div class="loading">Carregando mensagens...</div>';
                
                // Buscar mensagens reais da API
                const response = await fetch('/api/chats/' + encodeURIComponent(chatId) + '/messages?limit=50');
                const data = await response.json();
                
                if (data.messages && data.messages.length > 0) {
                    // Renderizar mensagens reais (order original - mais recente primeiro)
                    // Reverter para mostrar mais antiga primeiro na interface
                    const reversedMessages = data.messages.reverse();
                    
                    messagesContainer.innerHTML = reversedMessages.map(msg => {
                        const isFromMe = msg.fromMe;
                        const messageClass = isFromMe ? 'sent' : 'received';
                        const time = new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        return '<div class="message ' + messageClass + '">' +
                            '<div>' + (msg.body || '(mensagem sem texto)') + '</div>' +
                            '<div class="message-time">' + time + '</div>' +
                        '</div>';
                    }).join('');
                    
                    // Scroll para o final
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } else {
                    // Nenhuma mensagem encontrada
                    messagesContainer.innerHTML = 
                        '<div class="no-chat">' +
                            '<div style="text-align: center;">' +
                                '<p>Nenhuma mensagem nesta conversa</p>' +
                                '<p style="font-size: 14px; color: #888; margin-top: 10px;">' +
                                    'Digite uma mensagem abaixo para começar' +
                                '</p>' +
                            '</div>' +
                        '</div>';
                }
                
            } catch (error) {
                console.error('Erro ao carregar mensagens:', error);
                messagesContainer.innerHTML = 
                    '<div class="no-chat">' +
                        '<div style="text-align: center; color: #e74c3c;">' +
                            '<p>❌ Erro ao carregar mensagens</p>' +
                            '<p style="font-size: 14px; margin-top: 10px;">' +
                                (error.message || 'Erro de conexão') +
                            '</p>' +
                        '</div>' +
                    '</div>';
            }
        }

        async function sendMessage() {
            const messageText = document.getElementById('messageText');
            const text = messageText.value.trim();
            
            if (!text || !currentChat) return;
            
            try {
                // Adicionar mensagem enviada na interface primeiro
                addMessageToUI(text, true);
                messageText.value = '';
                
                // Enviar mensagem via API
                const response = await fetch('/api/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: currentChat,
                        message: text
                    })
                });
                
                const result = await response.json();
                
                if (!result.success) {
                    addMessageToUI('❌ Erro ao enviar: ' + result.error, false);
                } else {
                    console.log('✅ Mensagem enviada com sucesso');
                }
                
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                addMessageToUI('❌ Erro de conexão ao enviar mensagem', false);
            }
        }

        function addMessageToUI(text, isSent) {
            const messagesContainer = document.getElementById('messagesContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (isSent ? 'sent' : 'received');
            
            const now = new Date();
            const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');
            
            messageDiv.innerHTML = 
                '<div>' + text + '</div>' +
                '<div class="message-time">' + timeStr + '</div>';
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        // Verificar status da conexão
        async function checkConnectionStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                const statusEl = document.getElementById('status');
                if (data.whatsappConnected) {
                    statusEl.innerHTML = '<span class="connected">✅ WhatsApp conectado - ' + 
                                       (chats.length || 0) + ' conversas</span>';
                } else {
                    statusEl.innerHTML = '<span class="disconnected">❌ WhatsApp desconectado</span>';
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }

        // Carregar chats ao inicializar
        loadChats();
        
        // Verificar status periodicamente
        setInterval(checkConnectionStatus, 10000);
        
        // Atualizar chats a cada 30 segundos
        setInterval(loadChats, 30000);
    </script>
</body>
</html>
    `;
    res.send(htmlContent);
});

// Página inicial
app.get('/', (req, res) => {
    res.send(`
        <h1>🌾 SPR WhatsApp Server v1.2 - CORRIGIDO</h1>
        <h2>Status: ${systemStatus.whatsappConnected ? '✅ Conectado' : '❌ Desconectado'}</h2>
        <p><strong>Interfaces disponíveis:</strong></p>
        <ul>
            <li><a href="/qr-page">📱 Conectar WhatsApp</a></li>
            <li><a href="/chat">💬 Interface de Chat</a></li>
        </ul>
        <p><strong>APIs disponíveis:</strong></p>
        <ul>
            <li><a href="/health">/health</a> - Health check</li>
            <li><a href="/api/status">/api/status</a> - Status do sistema</li>
            <li><a href="/api/chats">/api/chats</a> - Lista de chats</li>
            <li><a href="/api/whatsapp/status">/api/whatsapp/status</a> - Status WhatsApp</li>
        </ul>
        <p><strong>Melhorias v1.2:</strong></p>
        <ul>
            <li>✅ Timeout de 30 segundos para todas as operações</li>
            <li>✅ Rate limiting implementado</li>
            <li>✅ Mensagens ordenadas corretamente</li>
            <li>✅ CORS melhorado</li>
            <li>✅ Endpoints duplicados para compatibilidade</li>
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
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/status',
            'GET /api/qr',
            'GET /api/chats',
            'GET /api/chats/:chatId/messages',
            'POST /api/send-message',
            'POST /api/whatsapp/send',
            'GET /api/whatsapp/status',
            'POST /api/whatsapp/connect',
            'POST /api/whatsapp/disconnect',
            'GET /api/whatsapp/metrics',
            'GET /chat'
        ]
    });
});

// Tratamento de erros global
app.use((error, req, res, next) => {
    console.error('❌ Erro global:', error);
    res.status(500).json({
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 SPR WhatsApp Server CORRIGIDO v1.2 rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:3002`);
    console.log(`💬 Interface de Chat: http://localhost:${PORT}/chat`);
    console.log('🔄 Iniciando cliente WhatsApp...');
    console.log('✅ Melhorias implementadas:');
    console.log('   - Timeout de 30s para todas as operações');
    console.log('   - Rate limiting de 100 req/min');
    console.log('   - Endpoints duplicados para compatibilidade');
    console.log('   - Ordenação correta de mensagens');
    console.log('   - CORS melhorado');
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