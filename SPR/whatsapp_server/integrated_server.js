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
app.use(express.static('public'));

// Estado do WhatsApp
let whatsappClient = null;
let currentQR = null;
let isConnected = false;
let contacts = [];
let chats = [];

console.log('🚀 SPR WhatsApp Integrado - Porta 3001');
console.log('🌐 Frontend: http://localhost:3000');
console.log('🔗 API: http://localhost:3001/api');

// Função para inicializar o cliente WhatsApp
function initializeWhatsApp() {
    try {
        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: './sessions_integrated_' + Date.now()
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

        // Evento QR Code
        whatsappClient.on('qr', (qr) => {
            console.log('\n🎯 QR CODE GERADO!');
            console.log('📱 Escaneie com WhatsApp:');
            console.log('=' * 50);
            qrcode.generate(qr, { small: true });
            console.log('=' * 50);
            
            currentQR = qr;
            isConnected = false;
        });

        // Evento de conexão
        whatsappClient.on('ready', async () => {
            console.log('✅ WhatsApp conectado com sucesso!');
            isConnected = true;
            currentQR = null;
            
            // Carregar contatos e conversas
            await loadContactsAndChats();
        });

        // Evento de desconexão
        whatsappClient.on('disconnected', (reason) => {
            console.log('⚠️ WhatsApp desconectado:', reason);
            isConnected = false;
            currentQR = null;
            
            // Tentar reconectar após 5 segundos
            setTimeout(() => {
                console.log('🔄 Tentando reconectar...');
                initializeWhatsApp();
            }, 5000);
        });

        // Evento de nova mensagem
        whatsappClient.on('message', async (message) => {
            console.log('📨 Nova mensagem recebida:', message.from);
            await updateChatsFromWhatsApp();
        });

        // Inicializar cliente
        whatsappClient.initialize();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar WhatsApp:', error);
        setTimeout(() => {
            console.log('🔄 Tentando novamente...');
            initializeWhatsApp();
        }, 10000);
    }
}

// Função para carregar contatos e conversas do WhatsApp
async function loadContactsAndChats() {
    try {
        if (!whatsappClient || !isConnected) return;
        
        console.log('📋 Carregando contatos e conversas...');
        
        // Carregar contatos
        const whatsappContacts = await whatsappClient.getContacts();
        contacts = whatsappContacts
            .filter(contact => contact.isMyContact && !contact.isGroup)
            .slice(0, 50) // Limitar a 50 contatos para performance
            .map(contact => ({
                id: contact.id._serialized,
                name: contact.name || contact.pushname || contact.number,
                phoneNumber: contact.number,
                profilePic: contact.profilePicUrl || null,
                lastSeen: contact.lastSeen || null
            }));
        
        // Carregar conversas
        const whatsappChats = await whatsappClient.getChats();
        chats = [];
        
        for (const chat of whatsappChats.slice(0, 20)) { // Limitar a 20 conversas
            if (chat.isGroup) continue;
            
            const contact = contacts.find(c => c.id === chat.id._serialized);
            if (!contact) continue;
            
            // Carregar mensagens recentes
            const messages = await chat.fetchMessages({ limit: 10 });
            const formattedMessages = messages.map(msg => ({
                id: msg.id._serialized,
                content: msg.body,
                timestamp: new Date(msg.timestamp * 1000),
                isFromMe: msg.fromMe,
                status: msg.ack === 3 ? 'read' : msg.ack === 2 ? 'delivered' : 'sent',
                type: 'text'
            }));
            
            chats.push({
                id: chat.id._serialized,
                contact: contact,
                messages: formattedMessages,
                lastMessage: formattedMessages[0] || null,
                unreadCount: chat.unreadCount || 0
            });
        }
        
        console.log(`✅ Carregados ${contacts.length} contatos e ${chats.length} conversas`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}

// Função para atualizar conversas
async function updateChatsFromWhatsApp() {
    if (!whatsappClient || !isConnected) return;
    
    try {
        // Recarregar conversas
        await loadContactsAndChats();
    } catch (error) {
        console.error('❌ Erro ao atualizar conversas:', error);
    }
}

// Rotas da API

// Status do WhatsApp
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: !!currentQR,
        contactsCount: contacts.length,
        chatsCount: chats.length,
        timestamp: new Date().toISOString()
    });
});

