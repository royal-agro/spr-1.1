# ==============================================================================
# requirements.txt - Dependências Python para SPR 1.1
# ==============================================================================
PyJWT>=2.8.0
requests>=2.31.0
GitPython>=3.1.40
python-dotenv>=1.0.0

# ==============================================================================
# .env - Variáveis de ambiente (opcional)
# ==============================================================================
# Este arquivo é opcional - o script funciona sem ele
# Pode ser usado para configurações adicionais no futuro

# Exemplo de uso:
# GITHUB_TOKEN=seu_token_aqui (não necessário para GitHub App)
# DEBUG=true
# SPR_BASE_PATH=C:\Users\carlo\SPR 1.1\

# ==============================================================================
# install_dependencies.bat - Script de instalação Windows
# ==============================================================================
@echo off
echo 🚀 Instalando dependências SPR 1.1...
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python não encontrado. Instale Python 3.8+ primeiro.
    pause
    exit /b 1
)

REM Verificar se pip está instalado
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip não encontrado. Instale pip primeiro.
    pause
    exit /b 1
)

REM Instalar dependências
echo 📦 Instalando PyJWT...
pip install PyJWT>=2.8.0

echo 📦 Instalando requests...
pip install requests>=2.31.0

echo 📦 Instalando GitPython...
pip install GitPython>=3.1.40

echo 📦 Instalando python-dotenv...
pip install python-dotenv>=1.0.0

echo.
echo ✅ Todas as dependências foram instaladas!
echo.
echo 🔧 Para executar o script:
echo    python spr_github_sync.py
echo.
pause

# ==============================================================================
# install_dependencies.sh - Script de instalação Linux/Mac
# ==============================================================================
#!/bin/bash

echo "🚀 Instalando dependências SPR 1.1..."
echo ""

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Instale Python 3.8+ primeiro."
    exit 1
fi

# Verificar se pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 não encontrado. Instale pip primeiro."
    exit 1
fi

# Instalar dependências
echo "📦 Instalando PyJWT..."
pip3 install PyJWT>=2.8.0

echo "📦 Instalando requests..."
pip3 install requests>=2.31.0

echo "📦 Instalando GitPython..."
pip3 install GitPython>=3.1.40

echo "📦 Instalando python-dotenv..."
pip3 install python-dotenv>=1.0.0

echo ""
echo "✅ Todas as dependências foram instaladas!"
echo ""
echo "🔧 Para executar o script:"
echo "   python3 spr_github_sync.py"
echo ""

# ==============================================================================
# run_spr_sync.bat - Script de execução Windows
# ==============================================================================
@echo off
title SPR 1.1 - Sincronização GitHub
echo.
echo 🌾 SPR 1.1 - Sistema de Previsão Rural
echo 🔄 Sincronização com GitHub
echo.
echo ========================================
echo.

REM Executar script Python
python spr_github_sync.py

echo.
echo ========================================
echo.
echo Pressione qualquer tecla para sair...
pause >nul

# ==============================================================================
# run_spr_sync.sh - Script de execução Linux/Mac
# ==============================================================================
#!/bin/bash

echo ""
echo "🌾 SPR 1.1 - Sistema de Previsão Rural"
echo "🔄 Sincronização com GitHub"
echo ""
echo "========================================"
echo ""

# Executar script Python
python3 spr_github_sync.py

echo ""
echo "========================================"
echo ""
echo "Pressione Enter para sair..."
read -r