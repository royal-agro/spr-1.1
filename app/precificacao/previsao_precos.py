# previsao_precos.py
# 📦 SPR 1.1 – Módulo de Previsão de Preços Futuros Agrícolas

import pandas as pd
import numpy as np
import pickle
import base64
import io
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PrevisorDePrecos:
    """
    Classe para previsão de preços futuros de commodities agrícolas.
    
    Funcionalidades:
    - Carregamento de dados históricos
    - Treinamento de modelo de regressão
    - Previsão de preços futuros
    - Persistência de modelo
    - Geração de relatórios com gráficos
    """
    
    def __init__(self, commodity: str = "soja"):
        """
        Inicializa o previsor para uma commodity específica.
        
        Args:
            commodity: Nome da commodity (soja, milho, etc.)
        """
        self.commodity = commodity
        self.modelo = None
        self.dados_historicos = None
        self.features = ['preco_anterior', 'mes', 'tendencia', 'volatilidade']
        self.modelo_treinado = False
        
    def carregar_dados(self, dados_externos: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Carrega dados históricos para treinamento.
        
        Args:
            dados_externos: DataFrame com dados reais (opcional)
            
        Returns:
            DataFrame com dados históricos processados
        """
        logger.info(f"Carregando dados para {self.commodity}")
        
        if dados_externos is not None:
            self.dados_historicos = dados_externos
        else:
            # Simular dados históricos para desenvolvimento
            self.dados_historicos = self._simular_dados_historicos()
        
        # Processar features
        self.dados_historicos = self._processar_features(self.dados_historicos)
        
        logger.info(f"Dados carregados: {len(self.dados_historicos)} registros")
        return self.dados_historicos
    
    def _simular_dados_historicos(self) -> pd.DataFrame:
        """
        Simula dados históricos para desenvolvimento e testes.
        
        Returns:
            DataFrame com dados simulados
        """
        # Gerar 2 anos de dados diários
        datas = pd.date_range(
            start=datetime.now() - timedelta(days=730),
            end=datetime.now(),
            freq='D'
        )
        
        # Preços base por commodity
        precos_base = {
            'soja': 150.0,
            'milho': 80.0,
            'cafe': 200.0,
            'algodao': 120.0
        }
        
        preco_base = precos_base.get(self.commodity, 100.0)
        
        # Simular série temporal com tendência e sazonalidade
        np.random.seed(42)  # Para reprodutibilidade
        
        dados = []
        preco_atual = preco_base
        
        for i, data in enumerate(datas):
            # Tendência sazonal (alta na entressafra, baixa na safra)
            sazonalidade = 10 * np.sin(2 * np.pi * i / 365)
            
            # Tendência de longo prazo
            tendencia = 0.01 * i
            
            # Ruído aleatório
            ruido = np.random.normal(0, 5)
            
            # Volatilidade baseada no mês (maior volatilidade em períodos de safra)
            volatilidade_mes = 1.5 if data.month in [3, 4, 5] else 1.0
            
            # Calcular preço
            preco_atual = preco_base + sazonalidade + tendencia + (ruido * volatilidade_mes)
            preco_atual = max(preco_atual, preco_base * 0.5)  # Evitar preços muito baixos
            
            dados.append({
                'data': data,
                'preco': preco_atual,
                'volume': np.random.randint(1000, 10000),
                'mes': data.month,
                'ano': data.year,
                'dia_semana': data.weekday()
            })
        
        return pd.DataFrame(dados)
    
    def _processar_features(self, dados: pd.DataFrame) -> pd.DataFrame:
        """
        Processa features para o modelo de ML.
        
        Args:
            dados: DataFrame com dados brutos
            
        Returns:
            DataFrame com features processadas
        """
        df = dados.copy()
        df = df.sort_values('data')
        
        # Feature: preço anterior (lag)
        df['preco_anterior'] = df['preco'].shift(1)
        
        # Feature: tendência (média móvel)
        df['tendencia'] = df['preco'].rolling(window=7).mean()
        
        # Feature: volatilidade (desvio padrão móvel)
        df['volatilidade'] = df['preco'].rolling(window=7).std()
        
        # Feature: sazonalidade (mês)
        df['mes_sin'] = np.sin(2 * np.pi * df['mes'] / 12)
        df['mes_cos'] = np.cos(2 * np.pi * df['mes'] / 12)
        
        # Remover NaN gerados pelas operações de janela
        df = df.dropna()
        
        return df
    
    def treinar_modelo(self, test_size: float = 0.2) -> Dict:
        """
        Treina modelo de regressão linear.
        
        Args:
            test_size: Proporção dos dados para teste
            
        Returns:
            Dict com métricas de performance
        """
        if self.dados_historicos is None:
            raise ValueError("Dados não carregados. Execute carregar_dados() primeiro.")
        
        logger.info("Iniciando treinamento do modelo")
        
        # Preparar features e target
        features = ['preco_anterior', 'mes', 'tendencia', 'volatilidade', 'mes_sin', 'mes_cos']
        X = self.dados_historicos[features]
        y = self.dados_historicos['preco']
        
        # Dividir dados
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, shuffle=False
        )
        
        # Treinar modelo
        self.modelo = LinearRegression()
        self.modelo.fit(X_train, y_train)
        
        # Avaliar performance
        y_pred = self.modelo.predict(X_test)
        
        metricas = {
            'mae': mean_absolute_error(y_test, y_pred),
            'mse': mean_squared_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'r2': self.modelo.score(X_test, y_test),
            'samples_treino': len(X_train),
            'samples_teste': len(X_test)
        }
        
        self.modelo_treinado = True
        
        logger.info(f"Modelo treinado - R²: {metricas['r2']:.3f}, RMSE: {metricas['rmse']:.2f}")
        
        return metricas
    
    def prever(self, datas_futuras: List[datetime], contexto: Optional[Dict] = None) -> List[Dict]:
        """
        Faz previsões para datas futuras.
        
        Args:
            datas_futuras: Lista de datas para previsão
            contexto: Informações adicionais para previsão
            
        Returns:
            Lista com previsões por data
        """
        if not self.modelo_treinado:
            raise ValueError("Modelo não treinado. Execute treinar_modelo() primeiro.")
        
        logger.info(f"Fazendo previsões para {len(datas_futuras)} datas")
        
        previsoes = []
        
        # Usar último preço conhecido como base
        ultimo_preco = self.dados_historicos['preco'].iloc[-1]
        ultima_tendencia = self.dados_historicos['tendencia'].iloc[-1]
        ultima_volatilidade = self.dados_historicos['volatilidade'].iloc[-1]
        
        for data in datas_futuras:
            # Preparar features para previsão
            features_previsao = {
                'preco_anterior': ultimo_preco,
                'mes': data.month,
                'tendencia': ultima_tendencia,
                'volatilidade': ultima_volatilidade,
                'mes_sin': np.sin(2 * np.pi * data.month / 12),
                'mes_cos': np.cos(2 * np.pi * data.month / 12)
            }
            
            # Fazer previsão
            X_pred = np.array([[
                features_previsao['preco_anterior'],
                features_previsao['mes'],
                features_previsao['tendencia'],
                features_previsao['volatilidade'],
                features_previsao['mes_sin'],
                features_previsao['mes_cos']
            ]])
            
            preco_previsto = self.modelo.predict(X_pred)[0]
            
            # Calcular intervalo de confiança (simulado)
            margem_erro = ultima_volatilidade * 1.96  # 95% confiança
            
            previsao = {
                'data': data,
                'preco_previsto': round(preco_previsto, 2),
                'limite_inferior': round(preco_previsto - margem_erro, 2),
                'limite_superior': round(preco_previsto + margem_erro, 2),
                'confianca': 0.95,
                'commodity': self.commodity
            }
            
            previsoes.append(previsao)
            
            # Atualizar último preço para próxima previsão
            ultimo_preco = preco_previsto
        
        return previsoes
    
    def salvar_modelo(self, caminho: str) -> bool:
        """
        Salva modelo treinado em arquivo.
        
        Args:
            caminho: Caminho para salvar o modelo
            
        Returns:
            True se salvou com sucesso
        """
        if not self.modelo_treinado:
            raise ValueError("Modelo não treinado.")
        
        try:
            modelo_data = {
                'modelo': self.modelo,
                'commodity': self.commodity,
                'features': self.features,
                'timestamp': datetime.now()
            }
            
            Path(caminho).parent.mkdir(parents=True, exist_ok=True)
            
            with open(caminho, 'wb') as f:
                pickle.dump(modelo_data, f)
            
            logger.info(f"Modelo salvo em: {caminho}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar modelo: {e}")
            return False
    
    def carregar_modelo(self, caminho: str) -> bool:
        """
        Carrega modelo salvo de arquivo.
        
        Args:
            caminho: Caminho do arquivo do modelo
            
        Returns:
            True se carregou com sucesso
        """
        try:
            with open(caminho, 'rb') as f:
                modelo_data = pickle.load(f)
            
            self.modelo = modelo_data['modelo']
            self.commodity = modelo_data['commodity']
            self.features = modelo_data['features']
            self.modelo_treinado = True
            
            logger.info(f"Modelo carregado de: {caminho}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao carregar modelo: {e}")
            return False
    
    def gerar_relatorio(self, previsoes: List[Dict], incluir_grafico: bool = True) -> Dict:
        """
        Gera relatório com resumo e gráfico das previsões.
        
        Args:
            previsoes: Lista de previsões
            incluir_grafico: Se deve incluir gráfico em base64
            
        Returns:
            Dict com relatório completo
        """
        if not previsoes:
            raise ValueError("Lista de previsões vazia.")
        
        # Calcular estatísticas
        precos_previstos = [p['preco_previsto'] for p in previsoes]
        
        relatorio = {
            'commodity': self.commodity,
            'periodo_previsao': {
                'inicio': previsoes[0]['data'].strftime('%Y-%m-%d'),
                'fim': previsoes[-1]['data'].strftime('%Y-%m-%d'),
                'dias': len(previsoes)
            },
            'estatisticas': {
                'preco_medio': round(np.mean(precos_previstos), 2),
                'preco_minimo': round(np.min(precos_previstos), 2),
                'preco_maximo': round(np.max(precos_previstos), 2),
                'volatilidade': round(np.std(precos_previstos), 2),
                'tendencia': 'alta' if precos_previstos[-1] > precos_previstos[0] else 'baixa'
            },
            'previsoes': previsoes,
            'timestamp': datetime.now().isoformat()
        }
        
        if incluir_grafico:
            relatorio['grafico_base64'] = self._gerar_grafico_base64(previsoes)
        
        return relatorio
    
    def _gerar_grafico_base64(self, previsoes: List[Dict]) -> str:
        """
        Gera gráfico das previsões em formato base64.
        
        Args:
            previsoes: Lista de previsões
            
        Returns:
            String base64 do gráfico
        """
        plt.figure(figsize=(12, 6))
        
        # Dados históricos (últimos 30 dias)
        dados_recentes = self.dados_historicos.tail(30)
        plt.plot(dados_recentes['data'], dados_recentes['preco'], 
                'b-', label='Histórico', linewidth=2)
        
        # Previsões
        datas_prev = [p['data'] for p in previsoes]
        precos_prev = [p['preco_previsto'] for p in previsoes]
        limite_inf = [p['limite_inferior'] for p in previsoes]
        limite_sup = [p['limite_superior'] for p in previsoes]
        
        plt.plot(datas_prev, precos_prev, 'r--', label='Previsão', linewidth=2)
        plt.fill_between(datas_prev, limite_inf, limite_sup, 
                        alpha=0.3, color='red', label='Intervalo de Confiança')
        
        # Formatação
        plt.title(f'Previsão de Preços - {self.commodity.title()}', fontsize=16)
        plt.xlabel('Data', fontsize=12)
        plt.ylabel('Preço (R$/saca)', fontsize=12)
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Formatar eixo x
        plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        plt.gca().xaxis.set_major_locator(mdates.DayLocator(interval=7))
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        
        # Converter para base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        
        grafico_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        plt.close()
        
        return grafico_base64 