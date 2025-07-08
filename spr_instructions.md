# 🌾 SPR 1.1 - Sistema de Previsão Rural
## 🔄 Sincronização Automática com GitHub

### 📋 Resumo
Este sistema automatiza completamente a sincronização entre sua pasta local `SPR/` e o repositório GitHub `royal-Agro/spr-main` usando autenticação GitHub App.

### 🗂️ Estrutura de Arquivos Necessária
```
C:\Users\carlo\SPR 1.1\
├── spr_github_sync.py          # Script principal
├── github_pulso_app.json       # Configuração GitHub App
├── github_pulso_app.pem        # Chave privada GitHub App
├── requirements.txt            # Dependências Python
├── .env                        # Variáveis ambiente (opcional)
├── install_dependencies.bat    # Instalador Windows
├── run_spr_sync.bat           # Executar no Windows
└── SPR/                       # Pasta com código fonte
    ├── arquivo1.py
    ├── arquivo2.py
    └── ...
```

### 🚀 Instalação Rápida

#### 1. Instalar Dependências
**Windows:**
```batch
install_dependencies.bat
```

**Linux/Mac:**
```bash
chmod +x install_dependencies.sh
./install_dependencies.sh
```

**Manual:**
```bash
pip install PyJWT>=2.8.0 requests>=2.31.0 GitPython>=3.1.40 python-dotenv>=1.0.0
```

#### 2. Configurar GitHub App
Certifique-se de que `github_pulso_app.json` contém:
- `app_id`: ID do GitHub App
- `installation_id`: ID da instalação
- Outros campos conforme exemplo

#### 3. Verificar Chave Privada
O arquivo `github_pulso_app.pem` deve estar presente e acessível.

### 🎯 Execução

#### Método 1: Scripts Automatizados
**Windows:**
```batch
run_spr_sync.bat
```

**Linux/Mac:**
```bash
chmod +x run_spr_sync.sh
./run_spr_sync.sh
```

#### Método 2: Linha de Comando
```bash
python spr_github_sync.py
```

### 🔧 Funcionamento Detalhado

#### 1. Autenticação GitHub App
- Gera JWT usando `app_id` + chave privada `.pem`
- Obtém token de instalação via GitHub API
- Token válido por 1 hora

#### 2. Operações Git
- Clona `royal-Agro/spr-main` em diretório temporário
- Copia todo conteúdo de `SPR/` para o repositório
- Faz commit: `"Pulso: commit inicial SPR 1.1"`
- Push automático usando token

#### 3. Limpeza
- Remove diretório temporário
- Libera recursos

### 📊 Saída do Script
```
🚀 Iniciando sincronização SPR 1.1...
==================================================
✅ SPR GitHub Sync inicializado
📁 Base: C:\Users\carlo\SPR 1.1
🔑 App ID: 123456
📦 Repositório: https://github.com/royal-Agro/spr-main
✅ Todos os arquivos necessários encontrados
✅ JWT gerado com sucesso
🔄 Obtendo token de instalação...
✅ Token de instalação obtido
⏰ Expira em: 2025-07-07T01:00:00Z
🔄 Clonando repositório...
📁 Destino: /tmp/spr_sync_abc123/spr-main
✅ Repositório clonado com sucesso
🔄 Copiando arquivos SPR...
📁 Origem: C:\Users\carlo\SPR 1.1\SPR
📁 Destino: /tmp/spr_sync_abc123/spr-main
   📄 main.py
   📄 config.py
   📁 models/
   📁 utils/
✅ Arquivos copiados com sucesso
🔄 Preparando commit...
✅ Commit criado: a1b2c3d4
🔄 Fazendo push...
✅ Push realizado com sucesso
🧹 Diretório temporário removido
==================================================
🎉 Sincronização concluída com sucesso!
⏱️  Tempo total: 15.42 segundos
🔗 Repositório: https://github.com/royal-Agro/spr-main
```

### 🔐 Segurança
- **Chave privada**: Nunca commite o arquivo `.pem`
- **Tokens**: Gerados dinamicamente, expiram em 1 hora
- **Credenciais**: Armazenadas localmente apenas
- **Autenticação**: Via GitHub App (mais seguro que tokens pessoais)

### 🛠️ Personalização

#### Alterar mensagem de commit:
```python
# Linha 259 no spr_github_sync.py
commit_message = "Sua mensagem personalizada"
```

#### Alterar pasta fonte:
```python
# Linha 30 no spr_github_sync.py
self.spr_source_path = self.base_path / "SuaPasta"
```

#### Alterar repositório:
```python
# Linha 26 no spr_github_sync.py
self.repo_url = "https://github.com/usuario/repo"
```

### ❌ Solução de Problemas

#### Erro: "Arquivos não encontrados"
- Verifique se `github_pulso_app.json` e `.pem` existem
- Confirme se pasta `SPR/` existe

#### Erro: "JWT inválido"
- Verifique `app_id` no JSON
- Confirme se chave privada está correta
- Redefina horário do sistema

#### Erro: "Token de instalação negado"
- Verifique `installation_id` no JSON
- Confirme se GitHub App tem permissões corretas
- Verifique se app está instalado no repositório

#### Erro: "Push rejeitado"
- Confirme permissões de escrita no repositório
- Verifique se branch main existe
- Teste manualmente: `git push origin main`

### 🔄 Automação Avançada

#### Agendar execução (Windows):
```batch
# Criar tarefa no Agendador de Tarefas
schtasks /create /sc daily /st 09:00 /tn "SPR Sync" /tr "C:\Users\carlo\SPR 1.1\run_spr_sync.bat"
```

#### Agendar execução (Linux):
```bash
# Adicionar ao crontab
0 9 * * * /path/to/spr_sync.sh
```

### 📞 Suporte
- **Logs**: Salvos automaticamente em caso de erro
- **Debug**: Ative `DEBUG=true` no arquivo `.env`
- **Contato**: spr-pulso@royal-agro.com

### 🎯 Próximos Passos
1. Execute o script uma vez manualmente
2. Verifique se commit apareceu no GitHub
3. Configure automação se necessário
4. Integre com CI/CD se desejado

---
**SPR 1.1 - Sistema de Previsão Rural** | **Royal Agro** | **2025**