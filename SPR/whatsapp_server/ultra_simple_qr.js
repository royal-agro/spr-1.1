const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = 3002;

let currentQR = null;
let isReady = false;

console.log('🚀 SPR WhatsApp Ultra Simple - Porta 3002');

// Cliente WhatsApp com pasta nova
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions_new_' + Date.now()
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

// Eventos
client.on('qr', (qr) => {
    console.log('\n🎯 QR CODE GERADO!');
    console.log('📱 Escaneie com WhatsApp:');
    console.log('='.repeat(50));
    qrcode.generate(qr, { small: true });
    console.log('='.repeat(50));
    console.log('🌐 Acesse: http://localhost:3002');
    
    currentQR = qr;
    isReady = false;
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    isReady = true;
    currentQR = null;
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado!');
});

client.on('disconnected', () => {
    console.log('⚠️ Desconectado');
    isReady = false;
});

// Servidor web
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🚀 SPR WhatsApp</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 20px; 
                    background: #f0f0f0;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 15px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .qr-box { 
                    margin: 20px 0; 
                    padding: 20px; 
                    border: 3px dashed #25d366; 
                    border-radius: 15px; 
                    background: #f8fff8;
                }
                .status { 
                    padding: 15px; 
                    margin: 15px 0; 
                    border-radius: 10px; 
                    font-weight: bold;
                    font-size: 18px;
                }
                .connected { background: #d4edda; color: #155724; }
                .waiting { background: #fff3cd; color: #856404; }
                .generating { background: #cce5ff; color: #004085; }
                button { 
                    background: #25d366; 
                    color: white; 
                    border: none; 
                    padding: 12px 24px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-size: 16px; 
                    margin: 10px;
                }
                button:hover { background: #1ea952; }
                .qr-image { 
                    max-width: 300px; 
                    width: 100%; 
                    border: 2px solid #25d366; 
                    border-radius: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 SPR WhatsApp</h1>
                <h2>Porta 3002</h2>
                
                <div id="status" class="status generating">
                    ⏳ Gerando QR Code...
                </div>
                
                <div id="qr-area"></div>
                
                <button onclick="location.reload()">🔄 Atualizar</button>
                <button onclick="forceRestart()">🔄 Reiniciar</button>
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
                                status.innerHTML = '✅ WhatsApp Conectado com Sucesso!';
                                qrArea.innerHTML = '<p>🎉 SPR está pronto para enviar mensagens!</p>';
                            } else if (data.qr && data.qrImage) {
                                status.className = 'status waiting';
                                status.innerHTML = '📱 QR Code Disponível - Escaneie Agora!';
                                qrArea.innerHTML = \`
                                    <div class="qr-box">
                                        <h3>📱 Escaneie com seu WhatsApp:</h3>
                                        <img src="\${data.qrImage}" class="qr-image" alt="QR Code"/>
                                        <p><strong>Como conectar:</strong></p>
                                        <p>1. Abra o WhatsApp no celular</p>
                                        <p>2. Menu → Dispositivos conectados</p>
                                        <p>3. Conectar dispositivo</p>
                                        <p>4. Escaneie este QR Code</p>
                                    </div>
                                \`;
                            } else {
                                status.className = 'status generating';
                                status.innerHTML = '⏳ Gerando QR Code...';
                                qrArea.innerHTML = '<p>Aguarde alguns segundos...</p>';
                            }
                        })
                        .catch(err => {
                            document.getElementById('status').className = 'status';
                            document.getElementById('status').innerHTML = '❌ Erro de conexão';
                            console.error('Erro:', err);
                        });
                }
                
                function forceRestart() {
                    fetch('/api/restart', { method: 'POST' })
                        .then(() => {
                            document.getElementById('status').innerHTML = '🔄 Reiniciando...';
                            setTimeout(() => location.reload(), 3000);
                        });
                }
                
                // Atualizar a cada 2 segundos
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
        if (currentQR) {
            qrImage = await QRCode.toDataURL(currentQR);
        }
        
        res.json({
            connected: isReady,
            qr: currentQR,
            qrImage: qrImage,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro na API:', error);
        res.json({
            connected: false,
            qr: null,
            qrImage: null,
            error: error.message
        });
    }
});

app.post('/api/restart', async (req, res) => {
    res.json({ message: 'Reiniciando...' });
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando: http://localhost:${PORT}`);
    console.log('📱 Acesse para ver o QR Code!');
});

// Iniciar WhatsApp
console.log('🔄 Inicializando WhatsApp...');
client.initialize();

// Cleanup
process.on('SIGINT', async () => {
    console.log('\n🔄 Encerrando...');
    try {
        await client.destroy();
    } catch (error) {
        console.log('Erro ao encerrar:', error.message);
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error.message);
}); 