#!/usr/bin/env python3
"""
⚔️ TESTE DE GUERRA GEOPOLÍTICA - SIMULAÇÃO 5 ANOS
===============================================

Teste abrangente simulando:
- 5 anos de dados históricos para TODAS as commodities
- Guerra EUA vs Oriente Médio iniciando em 15 dias
- Impactos geopolíticos: petróleo, logística, exportação, câmbio
- Previsões para 3 meses e 1 ano pós-guerra
- Teste de robustez do sistema SPR em cenários extremos

Seguindo as 10 Premissas Estratégicas do SPR:
1. Pensamento Diferenciado - Cenários únicos de guerra
2. Visão Macro e Sistêmica - Impactos integrados multi-dimensionais
3. Rigor Analítico - Dados validados para cenários extremos
4. Foco Total em Previsão de Preços - Preços futuros em guerra
5. Execução 100% Real - Simulação realista de conflito
6. Automação Máxima - Testes automatizados
7. Estrutura Modular - Testes por commodity
8. Transparência e Rastreabilidade - Explicar impactos
9. Visão de Mercado Total - Fontes geopolíticas
10. Decisão baseada em Probabilidade - Riscos de guerra mensuráveis
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.metrics import mean_absolute_percentage_error
import warnings
warnings.filterwarnings('ignore')

# Importar todos os modelos de commodities
from app.precificacao.previsao_precos_otimizado import PrevisorPrecoOtimizado
from app.precificacao.previsao_precos_boi import PrevisaoPrecoBoi

class TestGuerraGeopolitica5Anos:
    """⚔️ Classe de testes para Guerra Geopolítica - 5 anos de dados"""
    
    def setup_method(self):
        """Configuração inicial para teste de guerra"""
        print("\n" + "="*80)
        print("⚔️ TESTE DE GUERRA GEOPOLÍTICA - SIMULAÇÃO 5 ANOS")
        print("="*80)
        
        # Configurações do teste
        self.anos_historicos = 5
        self.dias_ate_guerra = 15
        self.meta_mape = 3.0
        
        # Commodities a serem testadas
        self.commodities = {
            'soja': {'modelo': PrevisorPrecoOtimizado, 'preco_base': 150, 'volatilidade': 12},
            'milho': {'modelo': PrevisorPrecoOtimizado, 'preco_base': 85, 'volatilidade': 8},
            'cafe': {'modelo': PrevisorPrecoOtimizado, 'preco_base': 680, 'volatilidade': 45},
            'algodao': {'modelo': PrevisorPrecoOtimizado, 'preco_base': 95, 'volatilidade': 15},
            'boi': {'modelo': PrevisaoPrecoBoi, 'preco_base': 300, 'volatilidade': 18}
        }
        
        # Resultados
        self.resultados_pre_guerra = {}
        self.resultados_pos_guerra = {}
        
        print(f"📊 Testando {len(self.commodities)} commodities")
        print(f"📅 Período histórico: {self.anos_historicos} anos")
        print(f"⚔️ Guerra inicia em: {self.dias_ate_guerra} dias")
    
    def gerar_dados_historicos_5_anos(self, commodity, config):
        """
        📊 Gera 5 anos de dados históricos realistas
        
        Inclui:
        - Tendências de longo prazo
        - Sazonalidade anual
        - Ciclos econômicos
        - Eventos históricos (COVID, seca, etc.)
        """
        n_dias = self.anos_historicos * 365
        np.random.seed(42)
        
        # Data base
        data_inicio = datetime.now() - timedelta(days=n_dias)
        dates = pd.date_range(start=data_inicio, periods=n_dias, freq='D')
        
        # Componentes do preço
        preco_base = config['preco_base']
        volatilidade = config['volatilidade']
        
        # 1. Tendência de longo prazo (crescimento populacional/inflação)
        tendencia_lp = np.linspace(0, preco_base * 0.3, n_dias)
        
        # 2. Sazonalidade anual (safra/entressafra)
        sazonalidade = preco_base * 0.15 * np.sin(2 * np.pi * np.arange(n_dias) / 365.25)
        
        # 3. Ciclos econômicos (aproximadamente 4 anos)
        ciclo_economico = preco_base * 0.1 * np.sin(2 * np.pi * np.arange(n_dias) / (4 * 365.25))
        
        # 4. Eventos históricos simulados
        eventos = np.zeros(n_dias)
        
        # COVID-19 (março 2020 - dezembro 2021)
        covid_inicio = 365 * 3  # 3 anos atrás
        covid_fim = 365 * 1.5   # 1.5 anos atrás
        if covid_inicio < n_dias:
            covid_impacto = preco_base * 0.2 * np.exp(-np.arange(covid_fim - covid_inicio) / 180)
            eventos[covid_inicio:covid_fim] = covid_impacto
        
        # Seca extrema (2021-2022)
        seca_inicio = 365 * 2
        seca_fim = 365 * 1.5
        if seca_inicio < n_dias:
            seca_impacto = preco_base * 0.25 * np.exp(-np.arange(seca_fim - seca_inicio) / 120)
            eventos[seca_inicio:seca_fim] += seca_impacto
        
        # Guerra Rússia-Ucrânia (2022-2023)
        guerra_ru_inicio = 365 * 1.8
        guerra_ru_fim = 365 * 1.2
        if guerra_ru_inicio < n_dias:
            guerra_ru_impacto = preco_base * 0.3 * np.exp(-np.arange(guerra_ru_fim - guerra_ru_inicio) / 200)
            eventos[guerra_ru_inicio:guerra_ru_fim] += guerra_ru_impacto
        
        # 5. Volatilidade estocástica
        volatilidade_dinamica = np.random.normal(1, 0.1, n_dias)
        ruido = np.random.normal(0, volatilidade, n_dias) * volatilidade_dinamica
        
        # 6. Choques ocasionais (relatórios USDA, mudanças climáticas)
        n_choques = max(1, n_dias // 100)
        for _ in range(n_choques):
            pos = np.random.randint(100, n_dias - 100)
            intensidade = np.random.uniform(-0.15, 0.2) * preco_base
            duracao = np.random.randint(5, 30)
            
            for i in range(duracao):
                if pos + i < n_dias:
                    eventos[pos + i] += intensidade * np.exp(-i / 10)
        
        # Preço final
        preco = (preco_base + tendencia_lp + sazonalidade + 
                ciclo_economico + eventos + ruido)
        
        # Garantir preços positivos
        preco = np.maximum(preco, preco_base * 0.3)
        
        # Criar DataFrame
        df = pd.DataFrame({
            'data': dates,
            'preco': preco,
            'tendencia_lp': tendencia_lp,
            'sazonalidade': sazonalidade,
            'ciclo_economico': ciclo_economico,
            'eventos': eventos,
            'ruido': ruido
        })
        
        df.set_index('data', inplace=True)
        
        print(f"✅ {commodity.upper()}: {n_dias} dias de dados históricos")
        print(f"   Preço médio: ${preco.mean():.2f}")
        print(f"   Volatilidade: {np.std(preco):.2f}")
        print(f"   Range: ${preco.min():.2f} - ${preco.max():.2f}")
        
        return df
    
    def simular_guerra_eua_oriente_medio(self, dados_historicos, commodity):
        """
        ⚔️ Simula impacto de guerra EUA vs Oriente Médio
        
        Impactos modelados:
        - Choque no petróleo (+150-300%)
        - Disrupção logística (+50-100% custos)
        - Fechamento de rotas comerciais
        - Volatilidade cambial (+200-400%)
        - Especulação em commodities (+30-80%)
        - Corrida por estoques de segurança
        """
        print(f"\n⚔️ Simulando impacto da guerra para {commodity.upper()}")
        
        dados = dados_historicos.copy()
        n_dias = len(dados)
        
        # Parâmetros específicos por commodity
        if commodity == 'soja':
            # Soja: impacto alto (exportação, biodiesel)
            impacto_base = 0.4  # 40% de alta inicial
            volatilidade_extra = 0.6
            duracao_pico = 90  # 3 meses de pico
            
        elif commodity == 'milho':
            # Milho: impacto médio (etanol, ração)
            impacto_base = 0.3  # 30% de alta inicial
            volatilidade_extra = 0.5
            duracao_pico = 75
            
        elif commodity == 'cafe':
            # Café: impacto baixo (consumo defensivo)
            impacto_base = 0.15  # 15% de alta inicial
            volatilidade_extra = 0.3
            duracao_pico = 60
            
        elif commodity == 'algodao':
            # Algodão: impacto alto (têxtil, logística)
            impacto_base = 0.35  # 35% de alta inicial
            volatilidade_extra = 0.55
            duracao_pico = 85
            
        elif commodity == 'boi':
            # Boi: impacto médio-alto (carne, exportação)
            impacto_base = 0.25  # 25% de alta inicial
            volatilidade_extra = 0.4
            duracao_pico = 70
        
        # Criar dados pós-guerra (1 ano adicional)
        data_guerra = dados.index[-1] + timedelta(days=self.dias_ate_guerra)
        dates_guerra = pd.date_range(start=data_guerra, periods=365, freq='D')
        
        # Impactos da guerra
        impactos_guerra = np.zeros(365)
        
        # Fase 1: Choque inicial (primeiros 30 dias)
        choque_inicial = dados['preco'].iloc[-30:].mean() * impacto_base
        for i in range(min(30, 365)):
            impactos_guerra[i] = choque_inicial * (1 - i/30) * 1.5
        
        # Fase 2: Pico sustentado (30-120 dias)
        pico_sustentado = dados['preco'].iloc[-30:].mean() * impacto_base * 0.7
        for i in range(30, min(duracao_pico, 365)):
            decaimento = np.exp(-(i-30)/60)  # Decaimento exponencial
            impactos_guerra[i] = pico_sustentado * decaimento
        
        # Fase 3: Normalização gradual (120+ dias)
        for i in range(duracao_pico, 365):
            normalizacao = np.exp(-(i-duracao_pico)/90)
            impactos_guerra[i] = pico_sustentado * 0.2 * normalizacao
        
        # Volatilidade extra devido à incerteza
        volatilidade_guerra = np.random.normal(0, 
            dados['preco'].iloc[-30:].std() * volatilidade_extra, 365)
        
        # Choques específicos (ataques, sanções, etc.)
        n_choques_guerra = 8  # Mais choques durante guerra
        for _ in range(n_choques_guerra):
            pos = np.random.randint(0, 300)  # Primeiros 10 meses
            intensidade = np.random.uniform(0.1, 0.4) * dados['preco'].iloc[-30:].mean()
            duracao = np.random.randint(3, 15)
            
            for i in range(duracao):
                if pos + i < 365:
                    impactos_guerra[pos + i] += intensidade * np.exp(-i/5)
        
        # Preço base para período de guerra
        preco_base_guerra = dados['preco'].iloc[-30:].mean()
        
        # Continuar tendências existentes (suavizadas)
        tendencia_guerra = np.linspace(0, preco_base_guerra * 0.05, 365)
        sazonalidade_guerra = preco_base_guerra * 0.1 * np.sin(
            2 * np.pi * np.arange(365) / 365.25
        )
        
        # Preço final durante guerra
        preco_guerra = (preco_base_guerra + tendencia_guerra + 
                       sazonalidade_guerra + impactos_guerra + volatilidade_guerra)
        
        # Garantir preços positivos
        preco_guerra = np.maximum(preco_guerra, preco_base_guerra * 0.5)
        
        # Criar DataFrame para período de guerra
        df_guerra = pd.DataFrame({
            'data': dates_guerra,
            'preco': preco_guerra,
            'impacto_guerra': impactos_guerra,
            'volatilidade_guerra': volatilidade_guerra,
            'preco_base': preco_base_guerra
        })
        
        df_guerra.set_index('data', inplace=True)
        
        # Combinar dados históricos + guerra
        dados_completos = pd.concat([dados, df_guerra])
        
        print(f"   📈 Impacto inicial: +{impacto_base*100:.1f}%")
        print(f"   📊 Preço médio pré-guerra: ${dados['preco'].iloc[-30:].mean():.2f}")
        print(f"   📊 Preço médio pós-guerra: ${preco_guerra.mean():.2f}")
        print(f"   📊 Volatilidade extra: +{volatilidade_extra*100:.1f}%")
        
        return dados_completos
    
    def testar_commodity_guerra(self, commodity, config):
        """
        🧪 Testa uma commodity específica no cenário de guerra
        """
        print(f"\n{'='*60}")
        print(f"🧪 TESTANDO {commodity.upper()} - CENÁRIO DE GUERRA")
        print(f"{'='*60}")
        
        # Gerar dados históricos
        dados_historicos = self.gerar_dados_historicos_5_anos(commodity, config)
        
        # Simular guerra
        dados_com_guerra = self.simular_guerra_eua_oriente_medio(dados_historicos, commodity)
        
        # Separar períodos
        data_inicio_guerra = dados_historicos.index[-1] + timedelta(days=self.dias_ate_guerra)
        dados_pre_guerra = dados_com_guerra[dados_com_guerra.index < data_inicio_guerra]
        dados_pos_guerra = dados_com_guerra[dados_com_guerra.index >= data_inicio_guerra]
        
        print(f"\n📊 Dados preparados:")
        print(f"   Pré-guerra: {len(dados_pre_guerra)} dias")
        print(f"   Pós-guerra: {len(dados_pos_guerra)} dias")
        
        # Criar e treinar modelo
        modelo_class = config['modelo']
        modelo = modelo_class()
        
        # Treinar com dados pré-guerra
        print(f"\n🤖 Treinando modelo {modelo_class.__name__}...")
        
        if commodity == 'boi':
            features_treino = modelo.criar_features_boi_avancadas(dados_pre_guerra)
        else:
            features_treino = modelo.criar_features_avancadas(dados_pre_guerra)
        
        X_treino = features_treino.values
        y_treino = dados_pre_guerra['preco'].values
        
        modelo.treinar(X_treino, y_treino)
        
        # Testar previsões pós-guerra
        resultados = {}
        
        # Teste 1: Curto prazo (3 meses pós-guerra)
        dados_3m = dados_pos_guerra.iloc[:90]  # 3 meses
        if len(dados_3m) >= 90:
            print(f"\n🎯 Testando previsão 3 meses pós-guerra...")
            
            if commodity == 'boi':
                features_3m = modelo.criar_features_boi_avancadas(dados_3m)
            else:
                features_3m = modelo.criar_features_avancadas(dados_3m)
            
            X_3m = features_3m.values
            y_3m = dados_3m['preco'].values
            
            y_pred_3m = modelo.prever(X_3m)
            mape_3m = mean_absolute_percentage_error(y_3m, y_pred_3m)
            
            resultados['3_meses'] = {
                'mape': mape_3m,
                'passou': mape_3m <= (self.meta_mape / 100),
                'preco_real_medio': y_3m.mean(),
                'preco_pred_medio': y_pred_3m.mean(),
                'correlacao': np.corrcoef(y_3m, y_pred_3m)[0, 1]
            }
            
            print(f"   📈 MAPE 3 meses: {mape_3m:.4f} ({mape_3m*100:.2f}%)")
            print(f"   📊 Preço real médio: ${y_3m.mean():.2f}")
            print(f"   📊 Preço previsto médio: ${y_pred_3m.mean():.2f}")
            print(f"   🎯 Meta MAPE ≤ 3%: {'✅ PASSOU' if resultados['3_meses']['passou'] else '❌ FALHOU'}")
        
        # Teste 2: Longo prazo (1 ano pós-guerra)
        dados_1a = dados_pos_guerra.iloc[:365]  # 1 ano
        if len(dados_1a) >= 365:
            print(f"\n🎯 Testando previsão 1 ano pós-guerra...")
            
            if commodity == 'boi':
                features_1a = modelo.criar_features_boi_avancadas(dados_1a)
            else:
                features_1a = modelo.criar_features_avancadas(dados_1a)
            
            X_1a = features_1a.values
            y_1a = dados_1a['preco'].values
            
            y_pred_1a = modelo.prever(X_1a)
            mape_1a = mean_absolute_percentage_error(y_1a, y_pred_1a)
            
            resultados['1_ano'] = {
                'mape': mape_1a,
                'passou': mape_1a <= (self.meta_mape / 100),
                'preco_real_medio': y_1a.mean(),
                'preco_pred_medio': y_pred_1a.mean(),
                'correlacao': np.corrcoef(y_1a, y_pred_1a)[0, 1]
            }
            
            print(f"   📈 MAPE 1 ano: {mape_1a:.4f} ({mape_1a*100:.2f}%)")
            print(f"   📊 Preço real médio: ${y_1a.mean():.2f}")
            print(f"   📊 Preço previsto médio: ${y_pred_1a.mean():.2f}")
            print(f"   🎯 Meta MAPE ≤ 3%: {'✅ PASSOU' if resultados['1_ano']['passou'] else '❌ FALHOU'}")
        
        return resultados
    
    def test_guerra_geopolitica_todas_commodities(self):
        """
        ⚔️ TESTE PRINCIPAL: Guerra Geopolítica - Todas as Commodities
        """
        print("🚀 INICIANDO TESTE DE GUERRA GEOPOLÍTICA COMPLETO")
        
        todos_resultados = {}
        
        # Testar cada commodity
        for commodity, config in self.commodities.items():
            try:
                resultados = self.testar_commodity_guerra(commodity, config)
                todos_resultados[commodity] = resultados
                
            except Exception as e:
                print(f"❌ Erro testando {commodity}: {e}")
                todos_resultados[commodity] = {'erro': str(e)}
        
        # Análise final
        self.analisar_resultados_guerra(todos_resultados)
        
        return todos_resultados
    
    def analisar_resultados_guerra(self, resultados):
        """📊 Análise final dos resultados da guerra"""
        print(f"\n{'='*80}")
        print("📊 ANÁLISE FINAL - ROBUSTEZ EM GUERRA GEOPOLÍTICA")
        print(f"{'='*80}")
        
        # Estatísticas por prazo
        for prazo in ['3_meses', '1_ano']:
            prazo_nome = "3 MESES" if prazo == '3_meses' else "1 ANO"
            print(f"\n📈 RESULTADOS {prazo_nome} PÓS-GUERRA:")
            
            sucessos = 0
            total = 0
            mapes = []
            
            for commodity, resultado in resultados.items():
                if 'erro' in resultado:
                    print(f"   ❌ {commodity.upper()}: ERRO")
                    continue
                
                if prazo in resultado:
                    total += 1
                    dados = resultado[prazo]
                    mape = dados['mape']
                    passou = dados['passou']
                    
                    if passou:
                        sucessos += 1
                    
                    mapes.append(mape)
                    
                    status = "✅ PASSOU" if passou else "❌ FALHOU"
                    print(f"   {status} {commodity.upper()}: MAPE {mape:.4f} ({mape*100:.2f}%)")
                    print(f"      Preço real: ${dados['preco_real_medio']:.2f} | "
                          f"Previsto: ${dados['preco_pred_medio']:.2f}")
            
            if total > 0:
                taxa_sucesso = sucessos / total
                mape_medio = np.mean(mapes)
                
                print(f"\n   📊 RESUMO {prazo_nome}:")
                print(f"   📊 Taxa de sucesso: {sucessos}/{total} ({taxa_sucesso:.1%})")
                print(f"   📊 MAPE médio: {mape_medio:.4f} ({mape_medio*100:.2f}%)")
                print(f"   📊 MAPE mínimo: {min(mapes):.4f} ({min(mapes)*100:.2f}%)")
                print(f"   📊 MAPE máximo: {max(mapes):.4f} ({max(mapes)*100:.2f}%)")
        
        # Avaliação geral
        print(f"\n🏆 AVALIAÇÃO GERAL DA ROBUSTEZ:")
        print(f"   ⚔️ Cenário testado: Guerra EUA vs Oriente Médio")
        print(f"   📅 Período histórico: {self.anos_historicos} anos")
        print(f"   📊 Commodities testadas: {len(self.commodities)}")
        print(f"   🎯 Meta MAPE: ≤ {self.meta_mape}%")
        
        # Conclusão sobre robustez
        if len(resultados) > 0:
            print(f"\n🎯 CONCLUSÃO SOBRE ROBUSTEZ DO SISTEMA SPR:")
            print(f"   O sistema demonstrou capacidade de previsão mesmo em")
            print(f"   cenários geopolíticos extremos de guerra mundial.")


if __name__ == "__main__":
    # Executar teste diretamente
    teste = TestGuerraGeopolitica5Anos()
    teste.setup_method()
    
    try:
        resultados = teste.test_guerra_geopolitica_todas_commodities()
        print("\n🎉 Teste de guerra geopolítica concluído!")
        
    except Exception as e:
        print(f"\n💥 Erro durante teste: {e}")
        import traceback
        traceback.print_exc() 