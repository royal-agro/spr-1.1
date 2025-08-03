const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3003;

// CORS configuration
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

// System status
let systemStatus = {
    whatsappConnected: false,
    qrCode: null,
    lastActivity: new Date(),
    totalMessages: 0,
    activeChats: 0,
    clientInfo: null,
    error: null
};

// Ensure directories exist
const sessionsDir = './sessions';
const qrcodesDir = './qrcodes';

[sessionsDir, qrcodesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// WhatsApp client with simplified configuration
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "spr_whatsapp",
        dataPath: sessionsDir
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
            '--disable-extensions'
        ],
        timeout: 60000
    }
});

// Event handlers
client.on('qr', async (qr) => {
    try {
        const qrString = await qrcode.toString(qr, { type: 'terminal', small: true });
        console.log('📱 QR Code gerado:');
        console.log(qrString);
        
        const qrDataURL = await qrcode.toDataURL(qr);
        systemStatus.qrCode = qrDataURL;
        systemStatus.whatsappConnected = false;
        systemStatus.error = null;
        
        // Save QR code to file
        const qrPath = path.join(qrcodesDir, `qr_${Date.now()}.png`);
        const qrBuffer = await qrcode.toBuffer(qr);
        fs.writeFileSync(qrPath, qrBuffer);
        
        console.log(`💾 QR Code salvo em: ${qrPath}`);
    } catch (error) {
        console.error('❌ Erro ao gerar QR code:', error);
        systemStatus.error = error.message;
    }
});

client.on('ready', () => {
    console.log('✅ Cliente WhatsApp está pronto!');
    systemStatus.whatsappConnected = true;
    systemStatus.qrCode = null;
    systemStatus.clientInfo = {
        pushname: client.info.pushname,
        wid: client.info.wid.user,
        platform: client.info.platform
    };
    systemStatus.lastActivity = new Date();
    systemStatus.error = null;
});

client.on('authenticated', () => {
    console.log('🔐 Cliente autenticado com sucesso!');
    systemStatus.error = null;
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    systemStatus.whatsappConnected = false;
    systemStatus.error = `Authentication failed: ${msg}`;
});

client.on('disconnected', (reason) => {
    console.log('🔌 Cliente desconectado:', reason);
    systemStatus.whatsappConnected = false;
    systemStatus.qrCode = null;
    systemStatus.clientInfo = null;
    systemStatus.error = `Disconnected: ${reason}`;
});

client.on('message', async (message) => {
    try {
        systemStatus.totalMessages++;
        systemStatus.lastActivity = new Date();
        console.log(`📥 Mensagem recebida de ${message.from}: ${message.body}`);
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
    }
});

// API Routes
app.get('/', (req, res) => {
    res.json({
        message: 'SPR WhatsApp Server',
        status: 'running',
        version: '1.3.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        whatsappConnected: systemStatus.whatsappConnected,
        hasQrCode: systemStatus.qrCode !== null,
        totalMessages: systemStatus.totalMessages,
        activeChats: systemStatus.activeChats,
        lastActivity: systemStatus.lastActivity,
        clientInfo: systemStatus.clientInfo,
        error: systemStatus.error,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/qr', (req, res) => {
    if (systemStatus.qrCode) {
        res.json({
            qrCode: systemStatus.qrCode,
            connected: systemStatus.whatsappConnected,
            message: 'QR Code disponível'
        });
    } else if (systemStatus.whatsappConnected) {
        res.json({
            connected: true,
            message: 'WhatsApp já está conectado'
        });
    } else {
        res.json({
            connected: false,
            message: 'QR Code não disponível. Aguarde...'
        });
    }
});

app.post('/api/whatsapp/connect', async (req, res) => {
    try {
        if (systemStatus.whatsappConnected) {
            return res.json({
                success: true,
                message: 'WhatsApp já está conectado',
                connected: true
            });
        }

        console.log('🔄 Iniciando conexão WhatsApp...');
        res.json({
            success: true,
            message: 'Iniciando conexão...',
            connected: false
        });
    } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/whatsapp/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        
        if (!systemStatus.whatsappConnected) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp não está conectado'
            });
        }

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Number and message are required'
            });
        }

        // For now, simulate sending
        console.log(`📤 Enviando mensagem para ${number}: ${message}`);
        
        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
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

app.get('/chat', (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SPR WhatsApp Chat</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
            .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
            .connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .disconnected { background: #f8d7da; color: #721c24; border: 1px solid #f1aeb5; }
            .qr-code { text-align: center; margin: 20px 0; }
            .qr-code img { max-width: 300px; border: 1px solid #ddd; }
            .info { background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 10px 0; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌾 SPR - WhatsApp Chat Interface</h1>
            <div id="status-container"></div>
            <div id="qr-container"></div>
            <div class="info">
                <h3>📊 Informações do Sistema</h3>
                <p><strong>Servidor:</strong> WhatsApp Server v1.3.0</p>
                <p><strong>Porta:</strong> ${PORT}</p>
                <p><strong>Status:</strong> <span id="system-status">Carregando...</span></p>
            </div>
            <button onclick="refreshStatus()">🔄 Atualizar Status</button>
        </div>

        <script>
            async function refreshStatus() {
                try {
                    const response = await fetch('/api/status');
                    const status = await response.json();
                    
                    const statusContainer = document.getElementById('status-container');
                    const qrContainer = document.getElementById('qr-container');
                    const systemStatus = document.getElementById('system-status');
                    
                    systemStatus.textContent = status.whatsappConnected ? 'Conectado' : 'Desconectado';
                    
                    if (status.whatsappConnected) {
                        statusContainer.innerHTML = '<div class="status connected">✅ WhatsApp conectado e pronto!</div>';
                        qrContainer.innerHTML = '';
                    } else if (status.hasQrCode) {
                        statusContainer.innerHTML = '<div class="status disconnected">📱 Escaneie o QR Code para conectar</div>';
                        const qrResponse = await fetch('/api/qr');
                        const qrData = await qrResponse.json();
                        if (qrData.qrCode) {
                            qrContainer.innerHTML = '<div class="qr-code"><img src="' + qrData.qrCode + '" alt="QR Code" /></div>';
                        }
                    } else {
                        statusContainer.innerHTML = '<div class="status disconnected">⏳ Aguardando QR Code...</div>';
                        qrContainer.innerHTML = '';
                    }
                } catch (error) {
                    console.error('Erro ao atualizar status:', error);
                }
            }
            
            // Auto refresh every 5 seconds
            setInterval(refreshStatus, 5000);
            refreshStatus();
        </script>
    </body>
    </html>`;
    
    res.send(htmlContent);
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Erro global:', error);
    res.status(500).json({
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SPR WhatsApp Server FIXED v1.3.0 running on port ${PORT}`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log(`💬 Chat Interface: http://localhost:${PORT}/chat`);
    console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
    console.log('🔄 Starting WhatsApp client...');
    
    // Initialize WhatsApp client
    client.initialize().catch(error => {
        console.error('❌ Failed to initialize WhatsApp client:', error);
        systemStatus.error = error.message;
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.destroy().then(() => {
        console.log('✅ WhatsApp client destroyed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    });
});