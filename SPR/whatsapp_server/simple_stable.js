const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Configurar CORS e middleware
app.use(cors());
app.use(express.json());

// Estado do WhatsApp
let whatsappClient = null;
let currentQR = null;
let isConnected = false;
let contacts = [];
let chats = [];

console.log('🚀 SPR WhatsApp Simples - Porta 3001');

// Dados de teste para fallback
const testContacts = [
    { id: '5511999999999@c.us', name: 'João Silva', phoneNumber: '5511999999999', profilePic: null, lastSeen: new Date() },
    { id: '5511888888888@c.us', name: 'Maria Santos', phoneNumber: '5511888888888', profilePic: null, lastSeen: new Date() },
    { id: '5511777777777@c.us', name: 'Pedro Costa', phoneNumber: '5511777777777', profilePic: null, lastSeen: new Date() }
];

const testChats = [
    {
        id: '5511999999999@c.us',
        contact: testContacts[0],
        messages: [
            { id: '1', content: 'Oi! Como está o preço da soja hoje?', timestamp: new Date(Date.now() - 3600000), isFromMe: false, status: 'read', type: 'text' },
            { id: '2', content: 'Vou verificar para você!', timestamp: new Date(Date.now() - 1800000), isFromMe: true, status: 'read', type: 'text' }
        ],
        lastMessage: { id: '2', content: 'Vou verificar para você!', timestamp: new Date(Date.now() - 1800000), isFromMe: true, status: 'read', type: 'text' },
        unreadCount: 0
    },
    {
        id: '5511888888888@c.us',
        contact: testContacts[1],
        messages: [
            { id: '3', content: 'Qual a cotação do milho?', timestamp: new Date(Date.now() - 7200000), isFromMe: false, status: 'read', type: 'text' },
            { id: '4', content: 'R$ 45,50 por saca', timestamp: new Date(Date.now() - 3600000), isFromMe: true, status: 'read', type: 'text' }
        ],
        lastMessage: { id: '4', content: 'R$ 45,50 por saca', timestamp: new Date(Date.now() - 3600000), isFromMe: true, status: 'read', type: 'text' },
        unreadCount: 1
    }
];

// Função para limpar sessões
function cleanupSessions() {
    try {
        const sessionsDir = path.join(__dirname, 'sessions_simple');
        if (fs.existsSync(sessionsDir)) {
            fs.rmSync(sessionsDir, { recursive: true, force: true });
            console.log('🧹 Sessões limpas');
        }
    } catch (error) {
        console.log('⚠️ Erro ao limpar sessões:', error.message);
    }
}

// Função para inicializar WhatsApp
async function initializeWhatsApp() {
    try {
        cleanupSessions();
        
        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: './sessions_simple',
                clientId: 'spr-simple'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security'
                ]
            }
        });

        whatsappClient.on('qr', (qr) => {
            console.log('\n🎯 QR CODE GERADO!');
            qrcode.generate(qr, { small: true });
            currentQR = qr;
            isConnected = false;
        });

        whatsappClient.on('ready', async () => {
            console.log('✅ WhatsApp conectado!');
            isConnected = true;
            currentQR = null;
            
            // Tentar carregar dados reais
            setTimeout(loadRealData, 3000);
        });

        whatsappClient.on('disconnected', () => {
            console.log('⚠️ WhatsApp desconectado');
            isConnected = false;
            currentQR = null;
        });

        whatsappClient.on('message', () => {
            console.log('📨 Nova mensagem recebida');
            setTimeout(loadRealData, 1000);
        });

        await whatsappClient.initialize();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error.message);
        // Usar dados de teste em caso de erro
        contacts = testContacts;
        chats = testChats;
    }
}

