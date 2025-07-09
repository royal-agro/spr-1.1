import pytest
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Adiciona o diretório app ao PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent / 'app'))

from main import SPRSystem, main

# Importa os módulos para testar
from analise.alertas_automatizados import AlertasAutomatizados
from analise.analise_sentimento import AnaliseSentimento
from analise.comparativos_precificacao import ComparativosPrecificacao
from analise.dashboard_interativo import DashboardInterativo
from analise.noticias_sentimento import NoticiasSentimento
from analise.relatorios_mercadologicos import RelatoriosMercadologicos

from precificacao.cambio import ModuloCambio
from precificacao.clima_ndvi import ModuloClimaNdvi
from precificacao.custos import ModuloCustos
from precificacao.mercado_interno_externo import ModuloMercadoInternoExterno
from precificacao.precos import ModuloPrecos

from suporte_tecnico.backup_logs import ModuloBackupLogs
from suporte_tecnico.claude_sync import ModuloClaudeSync
from suporte_tecnico.clientes import ModuloClientes

def test_spr_system_initialization():
    """Testa a inicialização do sistema SPR"""
    spr = SPRSystem()
    assert spr.version == "1.1"
    assert spr.environment is None
    assert isinstance(spr.modules, dict)

def test_load_environment():
    """Testa o carregamento do ambiente"""
    spr = SPRSystem()
    result = spr.load_environment()
    assert isinstance(result, bool)

def test_discover_modules():
    """Testa a descoberta de módulos"""
    spr = SPRSystem()
    modules = spr.discover_modules()
    assert isinstance(modules, list)

def test_health_check():
    """Testa o health check do sistema"""
    spr = SPRSystem()
    health = spr.health_check()
    assert 'system' in health
    assert 'version' in health
    assert health['version'] == "1.1"

def test_register_module():
    """Testa o registro de módulos"""
    spr = SPRSystem()
    # Testa registro de módulo existente
    result = spr.register_module('analise')
    assert isinstance(result, bool)
    
    # Testa registro de módulo inexistente
    result_invalid = spr.register_module('modulo_inexistente')
    assert result_invalid == False

def test_initialize_modules():
    """Testa a inicialização de módulos"""
    spr = SPRSystem()
    # Primeiro registra alguns módulos
    spr.register_module('analise')
    spr.register_module('precificacao')
    
    # Testa inicialização
    result = spr.initialize_modules()
    assert isinstance(result, bool)

def test_startup_process():
    """Testa o processo completo de startup"""
    spr = SPRSystem()
    result = spr.startup()
    assert isinstance(result, bool)

def test_shutdown_process():
    """Testa o processo de shutdown"""
    spr = SPRSystem()
    # Registra alguns módulos primeiro
    spr.register_module('analise')
    spr.register_module('precificacao')
    
    # Testa shutdown (não deve lançar exceção)
    try:
        spr.shutdown()
        assert True
    except Exception:
        assert False

@patch('sys.argv', ['main.py', '--version'])
def test_main_version():
    """Testa a execução do main com --version"""
    try:
        result = main()
        assert result == 0
    except SystemExit as e:
        assert e.code == 0

@patch('sys.argv', ['main.py', '--check'])
def test_main_check():
    """Testa a execução do main com --check"""
    try:
        result = main()
        assert result == 0
    except SystemExit as e:
        assert e.code == 0

def test_load_environment_with_exception():
    """Testa load_environment com exceção"""
    spr = SPRSystem()
    
    # Mock que causa exceção
    with patch('os.getenv', side_effect=Exception("Erro mock")):
        result = spr.load_environment()
        assert result == False

def test_register_module_with_exception():
    """Testa register_module com exceção"""
    spr = SPRSystem()
    
    # Mock que causa exceção no Path
    with patch('pathlib.Path.exists', side_effect=Exception("Erro mock")):
        result = spr.register_module('analise')
        assert result == False

def test_environment_after_load():
    """Testa se o ambiente é configurado após load_environment"""
    spr = SPRSystem()
    spr.load_environment()
    # Deve ter algum valor, mesmo que seja o padrão
    assert spr.environment is not None

def test_modules_discovery_count():
    """Testa se discover_modules retorna pelo menos alguns módulos"""
    spr = SPRSystem()
    modules = spr.discover_modules()
    # Deve encontrar pelo menos 1 módulo (analise, precificacao ou suporte_tecnico)
    assert len(modules) >= 1

def test_health_check_structure():
    """Testa a estrutura do health check"""
    spr = SPRSystem()
    health = spr.health_check()
    
    # Verifica se tem as chaves obrigatórias
    assert isinstance(health, dict)
    assert 'system' in health
    assert 'version' in health
    assert health['system'] == 'healthy'
    assert health['version'] == '1.1'

# Testes dos módulos de análise
def test_alertas_automatizados():
    """Testa o módulo de alertas automatizados"""
    alertas = AlertasAutomatizados()
    assert hasattr(alertas, 'configurar_alerta')
    assert hasattr(alertas, 'processar_alertas')
    assert hasattr(alertas, 'enviar_notificacao')
    
    # Testa configuração de alerta
    config = alertas.configurar_alerta("soja", "preco", 100.0)
    assert isinstance(config, dict)
    
    # Testa processamento
    resultado = alertas.processar_alertas()
    assert isinstance(resultado, dict)

