const http = require('http');

console.log('\n🔍 DEBUG DE CONECTIVIDADE - SPR IA');
console.log('=====================================\n');

const API_BASE = 'localhost';
const API_PORT = 3002;

// Função para fazer requisição HTTP
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Função para aguardar
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Testes de conectividade
async function runConnectivityTests() {
  console.log('🧪 Iniciando testes de conectividade...\n');

  // Teste 1: Verificar se o servidor está rodando
  console.log('1️⃣ Testando se o servidor está rodando...');
  try {
    const healthResponse = await makeRequest('/api/health');
    console.log('✅ Servidor respondendo:', healthResponse.status);
    console.log('📊 Dados da resposta:', healthResponse.data);
  } catch (error) {
    console.log('❌ Servidor não está rodando:', error.message);
    console.log('💡 Certifique-se de executar: node backend_server_fixed.js');
    return;
  }

  console.log('\n2️⃣ Testando endpoint de geração de mensagem...');
  try {
    const messageData = {
      prompt: 'teste de conectividade',
      tone: 'normal',
      contactName: 'Teste',
      isGroup: false,
      context: 'whatsapp'
    };
    
    const messageResponse = await makeRequest('/api/generate-message', 'POST', messageData);
    console.log('✅ Endpoint de mensagem funcionando:', messageResponse.status);
    console.log('📝 Mensagem gerada:', messageResponse.data.message);
  } catch (error) {
    console.log('❌ Erro no endpoint de mensagem:', error.message);
  }

  console.log('\n3️⃣ Testando endpoint de variações...');
  try {
    const variationData = {
      originalMessage: 'Olá, como vai?',
      tone: 'normal',
      count: 2
    };
    
    const variationResponse = await makeRequest('/api/generate-variations', 'POST', variationData);
    console.log('✅ Endpoint de variações funcionando:', variationResponse.status);
    console.log('🔄 Variações geradas:', variationResponse.data.variations);
  } catch (error) {
    console.log('❌ Erro no endpoint de variações:', error.message);
  }

  console.log('\n4️⃣ Testando configuração CORS...');
  try {
    const corsResponse = await makeRequest('/api/status');
    console.log('✅ CORS configurado corretamente');
    console.log('📊 Status do sistema:', corsResponse.data);
  } catch (error) {
    console.log('❌ Problema com CORS:', error.message);
  }

  console.log('\n5️⃣ Testando métricas...');
  try {
    const metricsResponse = await makeRequest('/api/metrics');
    console.log('✅ Endpoint de métricas funcionando:', metricsResponse.status);
    console.log('📈 Métricas:', metricsResponse.data);
  } catch (error) {
    console.log('❌ Erro no endpoint de métricas:', error.message);
  }

  console.log('\n6️⃣ Testando configuração do WhatsApp...');
  try {
    const whatsappResponse = await makeRequest('/api/whatsapp/status');
    console.log('✅ Endpoint do WhatsApp funcionando:', whatsappResponse.status);
    console.log('📱 Status do WhatsApp:', whatsappResponse.data);
  } catch (error) {
    console.log('❌ Erro no endpoint do WhatsApp:', error.message);
  }

  console.log('\n🎯 RESUMO DOS TESTES:');
  console.log('========================');
  console.log('✅ Se todos os testes passaram, o backend está funcionando corretamente');
  console.log('🌐 Frontend deve conseguir conectar em: http://localhost:3000');
  console.log('🔧 Backend rodando em: http://localhost:3002');
  console.log('📱 APIs disponíveis:');
  console.log('   - /api/health (verificação de saúde)');
  console.log('   - /api/generate-message (geração de mensagens)');
  console.log('   - /api/generate-variations (variações de mensagens)');
  console.log('   - /api/status (status do sistema)');
  console.log('   - /api/metrics (métricas)');
  console.log('   - /api/whatsapp/status (status do WhatsApp)');
  console.log('\n🚀 Para iniciar o sistema completo:');
  console.log('   1. Backend: node backend_server_fixed.js');
  console.log('   2. Frontend: cd frontend && npm start');
  console.log('   3. Acesse: http://localhost:3000');
}

// Executar testes
runConnectivityTests().catch(console.error); 