// QR Code
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

// Contatos
app.get('/api/contacts', (req, res) => {
    res.json({
        success: true,
        contacts: contacts,
        count: contacts.length
    });
});

// Conversas
app.get('/api/chats', (req, res) => {
    res.json({
        success: true,
        chats: chats,
        count: chats.length
    });
});

// Enviar mensagem
app.post('/api/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        
        if (!whatsappClient || !isConnected) {
            return res.status(400).json({ error: 'WhatsApp não conectado' });
        }
        
        // Formatar número
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        
        // Enviar mensagem
        await whatsappClient.sendMessage(chatId, message);
        
        console.log(`📤 Mensagem enviada para ${number}: ${message}`);
        
        // Atualizar conversas
        setTimeout(() => updateChatsFromWhatsApp(), 1000);
        
        res.json({ success: true, message: 'Mensagem enviada com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Reiniciar WhatsApp
app.post('/api/restart', async (req, res) => {
    try {
        if (whatsappClient) {
            await whatsappClient.destroy();
        }
        
        setTimeout(() => {
            initializeWhatsApp();
        }, 2000);
        
        res.json({ success: true, message: 'WhatsApp reiniciado' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao reiniciar' });
    }
});

// Página principal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SPR WhatsApp - Integrado</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
                .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
                .connected { background: #d4edda; color: #155724; }
                .disconnected { background: #f8d7da; color: #721c24; }
                .qr-code { text-align: center; margin: 20px 0; }
                .qr-code img { max-width: 300px; border: 1px solid #ddd; }
                .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px; }
                .actions { margin: 20px 0; }
                .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
                .btn-primary { background: #007bff; color: white; }
                .btn-danger { background: #dc3545; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 SPR WhatsApp - Servidor Integrado</h1>
                
                <div id="status" class="status">Carregando...</div>
                
                <div class="stats">
                    <div class="stat">
                        <h3 id="contacts-count">0</h3>
                        <p>Contatos</p>
                    </div>
                    <div class="stat">
                        <h3 id="chats-count">0</h3>
                        <p>Conversas</p>
                    </div>
                </div>
                
                <div id="qr-container" class="qr-code" style="display: none;">
                    <h3>📱 Escaneie o QR Code</h3>
                    <img id="qr-image" src="" alt="QR Code">
                </div>
                
                <div class="actions">
                    <button class="btn btn-primary" onclick="checkStatus()">🔄 Atualizar Status</button>
                    <button class="btn btn-danger" onclick="restart()">🔄 Reiniciar WhatsApp</button>
                    <a href="http://localhost:3000" class="btn btn-primary">🌐 Abrir Frontend</a>
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
                            statusDiv.innerHTML = '✅ WhatsApp Conectado';
                            qrContainer.style.display = 'none';
                        } else if (data.hasQR) {
                            statusDiv.className = 'status disconnected';
                            statusDiv.innerHTML = '⏳ Aguardando QR Code';
                            await loadQR();
                        } else {
                            statusDiv.className = 'status disconnected';
                            statusDiv.innerHTML = '🔄 Inicializando...';
                            qrContainer.style.display = 'none';
                        }
                        
                        document.getElementById('contacts-count').textContent = data.contactsCount || 0;
                        document.getElementById('chats-count').textContent = data.chatsCount || 0;
                        
                    } catch (error) {
                        console.error('Erro ao verificar status:', error);
                    }
                }
                
                async function loadQR() {
                    try {
                        const response = await fetch('/api/qr');
                        const data = await response.json();
                        
                        if (data.hasQR) {
                            document.getElementById('qr-image').src = data.qrCode;
                            document.getElementById('qr-container').style.display = 'block';
                        }
                    } catch (error) {
                        console.error('Erro ao carregar QR:', error);
                    }
                }
                
                async function restart() {
                    try {
                        await fetch('/api/restart', { method: 'POST' });
                        alert('WhatsApp reiniciado!');
                        setTimeout(checkStatus, 2000);
                    } catch (error) {
                        alert('Erro ao reiniciar');
                    }
                }
                
                // Verificar status a cada 3 segundos
                setInterval(checkStatus, 3000);
                checkStatus();
            </script>
        </body>
        </html>
    `);
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Interface: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    
    // Inicializar WhatsApp
    initializeWhatsApp();
}); 