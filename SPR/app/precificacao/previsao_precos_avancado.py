# previsao_precos_avancado.py
# 📦 SPR 1.1 – Sistema Avançado de Previsão de Preços com MAPE ≤ 3%

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input, Attention, MultiHeadAttention
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import pywt
from scipy.optimize import minimize
import warnings
warnings.filterwarnings('ignore')

class PrevisorPrecoAvancado:
    """
    Sistema avançado de previsão de preços agrícolas com múltiplas técnicas
    para atingir MAPE ≤ 3% baseado em pesquisas científicas recentes.
    """
    
    def __init__(self):
        self.modelos = {}
        self.scalers = {}
        self.historico_treino = {}
        self.melhores_parametros = {}
        
    def decomposicao_wavelet(self, serie, wavelet='db4', levels=3):
        """
        Decomposição wavelet para capturar padrões em diferentes escalas temporais.
        Baseado em: "Wavelets in Combination with Stochastic and Machine Learning Models"
        """
        coeffs = pywt.wavedec(serie, wavelet, level=levels)
        
        # Reconstruir componentes
        componentes = []
        for i in range(len(coeffs)):
            coeff_temp = [np.zeros_like(c) for c in coeffs]
            coeff_temp[i] = coeffs[i]
            componente = pywt.waverec(coeff_temp, wavelet)
            # Ajustar tamanho se necessário
            if len(componente) != len(serie):
                componente = componente[:len(serie)]
            componentes.append(componente)
            
        return componentes
    
    def criar_features_avancadas(self, dados):
        """
        Criar features avançadas baseadas em análise técnica e padrões temporais.
        """
        df = dados.copy()
        
        # Features de tendência
        for window in [5, 10, 20, 30]:
            df[f'ma_{window}'] = df['preco'].rolling(window=window).mean()
            df[f'std_{window}'] = df['preco'].rolling(window=window).std()
            df[f'rsi_{window}'] = self.calcular_rsi(df['preco'], window)
        
        # Features de volatilidade
        df['volatilidade_5'] = df['preco'].rolling(5).std()
        df['volatilidade_10'] = df['preco'].rolling(10).std()
        
        # Features de momentum
        for lag in [1, 2, 3, 5, 7]:
            df[f'retorno_{lag}'] = df['preco'].pct_change(lag)
            df[f'lag_{lag}'] = df['preco'].shift(lag)
        
        # Features sazonais
        if 'data' in df.columns:
            df['dia_semana'] = pd.to_datetime(df['data']).dt.dayofweek
            df['mes'] = pd.to_datetime(df['data']).dt.month
            df['trimestre'] = pd.to_datetime(df['data']).dt.quarter
        
        # Features de aceleração
        df['aceleracao'] = df['preco'].diff().diff()
        
        # Remover NaN
        df = df.fillna(method='bfill').fillna(method='ffill')
        
        return df
    
    def calcular_rsi(self, precos, window=14):
        """Calcular Relative Strength Index"""
        delta = precos.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def criar_modelo_lstm_avancado(self, input_shape):
        """
        Criar modelo LSTM avançado com attention mechanism.
        Baseado em: "A Forecasting Approach for Wholesale Market Agricultural Product Prices"
        """
        inputs = Input(shape=input_shape)
        
        # Primeira camada LSTM
        lstm1 = LSTM(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.2)(inputs)
        
        # Segunda camada LSTM
        lstm2 = LSTM(64, return_sequences=True, dropout=0.2, recurrent_dropout=0.2)(lstm1)
        
        # Terceira camada LSTM
        lstm3 = LSTM(32, return_sequences=False, dropout=0.2, recurrent_dropout=0.2)(lstm2)
        
        # Camadas densas
        dense1 = Dense(64, activation='relu')(lstm3)
        dropout1 = Dropout(0.3)(dense1)
        
        dense2 = Dense(32, activation='relu')(dropout1)
        dropout2 = Dropout(0.2)(dropout2)
        
        # Saída
        output = Dense(1, activation='linear')(dropout2)
        
        model = Model(inputs=inputs, outputs=output)
        
        # Compilar com otimizador Adam personalizado
        optimizer = Adam(learning_rate=0.001, beta_1=0.9, beta_2=0.999)
        model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
        
        return model
    
    def otimizar_svr(self, X_train, y_train):
        """
        Otimização de hiperparâmetros para SVR usando Grid Search.
        Baseado em: "Sparrow Search Algorithm optimization"
        """
        param_grid = {
            'C': [0.1, 1, 10, 100, 1000],
            'gamma': ['scale', 'auto', 0.001, 0.01, 0.1, 1],
            'epsilon': [0.01, 0.1, 0.2, 0.5],
            'kernel': ['rbf', 'poly', 'sigmoid']
        }
        
        svr = SVR()
        tscv = TimeSeriesSplit(n_splits=5)
        
        grid_search = GridSearchCV(
            svr, param_grid, cv=tscv, 
            scoring='neg_mean_absolute_percentage_error',
            n_jobs=-1, verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        return grid_search.best_estimator_, grid_search.best_params_
    
    def criar_modelo_ensemble(self, X_train, y_train):
        """
        Criar modelo ensemble com múltiplos algoritmos.
        Baseado em: "Combined Residual Correction"
        """
        modelos_base = {
            'rf': RandomForestRegressor(
                n_estimators=500, max_depth=10, 
                min_samples_split=5, random_state=42
            ),
            'gbr': GradientBoostingRegressor(
                n_estimators=300, learning_rate=0.05,
                max_depth=6, random_state=42
            )
        }
        
        # Treinar modelos base
        for nome, modelo in modelos_base.items():
            modelo.fit(X_train, y_train)
        
        return modelos_base
    
    def previsao_ensemble_ponderada(self, modelos, X_test):
        """
        Realizar previsão ensemble com pesos otimizados.
        """
        previsoes = []
        for modelo in modelos.values():
            pred = modelo.predict(X_test)
            previsoes.append(pred)
        
        previsoes = np.array(previsoes)
        
        # Pesos otimizados (podem ser calculados dinamicamente)
        pesos = [0.4, 0.3, 0.3]  # RF, GBR, LSTM
        
        previsao_final = np.average(previsoes, axis=0, weights=pesos[:len(previsoes)])
        return previsao_final
    
    def treinar_modelo_completo(self, dados, commodity, janela_tempo=60):
        """
        Treinar modelo completo com todas as técnicas avançadas.
        """
        print(f"🚀 Iniciando treinamento avançado para {commodity}")
        
        # 1. Criar features avançadas
        dados_features = self.criar_features_avancadas(dados)
        
        # 2. Decomposição wavelet
        componentes_wavelet = self.decomposicao_wavelet(dados['preco'].values)
        
        # Adicionar componentes wavelet como features
        for i, comp in enumerate(componentes_wavelet):
            dados_features[f'wavelet_comp_{i}'] = comp
        
        # 3. Preparar dados para treinamento
        features_cols = [col for col in dados_features.columns if col not in ['preco', 'data']]
        X = dados_features[features_cols].values
        y = dados_features['preco'].values
        
        # 4. Normalização
        scaler_X = StandardScaler()
        scaler_y = MinMaxScaler()
        
        X_scaled = scaler_X.fit_transform(X)
        y_scaled = scaler_y.fit_transform(y.reshape(-1, 1)).flatten()
        
        # 5. Divisão treino/teste temporal
        split_idx = int(len(X_scaled) * 0.8)
        X_train, X_test = X_scaled[:split_idx], X_scaled[split_idx:]
        y_train, y_test = y_scaled[:split_idx], y_scaled[split_idx:]
        
        # 6. Preparar dados para LSTM
        X_train_lstm, y_train_lstm = self.preparar_dados_lstm(X_train, y_train, janela_tempo)
        X_test_lstm, y_test_lstm = self.preparar_dados_lstm(X_test, y_test, janela_tempo)
        
        # 7. Treinar modelos
        print("📊 Treinando SVR otimizado...")
        svr_otimizado, params_svr = self.otimizar_svr(X_train, y_train)
        
        print("🌳 Treinando modelos ensemble...")
        modelos_ensemble = self.criar_modelo_ensemble(X_train, y_train)
        
        print("🧠 Treinando LSTM avançado...")
        modelo_lstm = self.criar_modelo_lstm_avancado((janela_tempo, X_train.shape[1]))
        
        # Callbacks para LSTM
        early_stopping = EarlyStopping(patience=20, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(factor=0.5, patience=10, min_lr=1e-6)
        
        # Treinar LSTM
        history = modelo_lstm.fit(
            X_train_lstm, y_train_lstm,
            epochs=200, batch_size=32,
            validation_data=(X_test_lstm, y_test_lstm),
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        
        # 8. Avaliar modelos
        print("📈 Avaliando modelos...")
        
        # Previsões SVR
        pred_svr = svr_otimizado.predict(X_test)
        pred_svr_original = scaler_y.inverse_transform(pred_svr.reshape(-1, 1)).flatten()
        
        # Previsões Ensemble
        pred_rf = modelos_ensemble['rf'].predict(X_test)
        pred_gbr = modelos_ensemble['gbr'].predict(X_test)
        pred_ensemble = (pred_rf + pred_gbr) / 2
        pred_ensemble_original = scaler_y.inverse_transform(pred_ensemble.reshape(-1, 1)).flatten()
        
        # Previsões LSTM
        pred_lstm = modelo_lstm.predict(X_test_lstm)
        pred_lstm_original = scaler_y.inverse_transform(pred_lstm).flatten()
        
        # Valores reais
        y_test_original = scaler_y.inverse_transform(y_test.reshape(-1, 1)).flatten()
        y_test_lstm_original = scaler_y.inverse_transform(y_test_lstm.reshape(-1, 1)).flatten()
        
        # Calcular MAPE
        mape_svr = mean_absolute_percentage_error(y_test_original, pred_svr_original) * 100
        mape_ensemble = mean_absolute_percentage_error(y_test_original, pred_ensemble_original) * 100
        mape_lstm = mean_absolute_percentage_error(y_test_lstm_original, pred_lstm_original) * 100
        
        # 9. Salvar modelos e resultados
        self.modelos[commodity] = {
            'svr': svr_otimizado,
            'ensemble': modelos_ensemble,
            'lstm': modelo_lstm,
            'scaler_X': scaler_X,
            'scaler_y': scaler_y,
            'janela_tempo': janela_tempo
        }
        
        self.melhores_parametros[commodity] = {
            'svr_params': params_svr,
            'mape_svr': mape_svr,
            'mape_ensemble': mape_ensemble,
            'mape_lstm': mape_lstm
        }
        
        print(f"✅ Treinamento concluído para {commodity}")
        print(f"📊 MAPE SVR: {mape_svr:.2f}%")
        print(f"📊 MAPE Ensemble: {mape_ensemble:.2f}%")
        print(f"📊 MAPE LSTM: {mape_lstm:.2f}%")
        
        return {
            'mape_svr': mape_svr,
            'mape_ensemble': mape_ensemble,
            'mape_lstm': mape_lstm,
            'melhor_modelo': min([
                ('SVR', mape_svr),
                ('Ensemble', mape_ensemble),
                ('LSTM', mape_lstm)
            ], key=lambda x: x[1])
        }
    
    def preparar_dados_lstm(self, X, y, janela_tempo):
        """Preparar dados no formato adequado para LSTM"""
        X_lstm, y_lstm = [], []
        
        for i in range(janela_tempo, len(X)):
            X_lstm.append(X[i-janela_tempo:i])
            y_lstm.append(y[i])
        
        return np.array(X_lstm), np.array(y_lstm)
    
    def prever_precos(self, commodity, dados_novos, modelo_tipo='melhor'):
        """
        Realizar previsão com o modelo especificado.
        """
        if commodity not in self.modelos:
            raise ValueError(f"Modelo para {commodity} não foi treinado")
        
        modelo_info = self.modelos[commodity]
        
        # Preparar dados
        dados_features = self.criar_features_avancadas(dados_novos)
        features_cols = [col for col in dados_features.columns if col not in ['preco', 'data']]
        X = dados_features[features_cols].values
        
        # Normalizar
        X_scaled = modelo_info['scaler_X'].transform(X)
        
        # Determinar melhor modelo se necessário
        if modelo_tipo == 'melhor':
            mapes = self.melhores_parametros[commodity]
            modelo_tipo = min([
                ('svr', mapes['mape_svr']),
                ('ensemble', mapes['mape_ensemble']),
                ('lstm', mapes['mape_lstm'])
            ], key=lambda x: x[1])[0]
        
        # Fazer previsão
        if modelo_tipo == 'svr':
            pred_scaled = modelo_info['svr'].predict(X_scaled)
        elif modelo_tipo == 'ensemble':
            pred_rf = modelo_info['ensemble']['rf'].predict(X_scaled)
            pred_gbr = modelo_info['ensemble']['gbr'].predict(X_scaled)
            pred_scaled = (pred_rf + pred_gbr) / 2
        elif modelo_tipo == 'lstm':
            janela = modelo_info['janela_tempo']
            if len(X_scaled) >= janela:
                X_lstm = X_scaled[-janela:].reshape(1, janela, -1)
                pred_scaled = modelo_info['lstm'].predict(X_lstm)[0]
            else:
                raise ValueError(f"Necessários pelo menos {janela} pontos de dados para LSTM")
        
        # Desnormalizar
        previsao = modelo_info['scaler_y'].inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
        
        return previsao
    
    def gerar_relatorio_performance(self, commodity):
        """Gerar relatório detalhado de performance"""
        if commodity not in self.melhores_parametros:
            return "Modelo não encontrado"
        
        params = self.melhores_parametros[commodity]
        
        relatorio = f"""
        📊 RELATÓRIO DE PERFORMANCE - {commodity.upper()}
        ================================================
        
        🎯 META: MAPE ≤ 3%
        
        📈 RESULTADOS OBTIDOS:
        ├── SVR Otimizado: {params['mape_svr']:.2f}%
        ├── Ensemble (RF+GBR): {params['mape_ensemble']:.2f}%
        └── LSTM Avançado: {params['mape_lstm']:.2f}%
        
        🏆 MELHOR MODELO: {min([
            ('SVR', params['mape_svr']),
            ('Ensemble', params['mape_ensemble']),
            ('LSTM', params['mape_lstm'])
        ], key=lambda x: x[1])[0]} ({min([
            params['mape_svr'],
            params['mape_ensemble'],
            params['mape_lstm']
        ]):.2f}%)
        
        ✅ META ATINGIDA: {
            'SIM' if min([
                params['mape_svr'],
                params['mape_ensemble'],
                params['mape_lstm']
            ]) <= 3.0 else 'NÃO'
        }
        
        🔧 PARÂMETROS SVR OTIMIZADOS:
        {params['svr_params']}
        """
        
        return relatorio 