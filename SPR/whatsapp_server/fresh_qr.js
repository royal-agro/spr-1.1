const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

let qrData = null;
let isConnected = false;

console.log('🚀 SPR WhatsApp - Iniciando na porta', PORT);

// Criar cliente com configuração simples
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions_fresh'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Eventos
client.on('qr', (qr) => {
    console.log('\n🎯 QR CODE GERADO!');
    console.log('📱 Escaneie com seu WhatsApp:');
    console.log('=' * 50);
    qrcode.generate(qr, { small: true });
    console.log('=' * 50);
    console.log('🌐 Ou acesse: http://localhost:3002');
    
    qrData = qr;
    isConnected = false;
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    isConnected = true;
    qrData = null;
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado com sucesso!');
});

client.on('disconnected', () => {
    console.log('⚠️ Desconectado');
    isConnected = false;
});

// Servidor web
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SPR WhatsApp - Porta 3002</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial; text-align: center; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; }
                .qr { margin: 20px; padding: 20px; border: 2px solid #25d366; }
                .status { padding: 10px; margin: 10px; border-radius: 5px; }
                .connected { background: #d4edda; color: #155724; }
                .waiting { background: #fff3cd; color: #856404; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 SPR WhatsApp</h1>
                <h2>Porta 3002</h2>
                <div id="status" class="status">
                    <p>Carregando...</p>
                </div>
                <div id="qr-area"></div>
                <button onclick="location.reload()">🔄 Atualizar</button>
            </div>
            <script>
                function updateStatus() {
                    fetch('/api/status')
                        .then(r => r.json())
                        .then(data => {
                            const status = document.getElementById('status');
                            const qrArea = document.getElementById('qr-area');
                            
                            if (data.connected) {
                                status.className = 'status connected';
                                status.innerHTML = '<h3>✅ WhatsApp Conectado!</h3>';
                                qrArea.innerHTML = '';
                            } else if (data.qr) {
                                status.className = 'status waiting';
                                status.innerHTML = '<h3>📱 QR Code Disponível</h3>';
                                qrArea.innerHTML = '<div class="qr"><img src="' + data.qrImage + '" style="max-width: 300px;"/><p>Escaneie com seu WhatsApp</p></div>';
                            } else {
                                status.className = 'status waiting';
                                status.innerHTML = '<h3>⏳ Gerando QR Code...</h3>';
                                qrArea.innerHTML = '';
                            }
                        })
                        .catch(() => {
                            document.getElementById('status').innerHTML = '<h3>❌ Erro de conexão</h3>';
                        });
                }
                
                setInterval(updateStatus, 2000);
                updateStatus();
            </script>
        </body>
        </html>
    `);
});

app.get('/api/status', async (req, res) => {
    try {
        let qrImage = null;
        if (qrData) {
            const QRCode = require('qrcode');
            qrImage = await QRCode.toDataURL(qrData);
        }
        
        res.json({
            connected: isConnected,
            qr: qrData,
            qrImage: qrImage
        });
    } catch (error) {
        res.json({
            connected: false,
            qr: null,
            qrImage: null
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando: http://localhost:${PORT}`);
});

// Iniciar WhatsApp
client.initialize();

// Cleanup
process.on('SIGINT', async () => {
    console.log('\n🔄 Encerrando...');
    await client.destroy();
    process.exit(0);
}); 