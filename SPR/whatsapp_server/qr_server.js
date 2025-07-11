const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Limpar sessões antigas
try {
    if (fs.existsSync('./sessions')) {
        fs.rmSync('./sessions', { recursive: true, force: true });
    }
} catch (error) {
    console.log('Erro ao limpar sessões:', error.message);
}

// Criar diretórios
const dirs = ['sessions', 'qrcodes'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

let qrCodeData = null;
let isReady = false;

// Inicializar cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
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
            '--disable-gpu'
        ]
    }
});

// Eventos do WhatsApp
client.on('qr', async (qr) => {
    console.log('📱 QR Code gerado!');
    qrCodeData = qr;
    
    // Mostrar no terminal
    qrcodeTerminal.generate(qr, { small: true });
    
    // Salvar como imagem
    try {
        const qrImage = await qrcode.toDataURL(qr);
        fs.writeFileSync('./qrcodes/qr_latest.png', qrImage.split(',')[1], 'base64');
        console.log('💾 QR Code salvo em: ./qrcodes/qr_latest.png');
    } catch (error) {
        console.error('Erro ao salvar QR:', error);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
    isReady = true;
    qrCodeData = null;
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.warn('⚠️ WhatsApp desconectado:', reason);
    isReady = false;
});

// Rotas da API
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SPR WhatsApp QR Code</title>
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
                    max-width: 500px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .qr-container {
                    margin: 20px 0;
                    padding: 20px;
                    border: 2px dashed #25d366;
                    border-radius: 10px;
                    background: #f9f9f9;
                }
                .status {
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                    font-weight: bold;
                }
                .waiting { background: #fff3cd; color: #856404; }
                .ready { background: #d4edda; color: #155724; }
                .error { background: #f8d7da; color: #721c24; }
                button {
                    background: #25d366;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                button:hover { background: #1ea952; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 SPR WhatsApp</h1>
                <div id="status" class="status waiting">
                    📱 Gerando QR Code...
                </div>
                
                <div id="qr-container" class="qr-container" style="display: none;">
                    <h3>📱 Escaneie com seu WhatsApp:</h3>
                    <img id="qr-image" style="max-width: 300px; width: 100%;" />
                    <p><small>Abra o WhatsApp > Menu > Dispositivos conectados > Conectar dispositivo</small></p>
                </div>
                
                <div id="success" style="display: none;">
                    <h3>✅ WhatsApp Conectado!</h3>
                    <p>O SPR está pronto para enviar mensagens.</p>
                </div>
                
                <button onclick="window.location.reload()">🔄 Atualizar</button>
                <button onclick="forceNewQR()">📱 Novo QR Code</button>
            </div>
            
            <script>
                function checkStatus() {
                    fetch('/api/status')
                        .then(r => r.json())
                        .then(data => {
                            const status = document.getElementById('status');
                            const qrContainer = document.getElementById('qr-container');
                            const success = document.getElementById('success');
                            
                            if (data.isReady) {
                                status.className = 'status ready';
                                status.textContent = '✅ WhatsApp Conectado!';
                                qrContainer.style.display = 'none';
                                success.style.display = 'block';
                            } else if (data.hasQR) {
                                status.className = 'status waiting';
                                status.textContent = '📱 QR Code disponível - escaneie para conectar';
                                qrContainer.style.display = 'block';
                                success.style.display = 'none';
                                
                                fetch('/api/qr')
                                    .then(r => r.json())
                                    .then(qr => {
                                        if (qr.qrDataURL) {
                                            document.getElementById('qr-image').src = qr.qrDataURL;
                                        }
                                    });
                            } else {
                                status.className = 'status waiting';
                                status.textContent = '⏳ Aguardando QR Code...';
                                qrContainer.style.display = 'none';
                                success.style.display = 'none';
                            }
                        })
                        .catch(err => {
                            document.getElementById('status').className = 'status error';
                            document.getElementById('status').textContent = '❌ Erro de conexão';
                        });
                }
                
                function forceNewQR() {
                    fetch('/api/restart', { method: 'POST' })
                        .then(() => {
                            setTimeout(() => window.location.reload(), 2000);
                        });
                }
                
                // Verificar status a cada 3 segundos
                setInterval(checkStatus, 3000);
                checkStatus(); // Verificar imediatamente
            </script>
        </body>
        </html>
    `);
});

app.get('/api/status', (req, res) => {
    res.json({
        isReady: isReady,
        hasQR: !!qrCodeData
    });
});

app.get('/api/qr', async (req, res) => {
    if (qrCodeData) {
        try {
            const qrDataURL = await qrcode.toDataURL(qrCodeData);
            res.json({ 
                qr: qrCodeData,
                qrDataURL: qrDataURL
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar QR Code' });
        }
    } else {
        res.status(404).json({ error: 'QR Code não disponível' });
    }
});

app.post('/api/restart', (req, res) => {
    res.json({ message: 'Reiniciando...' });
    
    // Reiniciar cliente
    setTimeout(async () => {
        try {
            await client.destroy();
            
            // Limpar sessões
            if (fs.existsSync('./sessions')) {
                fs.rmSync('./sessions', { recursive: true, force: true });
            }
            
            // Reinicializar
            setTimeout(() => {
                client.initialize();
            }, 1000);
            
        } catch (error) {
            console.error('Erro ao reiniciar:', error);
        }
    }, 500);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌐 Servidor QR rodando em: http://localhost:${PORT}`);
    console.log('📱 Acesse para ver o QR Code do WhatsApp');
});

// Inicializar WhatsApp
console.log('🚀 Inicializando WhatsApp...');
client.initialize();

// Handlers de shutdown
process.on('SIGINT', async () => {
    console.log('🔄 Desligando...');
    await client.destroy();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro:', error.message);
}); 