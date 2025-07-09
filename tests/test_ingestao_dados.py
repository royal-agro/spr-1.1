"""
📦 SPR 1.1 - Testes do Módulo de Ingestão de Dados
Testes para coleta, normalização e armazenamento de dados
"""

import pytest
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import tempfile
import os

# Importar módulos a serem testados
from app.models.dados_agro import (
    PrecoAgro, Clima, Cambio, Estoque, Sentimento,
    criar_tabelas, get_session
)
from app.database.conn import init_database, verificar_conexao
from app.ingestao.ingest_cepea import (
    buscar_dados_simulados as cepea_simulados,
    executar_ingestao_cepea,
    calcular_variacao_precos
)
from app.ingestao.ingest_clima import (
    buscar_dados_simulados as clima_simulados,
    executar_ingestao_clima,
    calcular_media_climatica
)
from app.ingestao.ingest_cambio import (
    buscar_dados_simulados as cambio_simulados,
    executar_ingestao_cambio,
    calcular_variacoes_cambiais
)
from app.ingestao.ingest_estoque import (
    buscar_dados_simulados as estoque_simulados,
    executar_ingestao_estoque,
    calcular_balanco_estoque
)
from app.ingestao.ingest_sentimento import (
    buscar_dados_simulados as sentimento_simulados,
    executar_ingestao_sentimento,
    calcular_indice_sentimento
)
from app.ingestao.scheduler_ingestao import (
    SchedulerIngestao,
    iniciar_sistema_ingestao
)

class TestModelosDados:
    """Testes para modelos de dados SQLModel"""
    
    def test_criar_tabelas(self):
        """Testa criação de tabelas"""
        # Usar banco temporário
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            # Configurar banco temporário
            os.environ['DATABASE_URL'] = f'sqlite:///{tmp_path}'
            
            # Criar tabelas
            criar_tabelas()
            
            # Verificar se tabelas foram criadas
            with get_session() as session:
                # Verificar se consegue fazer consulta básica
                result = session.exec("SELECT name FROM sqlite_master WHERE type='table'").all()
                table_names = [row[0] for row in result]
                
                assert 'precos_agro' in table_names
                assert 'clima' in table_names
                assert 'cambio' in table_names
                assert 'estoque' in table_names
                assert 'sentimento' in table_names
        
        finally:
            # Limpar
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    def test_modelo_preco_agro(self):
        """Testa modelo PrecoAgro"""
        preco = PrecoAgro(
            cultura="soja",
            data=datetime.now(),
            valor=120.50,
            regiao="MT",
            fonte="CEPEA"
        )
        
        assert preco.cultura == "soja"
        assert preco.valor == 120.50
        assert preco.regiao == "MT"
        assert preco.fonte == "CEPEA"
    
    def test_modelo_clima(self):
        """Testa modelo Clima"""
        clima = Clima(
            data=datetime.now(),
            regiao="SP",
            temp_min=18.5,
            temp_max=32.8,
            chuva_mm=12.4,
            ndvi=0.65,
            fonte="INMET"
        )
        
        assert clima.regiao == "SP"
        assert clima.temp_min == 18.5
        assert clima.temp_max == 32.8
        assert clima.chuva_mm == 12.4
        assert clima.ndvi == 0.65

