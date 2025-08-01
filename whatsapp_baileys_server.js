const express = require('express');
const cors = require('cors');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const P = require('pino');

const app = express();
const PORT = 3003;

// Estado do WhatsApp
let sock = null;
let qrCodeData = null;
let isConnected = false;
let connectionState = 'disconnected';

// Logger
const logger = P({ level: 'warn' }); // Reduzir logs

// CORS
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:3002', 
        'http://localhost:3004'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.use(express.json());

// Função para inicializar WhatsApp
async function initializeWhatsApp() {
    try {
        console.log('🔄 Inicializando conexão WhatsApp...');
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        sock = makeWASocket({
            auth: state,
            logger,
            printQRInTerminal: true
        });

        // Eventos do socket
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Code gerado');
                qrCodeData = await qrcode.toDataURL(qr);
                connectionState = 'connecting';
            }
            
            if (connection === 'close') {
                console.log('❌ Conexão fechada');
                const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
                
                if (shouldReconnect) {
                    console.log('🔄 Reconectando...');
                    initializeWhatsApp();
                } else {
                    console.log('🚪 Logout detectado');
                    isConnected = false;
                    connectionState = 'disconnected';
                    qrCodeData = null;
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp conectado!');
                isConnected = true;
                connectionState = 'connected';
                qrCodeData = null;
            }
        });

        sock.ev.on('creds.update', saveCreds);
        
    } catch (error) {
        console.error('❌ Erro ao inicializar WhatsApp:', error);
        connectionState = 'error';
    }
}

// Endpoints da API
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        whatsappConnected: isConnected,
        status: connectionState,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/qr', (req, res) => {
    if (qrCodeData) {
        res.json({
            success: true,
            qrCode: qrCodeData,
            message: 'QR Code disponível'
        });
    } else if (isConnected) {
        res.json({
            success: true,
            qrCode: null,
            message: 'WhatsApp já está conectado'
        });
    } else {
        res.json({
            success: false,
            qrCode: null,
            message: 'QR Code não disponível. Tente reconectar.'
        });
    }
});

app.post('/api/send', async (req, res) => {
    try {
        if (!isConnected || !sock) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp não está conectado'
            });
        }

        const { number, message } = req.body;
        const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
        
        await sock.sendMessage(jid, { text: message });
        
        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso'
        });
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar mensagem'
        });
    }
});

app.get('/api/chats', (req, res) => {
    // Retornar chats mock por enquanto
    res.json({
        success: true,
        chats: [],
        message: 'Lista de chats (em desenvolvimento)'
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'SPR WhatsApp Server Baileys',
        version: '1.0.0',
        status: connectionState,
        connected: isConnected,
        endpoints: {
            status: '/api/status',
            qr: '/api/qr',
            send: '/api/send',
            chats: '/api/chats'
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 SPR WhatsApp Server (Baileys) rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log('📱 Inicializando WhatsApp...');
    
    // Inicializar WhatsApp
    initializeWhatsApp();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Encerrando servidor...');
    if (sock) {
        sock.end();
    }
    process.exit(0);
});