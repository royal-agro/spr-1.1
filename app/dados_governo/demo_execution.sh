#!/bin/bash
# SPR 1.1 - Demonstração de Execução Completa
# Este script demonstra como executar o pipeline completo

set -e  # Para em caso de erro

echo "🌾 SPR 1.1 - Demonstração de Execução Completa"
echo "=============================================="
echo ""

# Função para logging colorido
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "pyproject.toml" ] || [ ! -d "SPR1.1" ]; then
    log_error "Execute este script no diretório que contém SPR1.1/"
    exit 1
fi

log_info "Iniciando demonstração do SPR 1.1..."

# 1. Setup do ambiente
echo ""
echo "📋 Etapa 1: Setup do Ambiente"
echo "------------------------------"

if [ ! -d "venv" ]; then
    log_info "Criando ambiente virtual..."
    python -m venv venv
    log_success "Ambiente virtual criado"
else
    log_info "Ambiente virtual já existe"
fi

# Ativar ambiente virtual
log_info "Ativando ambiente virtual..."
source venv/bin/activate || {
    log_error "Falha ao ativar ambiente virtual"
    exit 1
}

# Instalar dependências
log_info "Instalando dependências..."
pip install -e . > /tmp/pip_install.log 2>&1 || {
    log_error "Falha na instalação das dependências"
    cat /tmp/pip_install.log
    exit 1
}
log_success "Dependências instaladas"

# 2. Inicialização
echo ""
echo "🏗️  Etapa 2: Inicialização"
echo "-------------------------"

cd SPR1.1

log_info "Inicializando estrutura SPR..."
python -m jobs.cli init
log_success "Estrutura inicializada"

# 3. Verificação de status
echo ""
echo "🔍 Etapa 3: Verificação de Status"
echo "--------------------------------"

log_info "Verificando status dos conectores..."
python -m jobs.cli status

# 4. Sincronização INMET (exemplo com dados limitados)
echo ""
echo "🌡️  Etapa 4: Sincronização INMET"
echo "-------------------------------"

log_info "Sincronizando catálogo de estações..."
if python -m jobs.cli inmet sync-estacoes; then
    log_success "Estações INMET sincronizadas"
else
    log_warning "Problema na sincronização de estações (pode ser conectividade)"
fi

log_info "Sincronizando séries diárias (últimos 7 dias, MT)..."
INICIO=$(date -d '7 days ago' +%Y-%m-%d)
FIM=$(date +%Y-%m-%d)

if python -m jobs.cli inmet sync-series --inicio $INICIO --fim $FIM --freq D --uf MT; then
    log_success "Séries INMET sincronizadas"
else
    log_warning "Problema na sincronização de séries (pode ser conectividade ou falta de dados)"
fi

# 5. Sincronização MAPA (discovery apenas)
echo ""
echo "🌾 Etapa 5: Discovery MAPA-CKAN"
echo "------------------------------"

log_info "Descobrindo datasets MAPA disponíveis..."
if python -m jobs.cli mapa discover; then
    log_success "Discovery MAPA concluído"
else
    log_warning "Problema no discovery MAPA (pode ser conectividade)"
fi

# Tentar baixar um dataset pequeno
log_info "Tentando baixar dataset ZARC..."
if python -m jobs.cli mapa sync-zarc; then
    log_success "ZARC baixado"
else
    log_warning "Problema no download ZARC (pode ser conectividade ou dataset não encontrado)"
fi

# 6. Sincronização CONAB (exemplo limitado)
echo ""
echo "💰 Etapa 6: Sincronização CONAB"
echo "------------------------------"

log_info "Sincronizando safras CONAB..."
if python -m jobs.cli conab sync-safras; then
    log_success "Safras CONAB sincronizadas"
else
    log_warning "Problema na sincronização de safras (pode ser conectividade)"
fi

log_info "Sincronizando preços (última semana, soja/milho, produtor)..."
if python -m jobs.cli conab sync-precos --produto soja,milho --nivel produtor --inicio $INICIO --fim $FIM; then
    log_success "Preços CONAB sincronizados"