class TestIngestaoCEPEA:
    """Testes para ingestão de dados CEPEA"""
    
    def test_buscar_dados_simulados(self):
        """Testa geração de dados simulados CEPEA"""
        df = cepea_simulados()
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        assert 'cultura' in df.columns
        assert 'data' in df.columns
        assert 'valor' in df.columns
        assert 'regiao' in df.columns
        assert 'fonte' in df.columns
        
        # Verificar tipos de dados
        assert df['valor'].dtype in ['float64', 'int64']
        assert all(df['valor'] > 0)
        
        # Verificar culturas
        culturas_esperadas = ["soja", "milho", "cafe", "algodao", "boi", "trigo"]
        assert all(cultura in culturas_esperadas for cultura in df['cultura'].unique())
    
    def test_executar_ingestao_cepea(self):
        """Testa execução completa da ingestão CEPEA"""
        resultado = executar_ingestao_cepea()
        
        assert isinstance(resultado, dict)
        assert 'status' in resultado
        assert 'registros_processados' in resultado
        assert 'timestamp' in resultado
        
        if resultado['status'] == 'sucesso':
            assert resultado['registros_processados'] > 0
    
    def test_calcular_variacao_precos(self):
        """Testa cálculo de variação de preços"""
        # Executar ingestão primeiro
        executar_ingestao_cepea()
        
        # Calcular variação
        variacao = calcular_variacao_precos("soja", "MT", 30)
        
        if 'erro' not in variacao:
            assert 'cultura' in variacao
            assert 'variacao_percentual' in variacao
            assert 'tendencia' in variacao
            assert variacao['cultura'] == "soja"
            assert variacao['tendencia'] in ['alta', 'baixa']

class TestIngestaoClima:
    """Testes para ingestão de dados climáticos"""
    
    def test_buscar_dados_simulados(self):
        """Testa geração de dados simulados de clima"""
        df = clima_simulados()
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        assert 'data' in df.columns
        assert 'regiao' in df.columns
        assert 'temp_min' in df.columns
        assert 'temp_max' in df.columns
        assert 'chuva_mm' in df.columns
        assert 'ndvi' in df.columns
        
        # Verificar valores válidos
        assert all(df['temp_max'] > df['temp_min'])
        assert all(df['chuva_mm'] >= 0)
        assert all((df['ndvi'] >= 0) & (df['ndvi'] <= 1))
    
    def test_executar_ingestao_clima(self):
        """Testa execução completa da ingestão climática"""
        resultado = executar_ingestao_clima()
        
        assert isinstance(resultado, dict)
        assert 'status' in resultado
        
        if resultado['status'] == 'sucesso':
            assert resultado['registros_processados'] > 0
    
    def test_calcular_media_climatica(self):
        """Testa cálculo de média climática"""
        # Executar ingestão primeiro
        executar_ingestao_clima()
        
        # Calcular média
        media = calcular_media_climatica("MT", 30)
        
        if 'erro' not in media:
            assert 'regiao' in media
            assert 'temp_min_media' in media
            assert 'temp_max_media' in media
            assert 'chuva_total' in media
            assert 'ndvi_medio' in media
            assert media['regiao'] == "MT"

class TestIngestaoCambio:
    """Testes para ingestão de dados cambiais"""
    
    def test_buscar_dados_simulados(self):
        """Testa geração de dados simulados cambiais"""
        df = cambio_simulados()
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        assert 'data' in df.columns
        assert 'usd_brl' in df.columns
        assert 'selic' in df.columns
        assert 'ipca' in df.columns
        
        # Verificar valores válidos
        assert all(df['usd_brl'] > 0)
        assert all(df['selic'] >= 0)
    
    def test_executar_ingestao_cambio(self):
        """Testa execução completa da ingestão cambial"""
        resultado = executar_ingestao_cambio()
        
        assert isinstance(resultado, dict)
        assert 'status' in resultado
        
        if resultado['status'] == 'sucesso':
            assert resultado['registros_processados'] > 0
    
    def test_calcular_variacoes_cambiais(self):
        """Testa cálculo de variações cambiais"""
        # Executar ingestão primeiro
        executar_ingestao_cambio()
        
        # Calcular variações
        variacoes = calcular_variacoes_cambiais(30)
        
        if 'erro' not in variacoes:
            assert 'usd_brl' in variacoes
            assert 'selic' in variacoes
            assert 'ipca' in variacoes
            assert 'variacao_pct' in variacoes['usd_brl']
            assert 'tendencia' in variacoes['usd_brl']

