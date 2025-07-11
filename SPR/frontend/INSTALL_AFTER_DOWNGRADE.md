# 🚀 GUIA PÓS-DOWNGRADE NODE.JS 18

## ✅ VERIFICAÇÃO INICIAL
```powershell
node --version  # Deve mostrar v18.x.x
npm --version   # Deve mostrar 9.x.x ou 10.x.x
```

## 🧹 LIMPEZA COMPLETA
```powershell
# Navegar para o frontend
cd SPR/frontend

# Limpar cache npm
npm cache clean --force

# Remover node_modules e package-lock.json
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue
```

## 📦 REINSTALAÇÃO
```powershell
# Instalar dependências
npm install

# Verificar se instalou corretamente
npm list react react-dom
```

## 🚀 INICIALIZAÇÃO
```powershell
# Iniciar servidor (deve funcionar perfeitamente)
npm start
```

## 🎯 RESULTADO ESPERADO
- ✅ Servidor iniciando na porta 3000
- ✅ Compilação sem erros
- ✅ React hooks funcionando
- ✅ Hot reload ativo
- ✅ Interface acessível em http://localhost:3000

## 🔧 SE AINDA HOUVER PROBLEMAS
```powershell
# Forçar reinstalação
npm install --force

# Ou com legacy peer deps
npm install --legacy-peer-deps
```

## 📱 TESTAR MULTI-INSTÂNCIA WHATSAPP
Após o frontend funcionar:
1. Navegue para SPR/whatsapp_server
2. Execute: npm run multi
3. Acesse: http://localhost:3000 (WhatsApp)
4. Crie instâncias com IDs únicos

---
**🏆 Com Node.js 18, todos os problemas serão resolvidos!** 