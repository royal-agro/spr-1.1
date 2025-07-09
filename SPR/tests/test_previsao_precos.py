# test_previsao_precos.py
# 📦 SPR 1.1 – Testes para Módulo de Previsão de Preços

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import tempfile
import os

from app.precificacao.previsao_precos import PrevisorDePrecos


class TestPrevisorDePrecos:
    """Testes para classe PrevisorDePrecos"""
    
    def setup_method(self):
        """Setup executado antes de cada teste"""
        self.previsor_soja = PrevisorDePrecos(commodity="soja")
        self.previsor_milho = PrevisorDePrecos(commodity="milho")
    
    def test_inicializacao(self):
        """Testa inicialização da classe"""
        assert self.previsor_soja.commodity == "soja"
        assert self.previsor_milho.commodity == "milho"
        assert self.previsor_soja.modelo is None
        assert not self.previsor_soja.modelo_treinado
    
    def test_carregar_dados_simulados(self):
        """Testa carregamento de dados simulados"""
        dados = self.previsor_soja.carregar_dados()
        
        # Verificar estrutura dos dados
        assert isinstance(dados, pd.DataFrame)
        assert len(dados) > 0
        assert 'data' in dados.columns
        assert 'preco' in dados.columns
        assert 'preco_anterior' in dados.columns
        assert 'tendencia' in dados.columns
        assert 'volatilidade' in dados.columns
        
        # Verificar tipos
        assert dados['preco'].dtype in [np.float64, np.float32]
        assert pd.api.types.is_datetime64_any_dtype(dados['data'])
    
    def test_carregar_dados_externos(self):
        """Testa carregamento de dados externos"""
        # Criar dados de teste
        datas = pd.date_range(start='2023-01-01', periods=100, freq='D')
        dados_externos = pd.DataFrame({
            'data': datas,
            'preco': np.random.uniform(100, 200, 100),
            'volume': np.random.randint(1000, 5000, 100),
            'mes': datas.month,
            'ano': datas.year
        })
        
        dados = self.previsor_soja.carregar_dados(dados_externos)
        
        assert isinstance(dados, pd.DataFrame)
        assert len(dados) > 0
        assert 'preco_anterior' in dados.columns
    
    def test_simulacao_dados_soja(self):
        """Testa simulação específica para soja"""
        dados = self.previsor_soja.carregar_dados()
        
        # Verificar preços dentro da faixa esperada para soja
        precos = dados['preco']
        assert precos.min() > 0
        assert precos.max() < 500  # Limite razoável para soja
        
        # Verificar sazonalidade (deve ter variação)
        assert precos.std() > 0
    
    def test_simulacao_dados_milho(self):
        """Testa simulação específica para milho"""
        dados = self.previsor_milho.carregar_dados()
        
        # Verificar preços dentro da faixa esperada para milho
        precos = dados['preco']
        assert precos.min() > 0
        assert precos.max() < 300  # Limite razoável para milho
        
        # Verificar que milho tem preços diferentes de soja
        dados_soja = self.previsor_soja.carregar_dados()
        assert dados['preco'].mean() != dados_soja['preco'].mean()
    
    def test_treinar_modelo_sem_dados(self):
        """Testa treinamento sem dados carregados"""
        with pytest.raises(ValueError, match="Dados não carregados"):
            self.previsor_soja.treinar_modelo()
    
    def test_treinar_modelo_com_dados(self):
        """Testa treinamento com dados"""
        # Carregar dados
        self.previsor_soja.carregar_dados()
        
        # Treinar modelo
        metricas = self.previsor_soja.treinar_modelo()
        
        # Verificar que modelo foi treinado
        assert self.previsor_soja.modelo_treinado
        assert self.previsor_soja.modelo is not None
        
        # Verificar métricas
        assert isinstance(metricas, dict)
        assert 'mae' in metricas
        assert 'mse' in metricas
        assert 'rmse' in metricas
        assert 'r2' in metricas
        assert 'samples_treino' in metricas
        assert 'samples_teste' in metricas
        
        # Verificar que métricas são numéricas
        assert isinstance(metricas['mae'], (int, float))
        assert isinstance(metricas['r2'], (int, float))
        assert metricas['samples_treino'] > 0
        assert metricas['samples_teste'] > 0
    
    def test_prever_sem_modelo(self):
        """Testa previsão sem modelo treinado"""
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 8)]
        
        with pytest.raises(ValueError, match="Modelo não treinado"):
            self.previsor_soja.prever(datas_futuras)
    
    def test_prever_com_modelo(self):
        """Testa previsão com modelo treinado"""
        # Preparar modelo
        self.previsor_soja.carregar_dados()
        self.previsor_soja.treinar_modelo()
        
        # Fazer previsões
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 8)]
        previsoes = self.previsor_soja.prever(datas_futuras)
        
        # Verificar shape das previsões
        assert len(previsoes) == 7
        assert isinstance(previsoes, list)
        
        # Verificar estrutura de cada previsão
        for previsao in previsoes:
            assert isinstance(previsao, dict)
            assert 'data' in previsao
            assert 'preco_previsto' in previsao
            assert 'limite_inferior' in previsao
            assert 'limite_superior' in previsao
            assert 'confianca' in previsao
            assert 'commodity' in previsao
            
            # Verificar tipos
            assert isinstance(previsao['data'], datetime)
            assert isinstance(previsao['preco_previsto'], (int, float))
            assert isinstance(previsao['limite_inferior'], (int, float))
            assert isinstance(previsao['limite_superior'], (int, float))
            assert previsao['confianca'] == 0.95
            assert previsao['commodity'] == "soja"
            
            # Verificar lógica dos intervalos
            assert previsao['limite_inferior'] < previsao['preco_previsto']
            assert previsao['preco_previsto'] < previsao['limite_superior']
    
    def test_salvar_modelo_sem_treino(self):
        """Testa salvamento sem modelo treinado"""
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as f:
            caminho = f.name
        
        try:
            with pytest.raises(ValueError, match="Modelo não treinado"):
                self.previsor_soja.salvar_modelo(caminho)
        finally:
            if os.path.exists(caminho):
                os.unlink(caminho)
    
    def test_salvar_e_carregar_modelo(self):
        """Testa salvamento e carregamento de modelo"""
        # Treinar modelo
        self.previsor_soja.carregar_dados()
        metricas_originais = self.previsor_soja.treinar_modelo()
        
        # Salvar modelo
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as f:
            caminho = f.name
        
        try:
            resultado_salvar = self.previsor_soja.salvar_modelo(caminho)
            assert resultado_salvar is True
            assert os.path.exists(caminho)
            
            # Criar novo previsor e carregar modelo
            novo_previsor = PrevisorDePrecos(commodity="teste")
            resultado_carregar = novo_previsor.carregar_modelo(caminho)
            
            assert resultado_carregar is True
            assert novo_previsor.modelo_treinado
            assert novo_previsor.commodity == "soja"  # Deve ser restaurado
            assert novo_previsor.modelo is not None
            
        finally:
            if os.path.exists(caminho):
                os.unlink(caminho)
    
    def test_carregar_modelo_inexistente(self):
        """Testa carregamento de arquivo inexistente"""
        resultado = self.previsor_soja.carregar_modelo("arquivo_inexistente.pkl")
        assert resultado is False
    
    def test_gerar_relatorio_sem_previsoes(self):
        """Testa geração de relatório sem previsões"""
        with pytest.raises(ValueError, match="Lista de previsões vazia"):
            self.previsor_soja.gerar_relatorio([])
    
    def test_gerar_relatorio_com_previsoes(self):
        """Testa geração de relatório com previsões"""
        # Preparar dados e modelo
        self.previsor_soja.carregar_dados()
        self.previsor_soja.treinar_modelo()
        
        # Fazer previsões
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 8)]
        previsoes = self.previsor_soja.prever(datas_futuras)
        
        # Gerar relatório
        relatorio = self.previsor_soja.gerar_relatorio(previsoes)
        
        # Verificar estrutura do relatório
        assert isinstance(relatorio, dict)
        assert 'commodity' in relatorio
        assert 'periodo_previsao' in relatorio
        assert 'estatisticas' in relatorio
        assert 'previsoes' in relatorio
        assert 'timestamp' in relatorio
        assert 'grafico_base64' in relatorio
        
        # Verificar período de previsão
        periodo = relatorio['periodo_previsao']
        assert 'inicio' in periodo
        assert 'fim' in periodo
        assert 'dias' in periodo
        assert periodo['dias'] == 7
        
        # Verificar estatísticas
        stats = relatorio['estatisticas']
        assert 'preco_medio' in stats
        assert 'preco_minimo' in stats
        assert 'preco_maximo' in stats
        assert 'volatilidade' in stats
        assert 'tendencia' in stats
        assert stats['tendencia'] in ['alta', 'baixa']
        
        # Verificar que gráfico foi gerado
        assert isinstance(relatorio['grafico_base64'], str)
        assert len(relatorio['grafico_base64']) > 0
    
    def test_gerar_relatorio_sem_grafico(self):
        """Testa geração de relatório sem gráfico"""
        # Preparar dados e modelo
        self.previsor_soja.carregar_dados()
        self.previsor_soja.treinar_modelo()
        
        # Fazer previsões
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 4)]
        previsoes = self.previsor_soja.prever(datas_futuras)
        
        # Gerar relatório sem gráfico
        relatorio = self.previsor_soja.gerar_relatorio(previsoes, incluir_grafico=False)
        
        # Verificar que não há gráfico
        assert 'grafico_base64' not in relatorio
    
    def test_commodities_diferentes(self):
        """Testa que commodities diferentes geram preços diferentes"""
        # Treinar modelos para diferentes commodities
        previsor_cafe = PrevisorDePrecos(commodity="cafe")
        previsor_algodao = PrevisorDePrecos(commodity="algodao")
        
        # Carregar dados e treinar
        self.previsor_soja.carregar_dados()
        self.previsor_milho.carregar_dados()
        previsor_cafe.carregar_dados()
        previsor_algodao.carregar_dados()
        
        # Comparar preços base
        preco_soja = self.previsor_soja.dados_historicos['preco'].mean()
        preco_milho = self.previsor_milho.dados_historicos['preco'].mean()
        preco_cafe = previsor_cafe.dados_historicos['preco'].mean()
        preco_algodao = previsor_algodao.dados_historicos['preco'].mean()
        
        # Verificar que são diferentes
        precos = [preco_soja, preco_milho, preco_cafe, preco_algodao]
        assert len(set(precos)) == 4  # Todos diferentes
    
    @patch('matplotlib.pyplot.savefig')
    def test_gerar_grafico_base64_mock(self, mock_savefig):
        """Testa geração de gráfico com mock"""
        # Preparar dados
        self.previsor_soja.carregar_dados()
        self.previsor_soja.treinar_modelo()
        
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 4)]
        previsoes = self.previsor_soja.prever(datas_futuras)
        
        # Mock do buffer
        mock_buffer = MagicMock()
        mock_buffer.getvalue.return_value = b'fake_image_data'
        
        with patch('io.BytesIO', return_value=mock_buffer):
            grafico = self.previsor_soja._gerar_grafico_base64(previsoes)
        
        # Verificar que retorna string base64
        assert isinstance(grafico, str)
        assert len(grafico) > 0
    
    def test_fluxo_completo_soja(self):
        """Testa fluxo completo para soja"""
        # 1. Carregar dados
        dados = self.previsor_soja.carregar_dados()
        assert len(dados) > 0
        
        # 2. Treinar modelo
        metricas = self.previsor_soja.treinar_modelo()
        assert isinstance(metricas['r2'], (int, float))
        
        # 3. Fazer previsões
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 15)]
        previsoes = self.previsor_soja.prever(datas_futuras)
        assert len(previsoes) == 14
        
        # 4. Gerar relatório
        relatorio = self.previsor_soja.gerar_relatorio(previsoes)
        assert relatorio['commodity'] == 'soja'
        assert len(relatorio['previsoes']) == 14
    
    def test_fluxo_completo_milho(self):
        """Testa fluxo completo para milho"""
        # 1. Carregar dados
        dados = self.previsor_milho.carregar_dados()
        assert len(dados) > 0
        
        # 2. Treinar modelo
        metricas = self.previsor_milho.treinar_modelo()
        assert isinstance(metricas['r2'], (int, float))
        
        # 3. Fazer previsões
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 8)]
        previsoes = self.previsor_milho.prever(datas_futuras)
        assert len(previsoes) == 7
        
        # 4. Gerar relatório
        relatorio = self.previsor_milho.gerar_relatorio(previsoes)
        assert relatorio['commodity'] == 'milho'
        assert len(relatorio['previsoes']) == 7
        
        # 5. Verificar que estatísticas fazem sentido
        stats = relatorio['estatisticas']
        assert stats['preco_minimo'] <= stats['preco_medio'] <= stats['preco_maximo']
        assert stats['volatilidade'] >= 0 