class TestIngestaoEstoque:
    """Testes para ingestão de dados de estoque"""
    
    def test_buscar_dados_simulados(self):
        """Testa geração de dados simulados de estoque"""
        df = estoque_simulados()
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        assert 'cultura' in df.columns
        assert 'data' in df.columns
        assert 'tipo' in df.columns
        assert 'valor' in df.columns
        
        # Verificar valores válidos
        assert all(df['valor'] >= 0)
        
        # Verificar tipos de estoque
        tipos_esperados = ["inicial", "final", "consumo", "producao", "exportacao", "importacao"]
        assert all(tipo in tipos_esperados for tipo in df['tipo'].unique())
    
    def test_executar_ingestao_estoque(self):
        """Testa execução completa da ingestão de estoque"""
        resultado = executar_ingestao_estoque()
        
        assert isinstance(resultado, dict)
        assert 'status' in resultado
        
        if resultado['status'] == 'sucesso':
            assert resultado['registros_processados'] > 0
    
    def test_calcular_balanco_estoque(self):
        """Testa cálculo de balanço de estoque"""
        # Executar ingestão primeiro
        executar_ingestao_estoque()
        
        # Calcular balanço
        balanco = calcular_balanco_estoque("soja", 12)
        
        if 'erro' not in balanco:
            assert 'cultura' in balanco
            assert 'producao_media' in balanco
            assert 'consumo_medio' in balanco
            assert 'situacao' in balanco
            assert balanco['cultura'] == "soja"
            assert balanco['situacao'] in ['superavit', 'deficit', 'equilibrio']

class TestIngestaoSentimento:
    """Testes para ingestão de análise de sentimento"""
    
    def test_buscar_dados_simulados(self):
        """Testa geração de dados simulados de sentimento"""
        df = sentimento_simulados()
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0
        assert 'data' in df.columns
        assert 'manchete' in df.columns
        assert 'score' in df.columns
        assert 'fonte' in df.columns
        assert 'categoria' in df.columns
        
        # Verificar scores válidos
        assert all((df['score'] >= -1.0) & (df['score'] <= 1.0))
        
        # Verificar categorias
        categorias_esperadas = ["producao", "mercado", "clima", "economia", "politica", "tecnologia"]
        assert all(cat in categorias_esperadas for cat in df['categoria'].unique())
    
    def test_executar_ingestao_sentimento(self):
        """Testa execução completa da ingestão de sentimento"""
        resultado = executar_ingestao_sentimento()
        
        assert isinstance(resultado, dict)
        assert 'status' in resultado
        
        if resultado['status'] == 'sucesso':
            assert resultado['registros_processados'] > 0
    
    def test_calcular_indice_sentimento(self):
        """Testa cálculo de índice de sentimento"""
        # Executar ingestão primeiro
        executar_ingestao_sentimento()
        
        # Calcular índice
        indice = calcular_indice_sentimento("mercado", 7)
        
        if 'erro' not in indice:
            assert 'categoria' in indice
            assert 'indice_medio' in indice
            assert 'classificacao' in indice
            assert 'distribuicao' in indice
            assert indice['categoria'] == "mercado"
            assert indice['classificacao'] in ['positivo', 'negativo', 'neutro']
            assert -1.0 <= indice['indice_medio'] <= 1.0

