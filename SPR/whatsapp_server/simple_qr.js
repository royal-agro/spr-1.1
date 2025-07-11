const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Não limpar sessões para evitar erro EBUSY
console.log('⚠️ Mantendo sessões existentes para evitar conflitos');

console.log('🚀 Iniciando WhatsApp...');
console.log('📱 Aguarde o QR Code aparecer...');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
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
    console.log('\n📱 QR CODE GERADO! Escaneie com seu WhatsApp:');
    console.log('=' * 50);
    qrcode.generate(qr, { small: true });
    console.log('=' * 50);
    console.log('📱 Abra o WhatsApp > Menu > Dispositivos conectados > Conectar dispositivo');
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso!');
    console.log('🎉 SPR está pronto para enviar mensagens!');
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    console.log('🔄 Reiniciando...');
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.warn('⚠️ WhatsApp desconectado:', reason);
});

// Inicializar
client.initialize();

// Ctrl+C para sair
process.on('SIGINT', async () => {
    console.log('\n🔄 Desligando...');
    await client.destroy();
    process.exit(0);
}); 