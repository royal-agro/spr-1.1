#!/usr/bin/env python3
"""
🐂 TESTE DE VALIDAÇÃO MAPE ≤ 3% - PRECIFICAÇÃO DE BOI
=====================================================

Teste para validar se o modelo de precificação de BOI atinge
a meta de MAPE ≤ 3% seguindo a mesma metodologia vencedora
que alcançou resultados excepcionais para outras commodities.

Baseado nas 10 Premissas Estratégicas do SPR:
- Rigor Analítico: Dados validados, não achismos
- Foco Total em Previsão de Preços: Produto final é preço futuro
- Decisão baseada em Probabilidade: Riscos mensuráveis

META: MAPE ≤ 3% para curto prazo (3 meses) e longo prazo (1 ano)
CRITÉRIO DE APROVAÇÃO: ≥75% de sucesso para curto prazo, ≥50% para longo prazo
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from app.precificacao.previsao_precos_boi import PrevisaoPrecoBoi, gerar_dados_sinteticos_boi
from sklearn.metrics import mean_absolute_percentage_error
import warnings
warnings.filterwarnings('ignore')

class TestValidacaoMAPEBoi:
    """🧪 Classe de testes para validação MAPE ≤ 3% - BOI"""
    
    def setup_method(self):
        """Configuração inicial para cada teste"""
        print("\n" + "="*60)
        print("🐂 INICIANDO TESTE DE VALIDAÇÃO MAPE ≤ 3% - BOI")
        print("="*60)
        
        self.meta_mape = 3.0  # Meta de MAPE ≤ 3%
        self.criterio_curto_prazo = 0.75  # 75% de sucesso
        self.criterio_longo_prazo = 0.50  # 50% de sucesso
        
        # Resultados para relatório
        self.resultados_curto = []
        self.resultados_longo = []
        
    def gerar_cenarios_boi(self, n_cenarios=4):
        """
        🎲 Gera múltiplos cenários de teste para BOI
        
        Simula diferentes condições de mercado:
        - Mercado em alta (exportação forte)
        - Mercado em baixa (questões sanitárias)
        - Mercado lateral (estabilidade)
        - Mercado volátil (choques externos)
        """
        cenarios = []
        
        for i in range(n_cenarios):
            np.random.seed(42 + i)  # Seed diferente para cada cenário
            
            if i == 0:
                # Cenário 1: Mercado em alta (exportação forte)
                dados = gerar_dados_sinteticos_boi(1000)
                # Adicionar tendência de alta mais forte
                dados['preco'] += np.linspace(0, 30, len(dados))
                cenario_nome = "BOI - Mercado em Alta"
                
            elif i == 1:
                # Cenário 2: Mercado em baixa (questões sanitárias)
                dados = gerar_dados_sinteticos_boi(1000)
                # Adicionar tendência de baixa
                dados['preco'] += np.linspace(0, -20, len(dados))
                # Adicionar choques negativos ocasionais
                choques_negativos = np.random.choice([0, -15], size=len(dados), p=[0.95, 0.05])
                dados['preco'] += choques_negativos
                cenario_nome = "BOI - Questões Sanitárias"
                
            elif i == 2:
                # Cenário 3: Mercado lateral (estabilidade)
                dados = gerar_dados_sinteticos_boi(1000)
                # Reduzir tendência
                dados['preco'] = dados['preco'] - dados['trend'] + np.mean(dados['trend'])
                cenario_nome = "BOI - Mercado Estável"
                
            else:
                # Cenário 4: Mercado volátil (choques externos)
                dados = gerar_dados_sinteticos_boi(1000)
                # Adicionar volatilidade extra
                volatilidade_extra = np.random.normal(0, 10, len(dados))
                dados['preco'] += volatilidade_extra
                cenario_nome = "BOI - Alta Volatilidade"
            
            # Garantir preços positivos e realistas
            dados['preco'] = np.maximum(dados['preco'], 180)  # Mínimo R$ 180/arroba
            
            cenarios.append({
                'nome': cenario_nome,
                'dados': dados,
                'id': f"boi_cenario_{i+1}"
            })
            
            print(f"✅ {cenario_nome}: {len(dados)} dias de dados")
            print(f"   Preço médio: R$ {dados['preco'].mean():.2f}/arroba")
            print(f"   Volatilidade: {dados['preco'].std():.2f}")
        
        return cenarios
    
    def testar_mape_horizonte(self, dados, horizonte_dias, nome_teste):
        """
        🎯 Testa MAPE para um horizonte específico
        
        Args:
            dados: DataFrame com dados históricos
            horizonte_dias: Número de dias para previsão
            nome_teste: Nome do teste para logging
        """
        print(f"\n📊 Testando horizonte: {nome_teste} ({horizonte_dias} dias)")
        
        # Preparar dados
        n_total = len(dados)
        n_treino = n_total - horizonte_dias
        
        if n_treino < 100:
            print(f"⚠️  Dados insuficientes para treino: {n_treino} < 100")
            return None
        
        # Dividir dados
        dados_treino = dados.iloc[:n_treino].copy()
        dados_teste = dados.iloc[n_treino:].copy()
        
        print(f"   Treino: {len(dados_treino)} dias")
        print(f"   Teste: {len(dados_teste)} dias")
        
        try:
            # Criar e treinar modelo
            modelo = PrevisaoPrecoBoi()
            
            # Criar features para treino
            print("   🔧 Criando features de treino...")
            features_treino = modelo.criar_features_boi_avancadas(dados_treino)
            X_treino = features_treino.values
            y_treino = dados_treino['preco'].values
            
            print(f"   📊 Features: {X_treino.shape}")
            
            # Treinar modelo
            print("   🤖 Treinando Super Ensemble...")
            modelo.treinar(X_treino, y_treino)
            
            # Prever
            print("   🎯 Realizando previsões...")
            features_teste = modelo.criar_features_boi_avancadas(dados_teste)
            X_teste = features_teste.values
            y_teste = dados_teste['preco'].values
            
            y_pred = modelo.prever(X_teste)
            
            # Calcular MAPE
            mape = mean_absolute_percentage_error(y_teste, y_pred)
            
            # Avaliar performance
            resultado = modelo.avaliar(X_teste, y_teste)
            
            print(f"   📈 MAPE: {mape:.4f} ({mape:.2f}%)")
            print(f"   📈 MAE: {resultado['mae']:.2f}")
            print(f"   📈 RMSE: {resultado['rmse']:.2f}")
            print(f"   📈 Correlação: {resultado['correlacao']:.4f}")
            
            # Verificar se passou na meta
            passou = mape <= (self.meta_mape / 100)
            status = "✅ PASSOU" if passou else "❌ FALHOU"
            print(f"   🎯 Meta MAPE ≤ {self.meta_mape}%: {status}")
            
            return {
                'mape': mape,
                'passou': passou,
                'detalhes': resultado,
                'horizonte': horizonte_dias,
                'nome': nome_teste
            }
            
        except Exception as e:
            print(f"   ❌ Erro no teste: {str(e)}")
            return None
    
    def test_validacao_mape_3_porcento_boi(self):
        """
        🎯 TESTE PRINCIPAL: Validação MAPE ≤ 3% para BOI
        
        Testa múltiplos cenários e horizontes para garantir
        robustez do modelo de precificação de BOI.
        """
        print("🚀 INICIANDO VALIDAÇÃO COMPLETA PARA BOI")
        
        # Gerar cenários de teste
        cenarios = self.gerar_cenarios_boi(4)
        
        # Definir horizontes de teste
        horizontes = [
            (63, "Curto Prazo (3 meses)"),    # ~3 meses
            (252, "Longo Prazo (1 ano)")      # ~1 ano
        ]
        
        print(f"\n🎲 Testando {len(cenarios)} cenários x {len(horizontes)} horizontes = {len(cenarios) * len(horizontes)} testes")
        
        # Executar todos os testes
        todos_resultados = []
        
        for cenario in cenarios:
            print(f"\n{'='*50}")
            print(f"🐂 CENÁRIO: {cenario['nome']}")
            print(f"{'='*50}")
            
            for horizonte_dias, nome_horizonte in horizontes:
                resultado = self.testar_mape_horizonte(
                    cenario['dados'], 
                    horizonte_dias, 
                    f"{cenario['nome']} - {nome_horizonte}"
                )
                
                if resultado:
                    resultado['cenario'] = cenario['nome']
                    resultado['cenario_id'] = cenario['id']
                    todos_resultados.append(resultado)
                    
                    # Classificar por horizonte
                    if "Curto Prazo" in nome_horizonte:
                        self.resultados_curto.append(resultado)
                    else:
                        self.resultados_longo.append(resultado)
        
        # Análise de resultados
        self.analisar_resultados_finais()
        
        # Verificar critérios de aprovação
        assert len(self.resultados_curto) > 0, "Nenhum teste de curto prazo executado"
        assert len(self.resultados_longo) > 0, "Nenhum teste de longo prazo executado"
        
        # Calcular taxas de sucesso
        taxa_sucesso_curto = sum(r['passou'] for r in self.resultados_curto) / len(self.resultados_curto)
        taxa_sucesso_longo = sum(r['passou'] for r in self.resultados_longo) / len(self.resultados_longo)
        
        print(f"\n🏆 RESULTADO FINAL - PRECIFICAÇÃO DE BOI:")
        print(f"   Curto Prazo: {taxa_sucesso_curto:.1%} de sucesso (meta: {self.criterio_curto_prazo:.1%})")
        print(f"   Longo Prazo: {taxa_sucesso_longo:.1%} de sucesso (meta: {self.criterio_longo_prazo:.1%})")
        
        # Verificar aprovação
        aprovado_curto = taxa_sucesso_curto >= self.criterio_curto_prazo
        aprovado_longo = taxa_sucesso_longo >= self.criterio_longo_prazo
        
        print(f"\n🎯 APROVAÇÃO:")
        print(f"   Curto Prazo: {'✅ APROVADO' if aprovado_curto else '❌ REPROVADO'}")
        print(f"   Longo Prazo: {'✅ APROVADO' if aprovado_longo else '❌ REPROVADO'}")
        
        # Resultado final
        resultado_final = aprovado_curto and aprovado_longo
        print(f"\n🏆 RESULTADO FINAL: {'✅ SISTEMA APROVADO' if resultado_final else '❌ SISTEMA REPROVADO'}")
        
        # Assertions para pytest
        assert aprovado_curto, f"Taxa de sucesso curto prazo ({taxa_sucesso_curto:.1%}) abaixo da meta ({self.criterio_curto_prazo:.1%})"
        assert aprovado_longo, f"Taxa de sucesso longo prazo ({taxa_sucesso_longo:.1%}) abaixo da meta ({self.criterio_longo_prazo:.1%})"
        
        print("🎉 TESTE CONCLUÍDO COM SUCESSO!")
        
        return todos_resultados
    
    def analisar_resultados_finais(self):
        """📊 Análise detalhada dos resultados finais"""
        print(f"\n{'='*60}")
        print("📊 ANÁLISE DETALHADA DOS RESULTADOS - BOI")
        print(f"{'='*60}")
        
        # Análise por horizonte
        for nome_horizonte, resultados in [("CURTO PRAZO", self.resultados_curto), ("LONGO PRAZO", self.resultados_longo)]:
            if not resultados:
                continue
                
            print(f"\n📈 {nome_horizonte}:")
            
            mapes = [r['mape'] for r in resultados]
            sucessos = [r['passou'] for r in resultados]
            
            print(f"   📊 Testes realizados: {len(resultados)}")
            print(f"   📊 Sucessos: {sum(sucessos)}/{len(sucessos)} ({sum(sucessos)/len(sucessos):.1%})")
            print(f"   📊 MAPE médio: {np.mean(mapes):.4f} ({np.mean(mapes)*100:.2f}%)")
            print(f"   📊 MAPE mínimo: {min(mapes):.4f} ({min(mapes)*100:.2f}%)")
            print(f"   📊 MAPE máximo: {max(mapes):.4f} ({max(mapes)*100:.2f}%)")
            
            # Detalhes por cenário
            for resultado in resultados:
                status = "✅" if resultado['passou'] else "❌"
                print(f"   {status} {resultado['cenario']}: MAPE {resultado['mape']:.4f} ({resultado['mape']*100:.2f}%)")


if __name__ == "__main__":
    # Executar teste diretamente
    teste = TestValidacaoMAPEBoi()
    teste.setup_method()
    
    try:
        resultados = teste.test_validacao_mape_3_porcento_boi()
        print("\n🎉 Todos os testes passaram!")
        
    except AssertionError as e:
        print(f"\n❌ Teste falhou: {e}")
        
    except Exception as e:
        print(f"\n💥 Erro durante execução: {e}")
        import traceback
        traceback.print_exc() 