class TestSchedulerIngestao:
    """Testes para sistema de agendamento"""
    
    def test_inicializacao_scheduler(self):
        """Testa inicialização do scheduler"""
        scheduler = SchedulerIngestao()
        
        assert scheduler.scheduler is not None
        assert scheduler.jobs_status == {}
        assert scheduler.logs_execucao == []
    
    def test_configurar_jobs_padrao(self):
        """Testa configuração de jobs padrão"""
        scheduler = SchedulerIngestao()
        scheduler.iniciar_scheduler()
        
        # Verificar se jobs foram criados
        status = scheduler.obter_status_jobs()
        
        jobs_esperados = [
            "cepea_diario",
            "clima_diario", 
            "cambio_diario",
            "estoque_mensal",
            "sentimento_4h"
        ]
        
        for job_id in jobs_esperados:
            assert job_id in status
            assert status[job_id]['status'] in ['agendado', 'pausado']
        
        scheduler.parar_scheduler()
    
    def test_execucao_manual_job(self):
        """Testa execução manual de job"""
        scheduler = SchedulerIngestao()
        scheduler.iniciar_scheduler()
        
        # Executar job manualmente
        resultado = scheduler.executar_job_manual("cepea_diario")
        
        assert isinstance(resultado, dict)
        assert 'status' in resultado
        
        # Verificar se foi registrado nos logs
        logs = scheduler.obter_logs_execucao("cepea_diario", 1)
        assert len(logs) > 0
        assert logs[0]['job_id'] == "cepea_diario"
        
        scheduler.parar_scheduler()
    
    def test_pausar_reativar_job(self):
        """Testa pausar e reativar job"""
        scheduler = SchedulerIngestao()
        scheduler.iniciar_scheduler()
        
        # Pausar job
        scheduler.pausar_job("cepea_diario")
        status = scheduler.obter_status_jobs()
        assert status["cepea_diario"]["status"] == "pausado"
        
        # Reativar job
        scheduler.reativar_job("cepea_diario")
        status = scheduler.obter_status_jobs()
        assert status["cepea_diario"]["status"] == "agendado"
        
        scheduler.parar_scheduler()
    
    def test_estatisticas_scheduler(self):
        """Testa obtenção de estatísticas"""
        scheduler = SchedulerIngestao()
        scheduler.iniciar_scheduler()
        
        # Executar alguns jobs
        scheduler.executar_job_manual("cepea_diario")
        scheduler.executar_job_manual("clima_diario")
        
        # Obter estatísticas
        stats = scheduler.obter_estatisticas()
        
        assert 'total_jobs' in stats
        assert 'jobs_ativos' in stats
        assert 'total_execucoes' in stats
        assert 'taxa_sucesso' in stats
        assert 'scheduler_ativo' in stats
        
        assert stats['total_jobs'] > 0
        assert stats['total_execucoes'] > 0
        assert 0 <= stats['taxa_sucesso'] <= 100
        
        scheduler.parar_scheduler()

class TestIntegracaoCompleta:
    """Testes de integração completa"""
    
    def test_fluxo_completo_ingestao(self):
        """Testa fluxo completo de ingestão de dados"""
        # Executar todas as ingestões
        resultados = []
        
        resultados.append(executar_ingestao_cepea())
        resultados.append(executar_ingestao_clima())
        resultados.append(executar_ingestao_cambio())
        resultados.append(executar_ingestao_estoque())
        resultados.append(executar_ingestao_sentimento())
        
        # Verificar se todas foram executadas
        for resultado in resultados:
            assert isinstance(resultado, dict)
            assert 'status' in resultado
            assert 'timestamp' in resultado
        
        # Verificar se pelo menos algumas foram bem-sucedidas
        sucessos = [r for r in resultados if r['status'] == 'sucesso']
        assert len(sucessos) > 0
    
    def test_sistema_completo_agendamento(self):
        """Testa sistema completo de agendamento"""
        # Iniciar sistema
        sucesso = iniciar_sistema_ingestao()
        assert sucesso
        
        # Verificar se scheduler está rodando
        from app.ingestao.scheduler_ingestao import scheduler_ingestao
        assert scheduler_ingestao.scheduler.running
        
        # Obter status
        status = scheduler_ingestao.obter_status_jobs()
        assert len(status) > 0
        
        # Parar sistema
        from app.ingestao.scheduler_ingestao import parar_sistema_ingestao
        sucesso = parar_sistema_ingestao()
        assert sucesso

if __name__ == "__main__":
    # Executar testes
    pytest.main([__file__, "-v"]) 