// Função para carregar dados reais
async function loadRealData() {
    try {
        if (!whatsappClient || !isConnected) return;
        
        console.log('📋 Carregando dados reais...');
        
        // Carregar contatos
        const realContacts = await whatsappClient.getContacts();
        contacts = realContacts
            .filter(contact => contact.isMyContact && !contact.isGroup)
            .slice(0, 50)
            .map(contact => ({
                id: contact.id._serialized,
                name: contact.name || contact.pushname || contact.number,
                phoneNumber: contact.number,
                profilePic: contact.profilePicUrl || null,
                lastSeen: contact.lastSeen || null
            }));
        
        // Carregar conversas
        const realChats = await whatsappClient.getChats();
        chats = [];
        
        for (const chat of realChats.slice(0, 20)) {
            if (chat.isGroup || !chat.lastMessage) continue;
            
            const contact = contacts.find(c => c.id === chat.id._serialized);
            if (!contact) continue;
            
            const messages = await chat.fetchMessages({ limit: 10 });
            const formattedMessages = messages.reverse().map(msg => ({
                id: msg.id._serialized,
                content: msg.body || '[Mídia]',
                timestamp: new Date(msg.timestamp * 1000),
                isFromMe: msg.fromMe,
                status: 'read',
                type: 'text'
            }));
            
            chats.push({
                id: chat.id._serialized,
                contact: contact,
                messages: formattedMessages,
                lastMessage: formattedMessages[formattedMessages.length - 1] || null,
                unreadCount: chat.unreadCount || 0
            });
        }
        
        console.log(`✅ ${contacts.length} contatos e ${chats.length} conversas carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados reais:', error.message);
        // Manter dados de teste
        if (contacts.length === 0) {
            contacts = testContacts;
            chats = testChats;
        }
    }
}

// Rotas da API
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: !!currentQR,
        contactsCount: contacts.length,
        chatsCount: chats.length,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/qr', async (req, res) => {
    if (!currentQR) {
        return res.json({ hasQR: false });
    }
    
    try {
        const qrImage = await QRCode.toDataURL(currentQR);
        res.json({ 
            hasQR: true, 
            qrCode: qrImage,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar QR Code' });
    }
});

app.get('/api/contacts', (req, res) => {
    res.json({
        success: true,
        contacts: contacts,
        count: contacts.length
    });
});

app.get('/api/chats', (req, res) => {
    res.json({
        success: true,
        chats: chats,
        count: chats.length
    });
});

app.post('/api/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        
        if (!whatsappClient || !isConnected) {
            return res.status(400).json({ error: 'WhatsApp não conectado' });
        }
        
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        await whatsappClient.sendMessage(chatId, message);
        
        console.log(`📤 Mensagem enviada para ${number}`);
        setTimeout(loadRealData, 2000);
        
        res.json({ success: true, message: 'Mensagem enviada' });
        
    } catch (error) {
        console.error('❌ Erro ao enviar:', error.message);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SPR WhatsApp - Simples</title>
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="5">
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
                .status { padding: 15px; margin: 10px 0; border-radius: 5px; font-size: 18px; text-align: center; }
                .connected { background: #d4edda; color: #155724; }
                .disconnected { background: #f8d7da; color: #721c24; }
                .qr-code { text-align: center; margin: 20px 0; }
                .qr-code img { max-width: 300px; border: 2px solid #007bff; border-radius: 10px; }
                .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                .stat { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px; border: 1px solid #ddd; }
                .stat h3 { margin: 0; font-size: 24px; color: #007bff; }
                .actions { margin: 20px 0; text-align: center; }
                .btn { padding: 12px 24px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 16px; }
                .btn-primary { background: #007bff; color: white; }
                .btn-success { background: #28a745; color: white; }
                .chats-preview { margin: 20px 0; }
                .chat-item { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; background: #f9f9f9; }
                .chat-name { font-weight: bold; color: #007bff; }
                .chat-message { color: #666; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="text-align: center; color: #007bff;">🚀 SPR WhatsApp - Servidor Simples</h1>
                
                <div id="status" class="status">Carregando...</div>
                
                <div class="stats">
                    <div class="stat">
                        <h3 id="contacts-count">0</h3>
                        <p>Contatos Carregados</p>
                    </div>
                    <div class="stat">
                        <h3 id="chats-count">0</h3>
                        <p>Conversas Ativas</p>
                    </div>
                </div>
                
                <div id="qr-container" class="qr-code" style="display: none;">
                    <h3>📱 Escaneie com seu WhatsApp</h3>
                    <p>Use o WhatsApp <strong>NORMAL</strong> (não Business)</p>
                    <img id="qr-image" src="" alt="QR Code">
                </div>
                
                <div class="actions">
                    <button class="btn btn-primary" onclick="checkStatus()">🔄 Atualizar</button>
                    <a href="http://localhost:3000/whatsapp" class="btn btn-success">🌐 Abrir Interface</a>
                </div>
                
                <div id="chats-preview" class="chats-preview" style="display: none;">
                    <h3>💬 Conversas Recentes</h3>
                    <div id="chats-list"></div>
                </div>
            </div>
            
            <script>
                async function checkStatus() {
                    try {
                        const response = await fetch('/api/status');
                        const data = await response.json();
                        
                        const statusDiv = document.getElementById('status');
                        const qrContainer = document.getElementById('qr-container');
                        
                        if (data.connected) {
                            statusDiv.className = 'status connected';
                            statusDiv.innerHTML = '✅ WhatsApp Conectado e Funcionando!';
                            qrContainer.style.display = 'none';
                            await loadChats();
                        } else if (data.hasQR) {
                            statusDiv.className = 'status disconnected';
                            statusDiv.innerHTML = '⏳ Aguardando Conexão - Escaneie o QR Code';
                            await loadQR();
                        } else {
                            statusDiv.className = 'status disconnected';
                            statusDiv.innerHTML = '🔄 Inicializando WhatsApp...';
                            qrContainer.style.display = 'none';
                        }
                        
                        document.getElementById('contacts-count').textContent = data.contactsCount || 0;
                        document.getElementById('chats-count').textContent = data.chatsCount || 0;
                        
                    } catch (error) {
                        console.error('Erro:', error);
                        document.getElementById('status').innerHTML = '❌ Erro de Conexão';
                    }
                }
                
                async function loadQR() {
                    try {
                        const response = await fetch('/api/qr');
                        const data = await response.json();
                        
                        if (data.hasQR) {
                            document.getElementById('qr-container').style.display = 'block';
                            document.getElementById('qr-image').src = data.qrCode;
                        }
                    } catch (error) {
                        console.error('Erro ao carregar QR:', error);
                    }
                }
                
                async function loadChats() {
                    try {
                        const response = await fetch('/api/chats');
                        const data = await response.json();
                        
                        const chatsPreview = document.getElementById('chats-preview');
                        const chatsList = document.getElementById('chats-list');
                        
                        if (data.chats && data.chats.length > 0) {
                            chatsPreview.style.display = 'block';
                            chatsList.innerHTML = data.chats.slice(0, 5).map(chat => \`
                                <div class="chat-item">
                                    <div class="chat-name">\${chat.contact.name}</div>
                                    <div class="chat-message">\${chat.lastMessage ? chat.lastMessage.content : 'Sem mensagens'}</div>
                                </div>
                            \`).join('');
                        } else {
                            chatsPreview.style.display = 'none';
                        }
                    } catch (error) {
                        console.error('Erro ao carregar conversas:', error);
                    }
                }
                
                // Verificar status automaticamente
                checkStatus();
                setInterval(checkStatus, 5000);
            </script>
        </body>
        </html>
    `);
});

// Inicializar aplicação
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Interface: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    
    // Usar dados de teste inicialmente
    contacts = testContacts;
    chats = testChats;
    
    // Tentar inicializar WhatsApp
    initializeWhatsApp();
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Promise rejeitada:', reason.message || reason);
});

process.on('SIGINT', () => {
    console.log('\n🔄 Desligando servidor...');
    if (whatsappClient) {
        whatsappClient.destroy();
    }
    process.exit(0);
}); 