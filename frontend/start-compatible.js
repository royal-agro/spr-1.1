#!/usr/bin/env node

// Script de inicialização compatível com Node.js 22+
// Configurações para resolver problemas de compatibilidade

const { spawn } = require('child_process');
const path = require('path');

// Configurar variáveis de ambiente para compatibilidade
process.env.NODE_OPTIONS = '--openssl-legacy-provider --max-old-space-size=8192';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.ESLINT_NO_DEV_ERRORS = 'true';
process.env.TSC_COMPILE_ON_ERROR = 'true';
process.env.REACT_APP_FAST_REFRESH = 'false';

console.log('🚀 Iniciando SPR Frontend com compatibilidade Node.js 22...');
console.log('📦 Node.js version:', process.version);
console.log('🔧 NODE_OPTIONS:', process.env.NODE_OPTIONS);

// Executar react-scripts start
const child = spawn('npx', ['react-scripts', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('error', (error) => {
  console.error('❌ Erro ao iniciar:', error);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`🏁 Processo finalizado com código: ${code}`);
  process.exit(code);
});

// Tratamento de sinais
process.on('SIGINT', () => {
  console.log('\n🛑 Parando servidor...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminando servidor...');
  child.kill('SIGTERM');
}); 