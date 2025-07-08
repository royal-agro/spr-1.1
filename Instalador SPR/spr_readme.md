# 🚀 Instalador Automático SPR 1.1 - Royal Agro

Sistema de automação completa para configuração do ambiente de trabalho do operador Tarcis, permitindo execução local do SPR 1.1 em máquinas Windows.

## 📋 Visão Geral

Este sistema automatiza completamente a instalação e configuração do ambiente SPR 1.1, incluindo:

- ✅ Instalação automática de software (Git, GitHub Desktop, Python 3.12)
- ✅ Clonagem do repositório privado `royal-Agro/spr-main`
- ✅ Configuração de variáveis de ambiente
- ✅ Instalação de dependências Python
- ✅ Geração e configuração de chaves SSH
- ✅ Criação de atalhos no desktop
- ✅ Documentação completa de uso
- ✅ Verificação automática do sistema

## 🖥️ Requisitos

- **Sistema:** Windows 10 ou 11
- **Permissões:** Conta com privilégios de administrador
- **Internet:** Conexão estável para downloads
- **Espaço:** ~2GB de espaço livre em disco

## ⚡ Instalação Rápida (10 minutos)

### Opção 1: Execução Direta (Recomendado)

1. **Abra PowerShell como Administrador**
   ```
   Clique com botão direito no PowerShell → "Executar como administrador"
   ```

2. **Execute o comando de instalação**
   ```powershell
   # Cole todo o script do arquivo "Instalador Completo SPR 1.1" no PowerShell
   # e pressione ENTER
   ```

3. **Aguarde a conclusão** (5-10 minutos)

4. **Configure os secrets**
   - Edite `C:\SPR 1.1\spr-main\.env`
   - Substitua `[INSIRA_SEU_SEGREDO_AQUI]` pelo valor real

5. **Inicie o sistema**
   - Use o atalho "Abrir SPR" no desktop

### Opção 2: Salvar Script e Executar

1. **Salve o script**
   - Copie o conteúdo de "Instalador Completo SPR 1.1"
   - Salve como `instalar_spr.ps1`

2. **Execute como administrador**
   ```powershell
   powershell -ExecutionPolicy Bypass -File "instalar_spr.ps1"
   ```

## 🔧 Opções Avançadas

### Configuração SSH Automática

Para configurar chaves SSH automaticamente no GitHub e DigitalOcean:

```powershell
# Com tokens de API
./instalar_spr.ps1 -GitHubToken "seu_token_github" -DigitalOceanToken "seu_token_digitalocean"

# Ou será solicitado durante a execução
```

### Opções de Execução

```powershell
# Pular instalação de software (se já instalado)
./instalar_spr.ps1 -SkipSoftware

# Pular configuração SSH  
./instalar_spr.ps1 -SkipSSH

# Combinado
./instalar_spr.ps1 -SkipSoftware -SkipSSH
```

## 📁 Estrutura Criada

Após a instalação, a seguinte estrutura será criada:

```
C:\SPR 1.1\
├── spr-main/                  # 📦 Código fonte do projeto
│   ├── main.py               # 🐍 Arquivo principal Python
│   ├── .env                  # ⚙️ Variáveis de ambiente
│   ├── requirements.txt      # 📋 Dependências Python
│   └── ...                   # Outros arquivos do projeto
├── .ssh/                     # 🔐 Chaves SSH
│   ├── id_rsa               # Chave privada
│   └── id_rsa.pub           # Chave pública
├── logs/                     # 📄 Logs do sistema
│   ├── setup.log            # Log de instalação
│   └── ssh_setup.log        # Log de configuração SSH
├── start_spr.ps1            # 🚀 Script de inicialização
├── GUIA_DE_USO.md           # 📖 Documentação completa
└── Instruções_SPR.txt       # 📝 Instruções rápidas
```

## 🔑 Configuração de Chaves SSH

### GitHub
1. Acesse: https://github.com/settings/ssh/new
2. Cole o conteúdo de `C:\SPR 1.1\.ssh\id_rsa.pub`
3. Dê um nome descritivo (ex: "SPR-Tarcis-2025")

### DigitalOcean
1. Acesse: https://cloud.digitalocean.com/account/security
2. Clique em "Add SSH Key"
3. Cole a mesma chave SSH
4. Dê um nome descritivo

