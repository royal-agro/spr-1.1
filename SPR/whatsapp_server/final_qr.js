const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = 3002;

let currentQR = null;
let isConnected = false;
let client = null;

console.log('🚀 SPR WhatsApp Final - Porta 3002');

function initializeWhatsApp() {
    try {
        client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './sessions_final_' + Date.now()
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage'
                ]
            }
        });

        client.on('qr', (qr) => {
            console.log('\n🎯 QR CODE GERADO!');
            console.log('📱 Escaneie com WhatsApp:');
            console.log('='.repeat(50));
            qrcode.generate(qr, { small: true });
            console.log('='.repeat(50));
            console.log('🌐 Acesse: http://localhost:3002');
            
            currentQR = qr;
            isConnected = false;
        });

        client.on('ready', () => {
            console.log('✅ WhatsApp conectado com sucesso!');
            console.log('🎉 SPR está pronto para enviar mensagens!');
            isConnected = true;
            currentQR = null;
        });

        client.on('authenticated', () => {
            console.log('🔐 Autenticado com sucesso!');
        });

        client.on('disconnected', () => {
            console.log('⚠️ WhatsApp desconectado');
            isConnected = false;
            currentQR = null;
        });

        client.on('auth_failure', (msg) => {
            console.error('❌ Falha na autenticação:', msg);
            currentQR = null;
        });

        console.log('🔄 Inicializando cliente WhatsApp...');
        client.initialize();

    } catch (error) {
        console.error('❌ Erro ao inicializar WhatsApp:', error);
    }
}