def test_analise_sentimento():
    """Testa o módulo de análise de sentimento"""
    analise = AnaliseSentimento()
    assert hasattr(analise, 'analisar_texto')
    assert hasattr(analise, 'obter_sentimento_mercado')
    assert hasattr(analise, 'processar_noticias')
    
    # Testa análise de texto
    resultado = analise.analisar_texto("Mercado em alta")
    assert isinstance(resultado, dict)

def test_comparativos_precificacao():
    """Testa o módulo de comparativos de precificação"""
    comp = ComparativosPrecificacao()
    assert hasattr(comp, 'comparar_precos')
    assert hasattr(comp, 'gerar_relatorio')
    assert hasattr(comp, 'analisar_tendencias')
    
    # Testa comparação
    resultado = comp.comparar_precos("soja", "milho")
    assert isinstance(resultado, dict)

def test_dashboard_interativo():
    """Testa o módulo de dashboard interativo"""
    dashboard = DashboardInterativo()
    assert hasattr(dashboard, 'gerar_dashboard')
    assert hasattr(dashboard, 'atualizar_dados')
    assert hasattr(dashboard, 'exportar_relatorio')
    
    # Testa geração de dashboard
    resultado = dashboard.gerar_dashboard()
    assert isinstance(resultado, dict)

def test_noticias_sentimento():
    """Testa o módulo de notícias e sentimento"""
    noticias = NoticiasSentimento()
    assert hasattr(noticias, 'coletar_noticias')
    assert hasattr(noticias, 'analisar_sentimento')
    assert hasattr(noticias, 'gerar_relatorio')
    
    # Testa coleta de notícias
    resultado = noticias.coletar_noticias("agricultura")
    assert isinstance(resultado, dict)

def test_relatorios_mercadologicos():
    """Testa o módulo de relatórios mercadológicos"""
    relatorios = RelatoriosMercadologicos()
    assert hasattr(relatorios, 'gerar_relatorio')
    assert hasattr(relatorios, 'analisar_mercado')
    assert hasattr(relatorios, 'exportar_dados')
    
    # Testa geração de relatório
    resultado = relatorios.gerar_relatorio("soja")
    assert isinstance(resultado, dict)

# Testes dos módulos de precificação
def test_modulo_cambio():
    """Testa o módulo de câmbio"""
    cambio = ModuloCambio()
    assert hasattr(cambio, 'obter_taxa_cambio')
    assert hasattr(cambio, 'converter_moeda')
    assert hasattr(cambio, 'historico_cambio')
    
    # Testa obtenção de taxa
    resultado = cambio.obter_taxa_cambio("USD", "BRL")
    assert isinstance(resultado, dict)

def test_modulo_clima_ndvi():
    """Testa o módulo de clima e NDVI"""
    clima = ModuloClimaNdvi()
    assert hasattr(clima, 'obter_dados_clima')
    assert hasattr(clima, 'calcular_ndvi')
    
    # Testa dados climáticos
    resultado = clima.obter_dados_clima("SP")
    assert isinstance(resultado, dict)
    
    # Testa cálculo NDVI
    ndvi = clima.calcular_ndvi("SP")
    assert isinstance(ndvi, dict)

def test_modulo_custos():
    """Testa o módulo de custos"""
    custos = ModuloCustos()
    assert hasattr(custos, 'calcular_custo_producao')
    assert hasattr(custos, 'analisar_rentabilidade')
    assert hasattr(custos, 'gerar_relatorio')
    
    # Testa cálculo de custo
    resultado = custos.calcular_custo_producao("soja", 100)
    assert isinstance(resultado, dict)

def test_modulo_mercado_interno_externo():
    """Testa o módulo de mercado interno e externo"""
    mercado = ModuloMercadoInternoExterno()
    assert hasattr(mercado, 'obter_precos_internos')
    assert hasattr(mercado, 'obter_precos_externos')
    assert hasattr(mercado, 'comparar_mercados')
    
    # Testa preços internos
    resultado = mercado.obter_precos_internos("soja")
    assert isinstance(resultado, dict)

def test_modulo_precos():
    """Testa o módulo de preços"""
    precos = ModuloPrecos()
    assert hasattr(precos, 'obter_preco_atual')
    assert hasattr(precos, 'prever_preco')
    assert hasattr(precos, 'analisar_tendencia')
    
    # Testa preço atual
    resultado = precos.obter_preco_atual("soja")
    assert isinstance(resultado, dict)

# Testes dos módulos de suporte técnico
def test_modulo_backup_logs():
    """Testa o módulo de backup de logs"""
    backup = ModuloBackupLogs()
    assert hasattr(backup, 'fazer_backup')
    assert hasattr(backup, 'restaurar_backup')
    assert hasattr(backup, 'listar_backups')
    
    # Testa backup
    resultado = backup.fazer_backup()
    assert isinstance(resultado, dict)

def test_modulo_claude_sync():
    """Testa o módulo de sincronização Claude"""
    claude = ModuloClaudeSync()
    assert hasattr(claude, 'sincronizar_dados')
    assert hasattr(claude, 'verificar_status')
    assert hasattr(claude, 'configurar_sync')
    
    # Testa sincronização
    resultado = claude.sincronizar_dados()
    assert isinstance(resultado, dict)

def test_modulo_clientes():
    """Testa o módulo de clientes"""
    clientes = ModuloClientes()
    assert hasattr(clientes, 'cadastrar_cliente')
    assert hasattr(clientes, 'listar_clientes')
    assert hasattr(clientes, 'atualizar_cliente')
    
    # Testa cadastro
    resultado = clientes.cadastrar_cliente("João Silva", "joao@email.com")
    assert isinstance(resultado, dict) 