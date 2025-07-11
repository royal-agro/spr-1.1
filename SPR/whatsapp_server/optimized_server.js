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
let isLoading = false;

console.log('🚀 SPR WhatsApp Otimizado - Porta 3001');
console.log('📊 Configurado para muitos contatos e conversas');

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
        const sessionsDir = path.join(__dirname, 'sessions_optimized');
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
                dataPath: './sessions_optimized',
                clientId: 'spr-optimized'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
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
            
            // Carregar dados com delay para estabilizar
            setTimeout(loadOptimizedData, 5000);
        });

        whatsappClient.on('disconnected', () => {
            console.log('⚠️ WhatsApp desconectado');
            isConnected = false;
            currentQR = null;
            isLoading = false;
        });

        whatsappClient.on('message', () => {
            console.log('📨 Nova mensagem recebida');
            // Recarregar apenas se não estiver carregando
            if (!isLoading) {
                setTimeout(loadOptimizedData, 2000);
            }
        });

        await whatsappClient.initialize();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error.message);
        // Usar dados de teste em caso de erro
        contacts = testContacts;
        chats = testChats;
        isLoading = false;
    }
}

// Função otimizada para carregar dados
async function loadOptimizedData() {
    if (isLoading || !whatsappClient || !isConnected) return;
    
    isLoading = true;
    console.log('📋 Iniciando carregamento otimizado...');
    
    try {
        // ETAPA 1: Carregar apenas conversas ativas (com mensagens recentes)
        console.log('💬 Carregando conversas ativas...');
        const allChats = await whatsappClient.getChats();
        
        // Filtrar apenas conversas individuais com mensagens recentes
        const activeChats = allChats
            .filter(chat => !chat.isGroup && chat.lastMessage && chat.lastMessage.timestamp > (Date.now() - 30 * 24 * 60 * 60 * 1000)) // Últimos 30 dias
            .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp)
            .slice(0, 50); // Limitar a 50 conversas mais ativas
        
        console.log(`🔍 Encontradas ${activeChats.length} conversas ativas`);
        
        // ETAPA 2: Carregar contatos apenas das conversas ativas
        const activeContactIds = new Set(activeChats.map(chat => chat.id._serialized));
        contacts = [];
        chats = [];
        
        // ETAPA 3: Processar conversas em lotes pequenos
        const batchSize = 10;
        for (let i = 0; i < activeChats.length; i += batchSize) {
            const batch = activeChats.slice(i, i + batchSize);
            
            console.log(`📦 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(activeChats.length/batchSize)}`);
            
            for (const chat of batch) {
                try {
                    // Carregar contato
                    const contact = await chat.getContact();
                    const contactData = {
                        id: contact.id._serialized,
                        name: contact.name || contact.pushname || contact.number,
                        phoneNumber: contact.number,
                        profilePic: contact.profilePicUrl || null,
                        lastSeen: contact.lastSeen || null
                    };
                    contacts.push(contactData);
                    
                    // Carregar apenas as últimas 5 mensagens
                    const messages = await chat.fetchMessages({ limit: 5 });
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
                        contact: contactData,
                        messages: formattedMessages,
                        lastMessage: formattedMessages[formattedMessages.length - 1] || null,
                        unreadCount: chat.unreadCount || 0
                    });
                    
                } catch (error) {
                    console.log(`⚠️ Erro ao processar conversa ${chat.id._serialized}:`, error.message);
                }
            }
            
            // Pequena pausa entre lotes
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ Carregamento concluído: ${contacts.length} contatos, ${chats.length} conversas`);
        
    } catch (error) {
        console.error('❌ Erro no carregamento otimizado:', error.message);
        // Manter dados de teste se houver erro
        if (contacts.length === 0) {
            contacts = testContacts;
            chats = testChats;
        }
    } finally {
        isLoading = false;
    }
}

// Rotas da API
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: !!currentQR,
        contactsCount: contacts.length,
        chatsCount: chats.length,
        isLoading: isLoading,
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
        count: contacts.length,
        isLoading: isLoading
    });
});

app.get('/api/chats', (req, res) => {
    res.json({
        success: true,
        chats: chats,
        count: chats.length,
        isLoading: isLoading
    });
});

// Endpoint para recarregar dados
app.post('/api/reload', async (req, res) => {
    try {
        if (isLoading) {
            return res.json({ message: 'Carregamento já em andamento' });
        }
        
        setTimeout(loadOptimizedData, 1000);
        res.json({ success: true, message: 'Recarregamento iniciado' });
        
    } catch (error) {
        res.status(500).json({ error: 'Erro ao recarregar' });
    }
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
        
        // Recarregar apenas se não estiver carregando
        if (!isLoading) {
            setTimeout(loadOptimizedData, 3000);
        }
        
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
            <title>SPR WhatsApp - Otimizado</title>
            <meta charset="utf-8">
            <meta http-equiv="refresh" content="10">
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
                .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .status { padding: 15px; margin: 10px 0; border-radius: 5px; font-size: 18px; text-align: center; }
                .connected { background: #d4edda; color: #155724; }
                .disconnected { background: #f8d7da; color: #721c24; }
                .loading { background: #fff3cd; color: #856404; }
                .qr-code { text-align: center; margin: 20px 0; }
                .qr-code img { max-width: 300px; border: 2px solid #007bff; border-radius: 10px; }
                .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                .stat { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px; border: 1px solid #ddd; min-width: 120px; }
                .stat h3 { margin: 0; font-size: 24px; color: #007bff; }
                .stat.loading h3 { color: #ffc107; }
                .actions { margin: 20px 0; text-align: center; }
                .btn { padding: 12px 24px; margin: 10px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 16px; }
                .btn-primary { background: #007bff; color: white; }
                .btn-success { background: #28a745; color: white; }
                .btn-warning { background: #ffc107; color: black; }
                .chats-preview { margin: 20px 0; }
                .chat-item { padding: 15px; border: 1px solid #ddd; margin: 10px 0; border-radius: 5px; background: #f9f9f9; }
                .chat-name { font-weight: bold; color: #007bff; }
                .chat-message { color: #666; margin-top: 5px; }
                .loading-indicator { text-align: center; color: #ffc107; font-weight: bold; }
                .optimization-info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .optimization-info h4 { color: #0066cc; margin-top: 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="text-align: center; color: #007bff;">🚀 SPR WhatsApp - Servidor Otimizado</h1>
                
                <div class="optimization-info">
                    <h4>📊 Otimizações Ativas:</h4>
                    <ul>
                        <li>✅ Carrega apenas conversas dos últimos 30 dias</li>
                        <li>✅ Processa contatos em lotes pequenos</li>
                        <li>✅ Limita a 50 conversas mais ativas</li>
                        <li>✅ Carrega apenas 5 mensagens por conversa</li>
                        <li>✅ Evita sobrecarga de memória</li>
                    </ul>
                </div>
                
                <div id="status" class="status">Carregando...</div>
                
                <div class="stats">
                    <div class="stat" id="contacts-stat">
                        <h3 id="contacts-count">0</h3>
                        <p>Contatos Ativos</p>
                    </div>
                    <div class="stat" id="chats-stat">
                        <h3 id="chats-count">0</h3>
                        <p>Conversas Recentes</p>
                    </div>
                    <div class="stat" id="loading-stat">
                        <h3 id="loading-status">❌</h3>
                        <p>Status Carregamento</p>
                    </div>
                </div>
                
                <div id="qr-container" class="qr-code" style="display: none;">
                    <h3>📱 Escaneie com seu WhatsApp</h3>
                    <p><strong>Use WhatsApp NORMAL</strong> (não Business)</p>
                    <p>Para muitos contatos, o carregamento pode demorar alguns minutos</p>
                    <img id="qr-image" src="" alt="QR Code">
                </div>
                
                <div class="actions">
                    <button class="btn btn-primary" onclick="checkStatus()">🔄 Atualizar</button>
                    <button class="btn btn-warning" onclick="reloadData()">🔄 Recarregar Dados</button>
                    <a href="http://localhost:3000/whatsapp" class="btn btn-success">🌐 Abrir Interface</a>
                </div>
                
                <div id="loading-indicator" class="loading-indicator" style="display: none;">
                    <p>⏳ Carregando suas conversas... Isso pode demorar alguns minutos com muitos contatos.</p>
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
                        const loadingIndicator = document.getElementById('loading-indicator');
                        
                        // Atualizar status de carregamento
                        const loadingStat = document.getElementById('loading-stat');
                        const loadingStatus = document.getElementById('loading-status');
                        
                        if (data.isLoading) {
                            loadingStat.className = 'stat loading';
                            loadingStatus.textContent = '⏳';
                            loadingIndicator.style.display = 'block';
                        } else {
                            loadingStat.className = 'stat';
                            loadingStatus.textContent = '✅';
                            loadingIndicator.style.display = 'none';
                        }
                        
                        if (data.connected) {
                            statusDiv.className = 'status connected';
                            statusDiv.innerHTML = data.isLoading ? 
                                '✅ WhatsApp Conectado - Carregando Conversas...' : 
                                '✅ WhatsApp Conectado e Pronto!';
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
                            chatsList.innerHTML = data.chats.slice(0, 10).map(chat => \`
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
                
                async function reloadData() {
                    try {
                        await fetch('/api/reload', { method: 'POST' });
                        setTimeout(checkStatus, 2000);
                    } catch (error) {
                        console.error('Erro ao recarregar:', error);
                    }
                }
                
                // Verificar status automaticamente
                checkStatus();
                setInterval(checkStatus, 10000); // A cada 10 segundos
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