else
    log_warning "Problema na sincronização de preços (pode ser conectividade ou período inválido)"
fi

# 7. Processamento de features
echo ""
echo "⚙️  Etapa 7: Processamento de Features"
echo "------------------------------------"

log_info "Processando features meteorológicas..."
if python -m jobs.cli inmet process-features; then
    log_success "Features processadas"
else
    log_warning "Problema no processamento de features (pode precisar de mais dados)"
fi

# 8. Relatórios e validação
echo ""
echo "📊 Etapa 8: Relatórios e Validação"
echo "---------------------------------"

log_info "Gerando relatório consolidado..."
python -m jobs.cli report

log_info "Validando integridade dos dados..."
python -m jobs.cli validate

# 9. Demonstração de análise
echo ""
echo "📈 Etapa 9: Demonstração de Análise"
echo "----------------------------------"

log_info "Executando script de exemplo..."
if [ -f "examples/quick_start.py" ]; then
    python examples/quick_start.py || {
        log_warning "Script de exemplo falhou (pode precisar de mais dados)"
    }
else
    log_warning "Script de exemplo não encontrado"
fi

# 10. Verificação final
echo ""
echo "🔍 Etapa 10: Verificação Final"
echo "-----------------------------"

log_info "Verificando arquivos gerados..."

echo ""
echo "📁 Estrutura de dados criada:"
find data/ -name "*.parquet" -exec ls -lh {} \; 2>/dev/null | head -10 || {
    log_warning "Nenhum arquivo Parquet encontrado (pode indicar problemas de conectividade)"
}

echo ""
echo "📝 Logs gerados:"
ls -lh logs/ 2>/dev/null || log_warning "Diretório de logs não encontrado"

echo ""
echo "📋 Metadados:"
find data/metadata/ -name "*.json" -exec ls -lh {} \; 2>/dev/null | head -5 || {
    log_warning "Nenhum metadata encontrado"
}

# 11. Resumo final
echo ""
echo "📊 RESUMO DA DEMONSTRAÇÃO"
echo "========================"

# Contar arquivos gerados
RAW_COUNT=$(find data/raw/ -type f 2>/dev/null | wc -l)
STAGING_COUNT=$(find data/staging/ -type f 2>/dev/null | wc -l)
CURATED_COUNT=$(find data/curated/ -type f 2>/dev/null | wc -l)
METADATA_COUNT=$(find data/metadata/ -type f 2>/dev/null | wc -l)

echo "📁 Arquivos gerados:"
echo "   • Raw: $RAW_COUNT"
echo "   • Staging: $STAGING_COUNT"
echo "   • Curated: $CURATED_COUNT"
echo "   • Metadata: $METADATA_COUNT"

# Verificar comandos CLI
echo ""
echo "🔧 Comandos CLI disponíveis:"
python -m jobs.cli --help | grep "Commands:" -A 20

echo ""
echo "🎯 Status final:"
python -m jobs.cli status

echo ""
echo "✅ DEMONSTRAÇÃO CONCLUÍDA!"
echo "========================="
echo ""
echo "📚 Próximos passos:"
echo "   • Para sincronização completa: python -m jobs.cli sync-all --inicio 2014-01-01"
echo "   • Para agendamento: bash examples/cron_setup.sh"
echo "   • Para análises: python examples/analysis_notebook.py"
echo "   • Documentação: cat README.md"
echo ""
echo "⚠️  Notas importantes:"
echo "   • Esta demonstração usa dados limitados para ser rápida"
echo "   • Problemas de conectividade com APIs externas são normais"
echo "   • Para uso produtivo, configure .env com suas credenciais se necessário"
echo "   • Verifique logs em logs/spr.log para detalhes de erros"
echo ""
echo "🌾 SPR 1.1 está pronto para uso!"

# Retorna ao diretório original
cd ..

exit 0