## ⚙️ Configuração das Variáveis

Edite o arquivo `C:\SPR 1.1\spr-main\.env`:

```env
GITHUB_APP_ID=1548838
GITHUB_INSTALLATION_ID=74840214
GITHUB_PRIVATE_KEY_PATH=C:\SPR 1.1\github_pulso_app.pem
WHATSAPP_KEY=sprwhatsapp
DIGITALOCEAN_SECRET=seu_secret_real_aqui
```

**IMPORTANTE:** Substitua `[INSIRA_SEU_SEGREDO_AQUI]` pelo valor real do `DIGITALOCEAN_SECRET`.

## 🚀 Como Usar

### Iniciar o Sistema
- **Método 1:** Clique duas vezes no atalho "Abrir SPR" no desktop
- **Método 2:** Execute `C:\SPR 1.1\start_spr.ps1`
- **Método 3:** Via PowerShell:
  ```powershell
  cd "C:\SPR 1.1\spr-main"
  python main.py
  ```

### Parar o Sistema
- Pressione `Ctrl+C` no terminal

### Atualizar o Projeto
```powershell
cd "C:\SPR 1.1\spr-main"
git pull origin main
pip install -r requirements.txt
```

## 🛠️ Verificação do Sistema

Para verificar se tudo está funcionando:

```powershell
# Execute o script de verificação (cole o código do "Script de Verificação")
```

Ou teste manualmente:
```powershell
# Testar Python
cd "C:\SPR 1.1\spr-main"
python --version
python -c "import requests; print('OK')"

# Testar Git
git --version
git status

# Testar SSH
ssh -T git@github.com
```

## 🐛 Solução de Problemas

### Erro: "Execution Policy"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro: "Python não encontrado"
```powershell
# Reinstalar Python
choco install python312 -y
refreshenv
```

### Erro: "Git não encontrado" 
```powershell
# Reinstalar Git
choco install git -y
refreshenv
```

### Erro: "Falha ao clonar repositório"
- Verifique conexão com internet
- Confirme acesso ao repositório privado
- Teste: `git clone https://github.com/royal-Agro/spr-main`

### Erro: "SSH não funciona"
```powershell
# Regenerar chaves SSH
ssh-keygen -t rsa -b 4096 -f "C:\SPR 1.1\.ssh\id_rsa" -N ""

# Testar conexão
ssh -T git@github.com -v
```

### Erro: "Dependências Python"
```powershell
cd "C:\SPR 1.1\spr-main"
python -m pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## 📊 Logs e Diagnóstico

### Arquivos de Log
- **Instalação:** `C:\SPR 1.1\logs\setup.log`
- **SSH:** `C:\SPR 1.1\logs\ssh_setup.log`
- **Sistema:** Exibido no terminal durante execução

### Comandos de Diagnóstico
```powershell
# Verificar instalação
Get-Command git, python, ssh

# Verificar packages Python
cd "C:\SPR 1.1\spr-main"
pip list

# Verificar chaves SSH
ls "C:\SPR 1.1\.ssh\"

# Verificar configuração
cat "C:\SPR 1.1\spr-main\.env"
```

## 🔄 Rotina de Uso Diário

1. **Início do dia:** Clique em "Abrir SPR"
2. **Durante o trabalho:** Use o sistema normalmente
3. **Fim do dia:** Pressione `Ctrl+C` para parar
4. **Atualizações:** Execute `git pull` quando necessário

## 📞 Suporte

### Verificações Básicas
1. ✅ Verifique se tem privilégios de administrador
2. ✅ Confirme conexão com internet
3. ✅ Verifique logs de erro
4. ✅ Teste comandos básicos (Python, Git, SSH)

### Contato
- 📧 **Equipe TI:** Entre em contato com a equipe de TI
- 📄 **Documentação:** Consulte `C:\SPR 1.1\GUIA_DE_USO.md`
- 🔍 **Logs:** Sempre inclua o conteúdo de `setup.log` em relatórios

## 🏷️ Versão e Changelog

- **v1.0** (2025-07-08)
  - Instalação automática completa
  - Configuração SSH automática
  - Verificação de sistema
  - Documentação completa
  - Suporte a tokens de API
  - Interface colorida e amigável

---

**Desenvolvido para Royal Agro - Operador Tarcis**  
**Sistema SPR 1.1 - Automação Completa**