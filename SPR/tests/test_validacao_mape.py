# test_validacao_mape.py
# 📦 SPR 1.1 – Testes de Validação MAPE para Previsão de Preços

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict
import logging

from app.precificacao.previsao_precos import PrevisorDePrecos

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestValidacaoMAPE:
    """
    Testes para validação de MAPE (Mean Absolute Percentage Error) dos modelos.
    
    Critérios de Sucesso:
    - MAPE ≤ 6% para previsões de curto prazo (até 3 meses)
    - MAPE ≤ 1,5% para previsões de longo prazo (até 1 ano)
    """
    
    def setup_method(self):
        """Setup executado antes de cada teste"""
        self.commodities = ["soja", "milho", "cafe", "algodao"]
        self.previsores = {}
        
        for commodity in self.commodities:
            self.previsores[commodity] = PrevisorDePrecos(commodity=commodity)
    
    def calcular_mape(self, valores_reais: List[float], valores_previstos: List[float]) -> float:
        """
        Calcula o MAPE (Mean Absolute Percentage Error).
        
        Args:
            valores_reais: Lista de valores reais
            valores_previstos: Lista de valores previstos
            
        Returns:
            MAPE em percentual
        """
        if len(valores_reais) != len(valores_previstos):
            raise ValueError("Listas devem ter o mesmo tamanho")
        
        # Evitar divisão por zero
        valores_reais = np.array(valores_reais)
        valores_previstos = np.array(valores_previstos)
        
        # Filtrar valores zero para evitar divisão por zero
        mask = valores_reais != 0
        valores_reais = valores_reais[mask]
        valores_previstos = valores_previstos[mask]
        
        if len(valores_reais) == 0:
            return 0.0
        
        mape = np.mean(np.abs((valores_reais - valores_previstos) / valores_reais)) * 100
        return mape
    
    def gerar_dados_teste_independente(self, commodity: str, periodo_dias: int) -> pd.DataFrame:
        """
        Gera conjunto de dados de teste independente para validação.
        
        Args:
            commodity: Nome da commodity
            periodo_dias: Número de dias para gerar
            
        Returns:
            DataFrame com dados de teste
        """
        # Gerar dados com padrão similar aos dados de treinamento mas independentes
        datas = pd.date_range(
            start=datetime.now() - timedelta(days=periodo_dias),
            end=datetime.now(),
            freq='D'
        )
        
        precos_base = {
            'soja': 150.0,
            'milho': 80.0,
            'cafe': 200.0,
            'algodao': 120.0
        }
        
        preco_base = precos_base.get(commodity, 100.0)
        
        # Usar seed diferente para dados independentes
        np.random.seed(123)
        
        dados = []
        preco_atual = preco_base
        
        for i, data in enumerate(datas):
            # Padrão similar mas com variações independentes
            sazonalidade = 8 * np.sin(2 * np.pi * i / 365 + np.pi/4)  # Fase diferente
            tendencia = 0.008 * i  # Tendência ligeiramente diferente
            ruido = np.random.normal(0, 4)  # Ruído diferente
            
            volatilidade_mes = 1.3 if data.month in [2, 3, 6] else 1.0
            
            preco_atual = preco_base + sazonalidade + tendencia + (ruido * volatilidade_mes)
            preco_atual = max(preco_atual, preco_base * 0.6)
            
            dados.append({
                'data': data,
                'preco': preco_atual,
                'volume': np.random.randint(800, 8000),
                'mes': data.month,
                'ano': data.year
            })
        
        return pd.DataFrame(dados)
    
    def test_mape_curto_prazo_soja(self):
        """Testa MAPE para previsões de curto prazo (3 meses) - Soja"""
        logger.info("Testando MAPE curto prazo para Soja")
        
        previsor = self.previsores["soja"]
        
        # Carregar dados e treinar modelo
        previsor.carregar_dados()
        metricas_treino = previsor.treinar_modelo()
        
        # Gerar dados de teste independente (90 dias)
        dados_teste = self.gerar_dados_teste_independente("soja", 90)
        
        # Fazer previsões para cada data de teste
        valores_reais = []
        valores_previstos = []
        
        for i in range(len(dados_teste) - 1):
            data_atual = dados_teste.iloc[i]['data']
            preco_real = dados_teste.iloc[i + 1]['preco']  # Preço do dia seguinte
            
            # Fazer previsão para o próximo dia
            previsao = previsor.prever([data_atual + timedelta(days=1)])
            preco_previsto = previsao[0]['preco_previsto']
            
            valores_reais.append(preco_real)
            valores_previstos.append(preco_previsto)
        
        # Calcular MAPE
        mape = self.calcular_mape(valores_reais, valores_previstos)
        
        logger.info(f"MAPE Soja (3 meses): {mape:.2f}%")
        logger.info(f"Métricas de treino - R²: {metricas_treino['r2']:.3f}, RMSE: {metricas_treino['rmse']:.2f}")
        
        # Validar critério: MAPE ≤ 6% para curto prazo
        assert mape <= 6.0, f"MAPE de {mape:.2f}% excede o limite de 6% para curto prazo"
        
        # Log de sucesso
        logger.info(f"✅ TESTE PASSOU: MAPE {mape:.2f}% ≤ 6% (Soja - Curto Prazo)")
    
    def test_mape_curto_prazo_milho(self):
        """Testa MAPE para previsões de curto prazo (3 meses) - Milho"""
        logger.info("Testando MAPE curto prazo para Milho")
        
        previsor = self.previsores["milho"]
        
        # Carregar dados e treinar modelo
        previsor.carregar_dados()
        metricas_treino = previsor.treinar_modelo()
        
        # Gerar dados de teste independente (90 dias)
        dados_teste = self.gerar_dados_teste_independente("milho", 90)
        
        # Fazer previsões para cada data de teste
        valores_reais = []
        valores_previstos = []
        
        for i in range(0, len(dados_teste) - 1, 7):  # Testar semanalmente
            data_atual = dados_teste.iloc[i]['data']
            preco_real = dados_teste.iloc[min(i + 7, len(dados_teste) - 1)]['preco']
            
            # Fazer previsão para 7 dias à frente
            previsao = previsor.prever([data_atual + timedelta(days=7)])
            preco_previsto = previsao[0]['preco_previsto']
            
            valores_reais.append(preco_real)
            valores_previstos.append(preco_previsto)
        
        # Calcular MAPE
        mape = self.calcular_mape(valores_reais, valores_previstos)
        
        logger.info(f"MAPE Milho (3 meses): {mape:.2f}%")
        logger.info(f"Métricas de treino - R²: {metricas_treino['r2']:.3f}, RMSE: {metricas_treino['rmse']:.2f}")
        
        # Validar critério: MAPE ≤ 6% para curto prazo
        assert mape <= 6.0, f"MAPE de {mape:.2f}% excede o limite de 6% para curto prazo"
        
        # Log de sucesso
        logger.info(f"✅ TESTE PASSOU: MAPE {mape:.2f}% ≤ 6% (Milho - Curto Prazo)")
    
    def test_mape_longo_prazo_soja(self):
        """Testa MAPE para previsões de longo prazo (1 ano) - Soja"""
        logger.info("Testando MAPE longo prazo para Soja")
        
        previsor = self.previsores["soja"]
        
        # Carregar dados e treinar modelo
        previsor.carregar_dados()
        metricas_treino = previsor.treinar_modelo()
        
        # Gerar dados de teste independente (365 dias)
        dados_teste = self.gerar_dados_teste_independente("soja", 365)
        
        # Fazer previsões mensais
        valores_reais = []
        valores_previstos = []
        
        for i in range(0, len(dados_teste) - 30, 30):  # Testar mensalmente
            data_atual = dados_teste.iloc[i]['data']
            preco_real = dados_teste.iloc[min(i + 30, len(dados_teste) - 1)]['preco']
            
            # Fazer previsão para 30 dias à frente
            previsao = previsor.prever([data_atual + timedelta(days=30)])
            preco_previsto = previsao[0]['preco_previsto']
            
            valores_reais.append(preco_real)
            valores_previstos.append(preco_previsto)
        
        # Calcular MAPE
        mape = self.calcular_mape(valores_reais, valores_previstos)
        
        logger.info(f"MAPE Soja (1 ano): {mape:.2f}%")
        logger.info(f"Métricas de treino - R²: {metricas_treino['r2']:.3f}, RMSE: {metricas_treino['rmse']:.2f}")
        
        # Validar critério: MAPE ≤ 1,5% para longo prazo
        assert mape <= 1.5, f"MAPE de {mape:.2f}% excede o limite de 1,5% para longo prazo"
        
        # Log de sucesso
        logger.info(f"✅ TESTE PASSOU: MAPE {mape:.2f}% ≤ 1,5% (Soja - Longo Prazo)")
    
    def test_mape_todas_commodities_curto_prazo(self):
        """Testa MAPE para todas as commodities em curto prazo"""
        logger.info("Testando MAPE curto prazo para todas as commodities")
        
        resultados = {}
        
        for commodity in self.commodities:
            previsor = self.previsores[commodity]
            
            # Carregar dados e treinar modelo
            previsor.carregar_dados()
            metricas_treino = previsor.treinar_modelo()
            
            # Gerar dados de teste independente (60 dias)
            dados_teste = self.gerar_dados_teste_independente(commodity, 60)
            
            # Fazer previsões
            valores_reais = []
            valores_previstos = []
            
            for i in range(0, len(dados_teste) - 1, 5):  # Testar a cada 5 dias
                data_atual = dados_teste.iloc[i]['data']
                preco_real = dados_teste.iloc[min(i + 5, len(dados_teste) - 1)]['preco']
                
                previsao = previsor.prever([data_atual + timedelta(days=5)])
                preco_previsto = previsao[0]['preco_previsto']
                
                valores_reais.append(preco_real)
                valores_previstos.append(preco_previsto)
            
            # Calcular MAPE
            mape = self.calcular_mape(valores_reais, valores_previstos)
            resultados[commodity] = {
                'mape': mape,
                'r2': metricas_treino['r2'],
                'rmse': metricas_treino['rmse']
            }
            
            logger.info(f"MAPE {commodity}: {mape:.2f}% (R²: {metricas_treino['r2']:.3f})")
        
        # Validar todas as commodities
        for commodity, resultado in resultados.items():
            assert resultado['mape'] <= 6.0, f"MAPE de {resultado['mape']:.2f}% excede 6% para {commodity}"
            logger.info(f"✅ {commodity.upper()}: MAPE {resultado['mape']:.2f}% ≤ 6%")
        
        # Log resumo
        mape_medio = np.mean([r['mape'] for r in resultados.values()])
        logger.info(f"📊 RESUMO: MAPE médio de {mape_medio:.2f}% para todas as commodities")
    
    def test_explicacao_previsoes(self):
        """Testa se as previsões incluem explicações claras (transparência)"""
        logger.info("Testando transparência das previsões")
        
        previsor = self.previsores["soja"]
        
        # Carregar dados e treinar modelo
        previsor.carregar_dados()
        previsor.treinar_modelo()
        
        # Fazer previsões
        datas_futuras = [datetime.now() + timedelta(days=i) for i in range(1, 8)]
        previsoes = previsor.prever(datas_futuras)
        
        # Gerar relatório
        relatorio = previsor.gerar_relatorio(previsoes)
        
        # Verificar transparência
        assert 'estatisticas' in relatorio
        assert 'previsoes' in relatorio
        assert 'commodity' in relatorio
        assert 'periodo_previsao' in relatorio
        
        # Verificar que cada previsão tem intervalo de confiança
        for previsao in previsoes:
            assert 'confianca' in previsao
            assert 'limite_inferior' in previsao
            assert 'limite_superior' in previsao
            assert previsao['confianca'] == 0.95  # 95% de confiança
        
        logger.info("✅ TRANSPARÊNCIA: Previsões incluem explicações e intervalos de confiança")
    
    def test_rastreabilidade_modelo(self):
        """Testa se o modelo pode ser salvo e carregado para auditoria"""
        logger.info("Testando rastreabilidade do modelo")
        
        previsor = self.previsores["soja"]
        
        # Carregar dados e treinar modelo
        previsor.carregar_dados()
        metricas_originais = previsor.treinar_modelo()
        
        # Salvar modelo
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as f:
            caminho_modelo = f.name
        
        try:
            # Salvar
            sucesso_salvar = previsor.salvar_modelo(caminho_modelo)
            assert sucesso_salvar, "Falha ao salvar modelo"
            
            # Carregar em novo previsor
            novo_previsor = PrevisorDePrecos("teste")
            sucesso_carregar = novo_previsor.carregar_modelo(caminho_modelo)
            assert sucesso_carregar, "Falha ao carregar modelo"
            
            # Verificar que modelo carregado funciona
            assert novo_previsor.modelo_treinado
            assert novo_previsor.commodity == "soja"
            
            logger.info("✅ RASTREABILIDADE: Modelo pode ser salvo e carregado para auditoria")
            
        finally:
            if os.path.exists(caminho_modelo):
                os.unlink(caminho_modelo)
    
    def test_relatorio_detalhado(self):
        """Gera relatório detalhado dos testes de validação"""
        logger.info("Gerando relatório detalhado de validação")
        
        relatorio_final = {
            'timestamp': datetime.now().isoformat(),
            'criterios': {
                'mape_curto_prazo': '≤ 6%',
                'mape_longo_prazo': '≤ 1,5%',
                'periodo_curto': '3 meses',
                'periodo_longo': '1 ano'
            },
            'resultados': {}
        }
        
        for commodity in self.commodities:
            previsor = self.previsores[commodity]
            previsor.carregar_dados()
            metricas = previsor.treinar_modelo()
            
            relatorio_final['resultados'][commodity] = {
                'r2_treino': metricas['r2'],
                'rmse_treino': metricas['rmse'],
                'samples_treino': metricas['samples_treino'],
                'samples_teste': metricas['samples_teste']
            }
        
        logger.info("📋 RELATÓRIO DETALHADO DE VALIDAÇÃO:")
        logger.info(f"Timestamp: {relatorio_final['timestamp']}")
        logger.info(f"Critérios: {relatorio_final['criterios']}")
        
        for commodity, resultado in relatorio_final['resultados'].items():
            logger.info(f"{commodity.upper()}: R²={resultado['r2_treino']:.3f}, RMSE={resultado['rmse_treino']:.2f}")
        
        assert len(relatorio_final['resultados']) == len(self.commodities)
        logger.info("✅ RELATÓRIO: Validação completa realizada") 