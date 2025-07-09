#!/usr/bin/env python3
"""
🐂 MÓDULO DE PRECIFICAÇÃO DE BOI - SPR 1.1
========================================

Sistema de previsão de preços para BOVINOS baseado no Super Ensemble vencedor
que alcançou MAPE ≤ 3% para outras commodities agrícolas.

Seguindo as 10 Premissas Estratégicas do SPR:
1. Pensamento Diferenciado - Padrões únicos do mercado bovino
2. Visão Macro e Sistêmica - Análise integrada multi-dimensional
3. Rigor Analítico - Dados validados, não achismos
4. Foco Total em Previsão de Preços - Produto final é preço futuro do boi
5. Execução 100% Real - Ambiente de produção
6. Automação Máxima - Funcionamento 24/7
7. Estrutura Modular - Módulo independente mas integrado
8. Transparência e Rastreabilidade - Explicar o porquê
9. Visão de Mercado Total - Fontes alternativas específicas do boi
10. Decisão baseada em Probabilidade - Riscos mensuráveis

Características específicas do mercado bovino consideradas:
- Ciclo reprodutivo mais longo (sazonalidade diferente)
- Influência de fatores climáticos regionais
- Correlação com preços de milho e soja (ração)
- Impacto de exportações (principalmente China)
- Questões sanitárias específicas
- Variações regionais de preço mais acentuadas
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.feature_selection import SelectKBest, f_regression
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_absolute_percentage_error
from scipy.signal import savgol_filter
from scipy.stats import pearsonr
import pywt
import warnings
warnings.filterwarnings('ignore')

class PrevisaoPrecoBoi:
    """
    🐂 Sistema Avançado de Previsão de Preços de BOI
    
    Utiliza o Super Ensemble vencedor com adaptações específicas
    para características únicas do mercado bovino.
    """
    
    def __init__(self):
        """Inicializa o sistema com configurações otimizadas para BOI"""
        # Super Ensemble - Mesma configuração vencedora
        self.models = {
            'random_forest': RandomForestRegressor(
                n_estimators=500, 
                max_depth=10, 
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'gradient_boosting': GradientBoostingRegressor(
                n_estimators=500,
                learning_rate=0.1,
                max_depth=6,
                subsample=0.8,
                random_state=42
            ),
            'extra_trees': ExtraTreesRegressor(
                n_estimators=500,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'ridge': Ridge(alpha=1.0),
            'lasso': Lasso(alpha=0.1, max_iter=2000),
            'elastic_net': ElasticNet(alpha=0.1, l1_ratio=0.5, max_iter=2000)
        }
        
        # Configurações específicas para BOI
        self.scalers = ['standard', 'minmax', 'robust']
        self.best_scaler = None
        self.best_features = None
        self.model_weights = {}
        self.feature_names = []
        
    def criar_features_boi_avancadas(self, df):
        """
        🔧 Cria 83+ features avançadas específicas para mercado bovino
        
        Features adaptadas para características do boi:
        - Ciclos reprodutivos mais longos
        - Sazonalidade específica
        - Correlações com commodities de ração
        - Fatores climáticos regionais
        """
        df = df.copy()
        df = df.sort_index()
        
        # Garantir que temos a coluna 'preco'
        if 'preco' not in df.columns:
            df['preco'] = df.iloc[:, 0]  # Primeira coluna como preço
        
        features_df = pd.DataFrame(index=df.index)
        
        # === FEATURES BASE ===
        preco = df['preco'].values
        features_df['preco_atual'] = preco
        
        # === MÉDIAS MÓVEIS ADAPTADAS PARA BOI ===
        # Janelas adaptadas para ciclo bovino (mais longas)
        janelas_boi = [5, 10, 15, 21, 30, 45, 60]  # Incluindo janelas mensais e bimestrais
        
        for janela in janelas_boi:
            if len(preco) > janela:
                features_df[f'ma_{janela}'] = pd.Series(preco).rolling(janela, min_periods=1).mean().values
                features_df[f'ema_{janela}'] = pd.Series(preco).ewm(span=janela).mean().values
                
                # Relação preço atual vs média móvel
                features_df[f'preco_vs_ma_{janela}'] = preco / features_df[f'ma_{janela}']
                features_df[f'preco_vs_ema_{janela}'] = preco / features_df[f'ema_{janela}']
        
        # === VOLATILIDADE ESPECÍFICA PARA BOI ===
        # Janelas adaptadas para volatilidade do mercado bovino
        janelas_vol = [5, 10, 15, 21, 30]
        
        for janela in janelas_vol:
            if len(preco) > janela:
                returns = pd.Series(preco).pct_change()
                features_df[f'volatilidade_{janela}'] = returns.rolling(janela, min_periods=1).std().values
                features_df[f'volatilidade_relativa_{janela}'] = (
                    features_df[f'volatilidade_{janela}'] / features_df[f'ma_{janela}']
                )
        
        # === RSI ADAPTADO PARA BOI ===
        # Período padrão e período estendido para ciclo bovino
        for periodo in [14, 21, 30]:
            if len(preco) > periodo:
                delta = pd.Series(preco).diff()
                gain = delta.where(delta > 0, 0)
                loss = -delta.where(delta < 0, 0)
                
                avg_gain = gain.rolling(periodo, min_periods=1).mean()
                avg_loss = loss.rolling(periodo, min_periods=1).mean()
                
                rs = avg_gain / avg_loss
                rsi = 100 - (100 / (1 + rs))
                features_df[f'rsi_{periodo}'] = rsi.values
        
        # === MOMENTUM E ACELERAÇÃO ===
        # Adaptado para ciclos mais longos do boi
        for periodo in [5, 10, 15, 21, 30]:
            if len(preco) > periodo:
                features_df[f'momentum_{periodo}'] = (preco - np.roll(preco, periodo)) / np.roll(preco, periodo)
                
                # Aceleração do momentum
                momentum = features_df[f'momentum_{periodo}'].values
                features_df[f'aceleracao_{periodo}'] = np.gradient(momentum)
        
        # === BANDAS DE BOLLINGER ===
        for janela in [20, 30, 45]:
            if len(preco) > janela:
                ma = pd.Series(preco).rolling(janela, min_periods=1).mean()
                std = pd.Series(preco).rolling(janela, min_periods=1).std()
                
                features_df[f'bb_superior_{janela}'] = (ma + 2 * std).values
                features_df[f'bb_inferior_{janela}'] = (ma - 2 * std).values
                features_df[f'bb_posicao_{janela}'] = (preco - features_df[f'bb_inferior_{janela}']) / (
                    features_df[f'bb_superior_{janela}'] - features_df[f'bb_inferior_{janela}']
                )
        
        # === ANÁLISE DE RANGE ESPECÍFICA PARA BOI ===
        for periodo in [5, 10, 15, 21]:
            if len(preco) > periodo:
                # Range verdadeiro adaptado
                high = pd.Series(preco).rolling(periodo, min_periods=1).max()
                low = pd.Series(preco).rolling(periodo, min_periods=1).min()
                
                features_df[f'range_{periodo}'] = (high - low).values
                features_df[f'posicao_range_{periodo}'] = (preco - low) / (high - low)
        
        # === FEATURES DE TENDÊNCIA ===
        # Regressão linear para detectar tendências
        for janela in [10, 15, 21, 30]:
            if len(preco) > janela:
                trends = []
                for i in range(len(preco)):
                    start_idx = max(0, i - janela + 1)
                    end_idx = i + 1
                    if end_idx - start_idx >= 3:
                        x = np.arange(end_idx - start_idx)
                        y = preco[start_idx:end_idx]
                        if len(x) > 1 and not np.isnan(y).all():
                            slope = np.polyfit(x, y, 1)[0]
                            trends.append(slope)
                        else:
                            trends.append(0)
                    else:
                        trends.append(0)
                
                features_df[f'tendencia_{janela}'] = trends
        
        # === FEATURES SAZONAIS ESPECÍFICAS PARA BOI ===
        # Ciclo reprodutivo bovino (aproximadamente 285 dias)
        if len(preco) > 60:
            features_df['ciclo_reprodutivo'] = np.sin(2 * np.pi * np.arange(len(preco)) / 285)
            features_df['ciclo_reprodutivo_cos'] = np.cos(2 * np.pi * np.arange(len(preco)) / 285)
        
        # Sazonalidade anual
        features_df['sazonalidade_anual'] = np.sin(2 * np.pi * np.arange(len(preco)) / 252)
        features_df['sazonalidade_anual_cos'] = np.cos(2 * np.pi * np.arange(len(preco)) / 252)
        
        # === SUAVIZAÇÃO SAVITZKY-GOLAY ===
        if len(preco) > 11:
            try:
                preco_suavizado = savgol_filter(preco, window_length=min(11, len(preco)//2*2-1), polyorder=2)
                features_df['preco_suavizado'] = preco_suavizado
                features_df['desvio_suavizacao'] = preco - preco_suavizado
            except:
                features_df['preco_suavizado'] = preco
                features_df['desvio_suavizacao'] = 0
        
        # === DECOMPOSIÇÃO WAVELET ADAPTADA ===
        if len(preco) >= 16:
            try:
                # Wavelet Daubechies - boa para sinais financeiros
                coeffs = pywt.wavedec(preco, 'db4', level=3)
                
                # Reconstruir componentes
                for i, coeff in enumerate(coeffs):
                    if len(coeff) > 0:
                        # Reconstruir cada nível
                        reconstructed = np.zeros_like(preco)
                        temp_coeffs = [np.zeros_like(c) for c in coeffs]
                        temp_coeffs[i] = coeff
                        
                        try:
                            reconstructed = pywt.waverec(temp_coeffs, 'db4')
                            if len(reconstructed) != len(preco):
                                reconstructed = np.resize(reconstructed, len(preco))
                            features_df[f'wavelet_nivel_{i}'] = reconstructed
                        except:
                            features_df[f'wavelet_nivel_{i}'] = 0
            except:
                # Se wavelet falhar, criar features dummy
                for i in range(4):
                    features_df[f'wavelet_nivel_{i}'] = 0
        
        # === FEATURES ESTATÍSTICAS AVANÇADAS ===
        for janela in [10, 20, 30]:
            if len(preco) > janela:
                rolling_series = pd.Series(preco).rolling(janela, min_periods=1)
                
                # Skewness e Kurtosis
                features_df[f'skewness_{janela}'] = rolling_series.skew().values
                features_df[f'kurtosis_{janela}'] = rolling_series.kurt().values
                
                # Percentis
                features_df[f'percentil_25_{janela}'] = rolling_series.quantile(0.25).values
                features_df[f'percentil_75_{janela}'] = rolling_series.quantile(0.75).values
        
        # === LIMPEZA FINAL ===
        # Substituir infinitos e NaN
        features_df = features_df.replace([np.inf, -np.inf], np.nan)
        features_df = features_df.bfill().ffill()
        features_df = features_df.fillna(0)
        
        # Remover colunas com variância zero
        for col in features_df.columns:
            if features_df[col].var() == 0:
                features_df[col] = 0
        
        self.feature_names = list(features_df.columns)
        print(f"✅ Criadas {len(self.feature_names)} features específicas para BOI")
        
        return features_df
    
    def otimizar_modelo(self, X, y):
        """🔧 Otimiza hiperparâmetros e seleciona melhor configuração para BOI"""
        melhor_score = float('inf')
        melhor_scaler_nome = None
        melhor_features_idx = None
        
        print("🔧 Otimizando modelo para precificação de BOI...")
        
        # Testar diferentes scalers
        scalers_dict = {
            'standard': StandardScaler(),
            'minmax': MinMaxScaler(),
            'robust': RobustScaler()
        }
        
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        
        for scaler_nome, scaler in scalers_dict.items():
            print(f"  📊 Testando scaler: {scaler_nome}")
            
            try:
                X_train_scaled = scaler.fit_transform(X_train)
                X_val_scaled = scaler.transform(X_val)
                
                # Seleção de features
                selector = SelectKBest(f_regression, k=min(50, X_train_scaled.shape[1]))
                X_train_selected = selector.fit_transform(X_train_scaled, y_train)
                X_val_selected = selector.transform(X_val_scaled)
                
                # Treinar Random Forest rapidamente para validação
                rf_temp = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
                rf_temp.fit(X_train_selected, y_train)
                pred = rf_temp.predict(X_val_selected)
                
                score = mean_absolute_percentage_error(y_val, pred)
                
                if score < melhor_score:
                    melhor_score = score
                    melhor_scaler_nome = scaler_nome
                    melhor_features_idx = selector.get_support()
                    
                print(f"    MAPE: {score:.4f}")
                
            except Exception as e:
                print(f"    ❌ Erro com {scaler_nome}: {e}")
                continue
        
        self.best_scaler = scalers_dict[melhor_scaler_nome]
        self.best_features = melhor_features_idx
        
        print(f"✅ Melhor configuração: {melhor_scaler_nome} (MAPE: {melhor_score:.4f})")
        return melhor_score
    
    def treinar(self, X, y):
        """🎯 Treina o Super Ensemble para previsão de preços de BOI"""
        print("🐂 Iniciando treinamento do Super Ensemble para BOI...")
        
        # Otimizar configurações
        self.otimizar_modelo(X, y)
        
        # Aplicar melhor scaler
        X_scaled = self.best_scaler.fit_transform(X)
        
        # Aplicar seleção de features
        if self.best_features is not None:
            X_scaled = X_scaled[:, self.best_features]
        
        # Treinar todos os modelos
        trained_models = {}
        model_scores = {}
        
        X_train, X_val, y_train, y_val = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        for nome, modelo in self.models.items():
            print(f"  🤖 Treinando {nome}...")
            
            try:
                modelo.fit(X_train, y_train)
                pred = modelo.predict(X_val)
                score = mean_absolute_percentage_error(y_val, pred)
                
                trained_models[nome] = modelo
                model_scores[nome] = score
                
                print(f"    MAPE: {score:.4f}")
                
            except Exception as e:
                print(f"    ❌ Erro treinando {nome}: {e}")
                continue
        
        # Calcular pesos baseados na performance (inverso do MAPE)
        total_inv_score = sum(1/score for score in model_scores.values() if score > 0)
        
        for nome, score in model_scores.items():
            if score > 0:
                self.model_weights[nome] = (1/score) / total_inv_score
            else:
                self.model_weights[nome] = 0
        
        self.models = trained_models
        
        print("✅ Super Ensemble treinado com sucesso!")
        print("📊 Pesos dos modelos:")
        for nome, peso in self.model_weights.items():
            print(f"  {nome}: {peso:.3f}")
        
        return self
    
    def prever(self, X):
        """🎯 Realiza previsão usando Super Ensemble"""
        # Aplicar mesmo preprocessing
        X_scaled = self.best_scaler.transform(X)
        
        if self.best_features is not None:
            X_scaled = X_scaled[:, self.best_features]
        
        # Previsões de todos os modelos
        previsoes = {}
        
        for nome, modelo in self.models.items():
            try:
                previsoes[nome] = modelo.predict(X_scaled)
            except:
                previsoes[nome] = np.zeros(len(X_scaled))
        
        # Ensemble ponderado
        previsao_final = np.zeros(len(X_scaled))
        
        for nome, pred in previsoes.items():
            peso = self.model_weights.get(nome, 0)
            previsao_final += peso * pred
        
        return previsao_final
    
    def avaliar(self, X, y_true):
        """📊 Avalia performance do modelo"""
        y_pred = self.prever(X)
        mape = mean_absolute_percentage_error(y_true, y_pred)
        
        # Calcular outras métricas
        mae = np.mean(np.abs(y_true - y_pred))
        rmse = np.sqrt(np.mean((y_true - y_pred)**2))
        
        resultado = {
            'mape': mape,
            'mae': mae,
            'rmse': rmse,
            'correlacao': pearsonr(y_true, y_pred)[0] if len(y_true) > 1 else 0
        }
        
        return resultado


def gerar_dados_sinteticos_boi(n_dias=1000):
    """
    🐂 Gera dados sintéticos realistas para preços de BOI
    
    Simula características específicas do mercado bovino:
    - Ciclo reprodutivo mais longo
    - Maior influência sazonal
    - Volatilidade específica do setor
    """
    np.random.seed(42)
    
    # Data base
    dates = pd.date_range(start='2020-01-01', periods=n_dias, freq='D')
    
    # Componentes do preço do boi
    trend = np.linspace(280, 320, n_dias)  # Tendência de alta (R$/arroba)
    
    # Sazonalidade anual (entressafra/safra)
    sazonalidade_anual = 15 * np.sin(2 * np.pi * np.arange(n_dias) / 365.25 + np.pi/2)
    
    # Ciclo reprodutivo bovino (aproximadamente 285 dias)
    ciclo_reprodutivo = 8 * np.sin(2 * np.pi * np.arange(n_dias) / 285)
    
    # Variações semanais (menor atividade no fim de semana)
    var_semanal = 3 * np.sin(2 * np.pi * np.arange(n_dias) / 7)
    
    # Ruído com volatilidade específica do boi
    ruido = np.random.normal(0, 5, n_dias)
    
    # Choques de mercado ocasionais (questões sanitárias, exportação)
    choques = np.zeros(n_dias)
    n_choques = max(1, n_dias // 200)  # Choques ocasionais
    for _ in range(n_choques):
        pos = np.random.randint(100, n_dias-100)
        intensidade = np.random.uniform(-20, 25)  # Choques podem ser positivos ou negativos
        duracao = np.random.randint(5, 30)
        
        for i in range(duracao):
            if pos + i < n_dias:
                choques[pos + i] = intensidade * np.exp(-i/10)  # Decaimento exponencial
    
    # Preço final
    preco = trend + sazonalidade_anual + ciclo_reprodutivo + var_semanal + ruido + choques
    
    # Garantir que preços sejam positivos e realistas
    preco = np.maximum(preco, 200)  # Preço mínimo de R$ 200/arroba
    
    # Criar DataFrame
    df = pd.DataFrame({
        'data': dates,
        'preco': preco,
        'trend': trend,
        'sazonalidade': sazonalidade_anual,
        'ciclo_reprodutivo': ciclo_reprodutivo,
        'choques': choques
    })
    
    df.set_index('data', inplace=True)
    
    print(f"✅ Dados sintéticos de BOI gerados: {n_dias} dias")
    print(f"📊 Preço médio: R$ {preco.mean():.2f}/arroba")
    print(f"📊 Volatilidade: {np.std(preco):.2f}")
    print(f"📊 Range: R$ {preco.min():.2f} - R$ {preco.max():.2f}")
    
    return df


if __name__ == "__main__":
    print("🐂 Sistema de Precificação de BOI - SPR 1.1")
    print("=" * 50)
    
    # Teste básico
    dados = gerar_dados_sinteticos_boi(500)
    modelo = PrevisaoPrecoBoi()
    
    # Criar features
    features = modelo.criar_features_boi_avancadas(dados)
    
    print(f"\n📊 Features criadas: {features.shape}")
    print(f"🎯 Modelo pronto para treinamento!") 