// Servidor web
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🚀 SPR WhatsApp Final</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 20px; 
                    background: linear-gradient(135deg, #25d366, #128c7e);
                    min-height: 100vh;
                    margin: 0;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 20px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                .header {
                    background: #25d366;
                    color: white;
                    padding: 20px;
                    border-radius: 15px;
                    margin-bottom: 20px;
                }
                .qr-box { 
                    margin: 20px 0; 
                    padding: 30px; 
                    border: 3px dashed #25d366; 
                    border-radius: 15px; 
                    background: #f8fff8;
                }
                .status { 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-radius: 15px; 
                    font-weight: bold;
                    font-size: 18px;
                }
                .connected { 
                    background: #d4edda; 
                    color: #155724; 
                    border: 2px solid #c3e6cb;
                }
                .waiting { 
                    background: #fff3cd; 
                    color: #856404; 
                    border: 2px solid #ffeaa7;
                }
                .generating { 
                    background: #cce5ff; 
                    color: #004085; 
                    border: 2px solid #74b9ff;
                }
                button { 
                    background: #25d366; 
                    color: white; 
                    border: none; 
                    padding: 15px 30px; 
                    border-radius: 10px; 
                    cursor: pointer; 
                    font-size: 16px; 
                    margin: 10px;
                    transition: all 0.3s;
                }
                button:hover { 
                    background: #1ea952; 
                    transform: translateY(-2px);
                }
                .qr-image { 
                    max-width: 300px; 
                    width: 100%; 
                    border: 3px solid #25d366; 
                    border-radius: 15px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                }
                .instructions {
                    background: #e8f5e8;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                }
                .timestamp {
                    color: #666;
                    font-size: 12px;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 SPR WhatsApp</h1>
                    <h2>Sistema de Previsão Rural</h2>
                    <p>Porta 3002</p>
                </div>
                
                <div id="status" class="status generating">
                    ⏳ Carregando status...
                </div>
                
                <div id="qr-area"></div>
                
                <div class="instructions">
                    <h3>📱 Como conectar:</h3>
                    <p>1. Abra o <strong>WhatsApp</strong> no seu celular</p>
                    <p>2. Vá em <strong>Menu (⋮)</strong> → <strong>Dispositivos conectados</strong></p>
                    <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                    <p>4. <strong>Escaneie o QR Code</strong> que aparecerá abaixo</p>
                </div>
                
                <button onclick="location.reload()">🔄 Atualizar</button>
                <button onclick="forceRestart()">🔄 Reiniciar WhatsApp</button>
                
                <div class="timestamp" id="lastUpdate"></div>
            </div>
            
            <script>
                function updateStatus() {
                    const now = new Date().toLocaleTimeString();
                    document.getElementById('lastUpdate').textContent = 'Última atualização: ' + now;
                    
                    fetch('/api/status')
                        .then(response => {
                            if (!response.ok) throw new Error('Erro na resposta');
                            return response.json();
                        })
                        .then(data => {
                            console.log('Status recebido:', data);
                            const status = document.getElementById('status');
                            const qrArea = document.getElementById('qr-area');
                            
                            if (data.connected) {
                                status.className = 'status connected';
                                status.innerHTML = '✅ WhatsApp Conectado com Sucesso!<br><small>SPR está pronto para enviar mensagens</small>';
                                qrArea.innerHTML = '<div class="qr-box"><h3>🎉 Conexão Estabelecida!</h3><p>O sistema está funcionando perfeitamente.</p></div>';
                            } else if (data.qr && data.qrImage) {
                                status.className = 'status waiting';
                                status.innerHTML = '📱 QR Code Disponível - Escaneie Agora!';
                                qrArea.innerHTML = \`
                                    <div class="qr-box">
                                        <h3>📱 Escaneie este QR Code:</h3>
                                        <img src="\${data.qrImage}" class="qr-image" alt="QR Code WhatsApp"/>
                                        <p><strong>⚠️ QR Code expira em alguns minutos!</strong></p>
                                    </div>
                                \`;
                            } else {
                                status.className = 'status generating';
                                status.innerHTML = '⏳ Gerando QR Code...<br><small>Aguarde alguns segundos</small>';
                                qrArea.innerHTML = '<div class="qr-box"><p>🔄 Preparando conexão WhatsApp...</p></div>';
                            }
                        })
                        .catch(error => {
                            console.error('Erro:', error);
                            document.getElementById('status').className = 'status';
                            document.getElementById('status').innerHTML = '❌ Erro de conexão com o servidor';
                        });
                }
                
                function forceRestart() {
                    document.getElementById('status').innerHTML = '🔄 Reiniciando WhatsApp...';
                    fetch('/api/restart', { method: 'POST' })
                        .then(() => {
                            setTimeout(() => location.reload(), 3000);
                        })
                        .catch(() => {
                            alert('Erro ao reiniciar. Atualize a página manualmente.');
                        });
                }
                
                // Atualizar a cada 3 segundos
                setInterval(updateStatus, 3000);
                updateStatus(); // Atualizar imediatamente
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
        
        const response = {
            connected: isConnected,
            qr: currentQR ? 'presente' : null,
            qrImage: qrImage,
            timestamp: new Date().toISOString(),
            server: 'SPR WhatsApp Final'
        };
        
        console.log('Status enviado:', { connected: isConnected, hasQR: !!currentQR });
        res.json(response);
    } catch (error) {
        console.error('Erro na API status:', error);
        res.status(500).json({
            connected: false,
            qr: null,
            qrImage: null,
            error: error.message
        });
    }
});

app.post('/api/restart', async (req, res) => {
    try {
        res.json({ message: 'Reiniciando WhatsApp...' });
        
        if (client) {
            await client.destroy();
        }
        
        setTimeout(() => {
            initializeWhatsApp();
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao reiniciar:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando: http://localhost:${PORT}`);
    console.log('📱 Acesse para ver o QR Code!');
    console.log('🔄 Inicializando WhatsApp...');
    
    // Inicializar WhatsApp após 1 segundo
    setTimeout(initializeWhatsApp, 1000);
});

// Cleanup
process.on('SIGINT', async () => {
    console.log('\n🔄 Encerrando servidor...');
    try {
        if (client) {
            await client.destroy();
        }
    } catch (error) {
        console.log('Erro ao encerrar:', error.message);
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Erro não tratado:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
}); 