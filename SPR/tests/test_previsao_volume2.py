# test_previsao_volume2.py
# 📦 SPR 1.1 – Testes para Volume 2 do Módulo de Previsão

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.routers.previsao import router as previsao_router
from app.services.whatsapp_previsao import WhatsAppPrevisaoService
from app.services.scheduler_previsao import SchedulerPrevisaoService

# Criar app de teste
app = FastAPI()
app.include_router(previsao_router)

# Criar client de teste
try:
    client = TestClient(app)
except TypeError:
    # Para versões mais antigas do FastAPI
    from starlette.testclient import TestClient as StarletteTestClient
    client = StarletteTestClient(app)

class TestPrevisaoAPI:
    """Testes para API de previsão de preços"""
    
    def test_criar_previsao_soja(self):
        """Testa criação de previsão para soja"""
        response = client.post(
            "/previsao/soja",
            json={
                "dias_futuros": 7,
                "incluir_grafico": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["cultura"] == "soja"
        assert len(data["previsoes"]) == 7
        assert "estatisticas" in data
        assert "periodo_previsao" in data
        assert "timestamp" in data
        assert "grafico_base64" in data
        
        # Verificar estrutura das previsões
        for previsao in data["previsoes"]:
            assert "data" in previsao
            assert "preco_previsto" in previsao
            assert "limite_inferior" in previsao
            assert "limite_superior" in previsao
            assert "confianca" in previsao
            assert "commodity" in previsao
    
    def test_criar_previsao_cultura_invalida(self):
        """Testa criação de previsão para cultura inválida"""
        response = client.post(
            "/previsao/cultura_inexistente",
            json={"dias_futuros": 7}
        )
        
        assert response.status_code == 400
        assert "não suportada" in response.json()["detail"]
    
    def test_criar_previsao_dias_invalidos(self):
        """Testa criação de previsão com dias inválidos"""
        response = client.post(
            "/previsao/soja",
            json={"dias_futuros": 400}  # Mais que 365
        )
        
        assert response.status_code == 400
        assert "deve estar entre 1 e 365" in response.json()["detail"]
    
    def test_criar_previsao_formato_pdf(self):
        """Testa criação de previsão em formato PDF"""
        response = client.post(
            "/previsao/milho?format=pdf",
            json={"dias_futuros": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["cultura"] == "milho"
        assert "pdf_base64" in data
        assert "timestamp" in data
    
    def test_obter_resumo_previsao(self):
        """Testa obtenção de resumo de previsão"""
        response = client.get("/previsao/soja/resumo?dias_futuros=7")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["cultura"] == "soja"
        assert "preco_medio" in data
        assert "tendencia" in data
        assert "volatilidade" in data
        assert data["dias_previsao"] == 7
        assert "timestamp" in data
    
    def test_obter_metricas_modelo(self):
        """Testa obtenção de métricas do modelo"""
        response = client.get("/previsao/soja/metricas")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["cultura"] == "soja"
        assert "metricas" in data
        assert "timestamp_treinamento" in data
        assert data["modelo_ativo"] is True
        
        # Verificar métricas
        metricas = data["metricas"]
        assert "mae" in metricas
        assert "mse" in metricas
        assert "rmse" in metricas
        assert "r2" in metricas
    
    def test_retreinar_modelo(self):
        """Testa retreinamento de modelo"""
        response = client.post("/previsao/milho/retreinar")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["cultura"] == "milho"
        assert data["status"] == "retreinado"
        assert "metricas" in data
        assert "timestamp_treinamento" in data
    
    def test_listar_culturas(self):
        """Testa listagem de culturas suportadas"""
        response = client.get("/previsao/culturas")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "culturas" in data
        assert "total" in data
        assert "modelos_ativos" in data
        
        # Verificar culturas esperadas
        culturas = [c["nome"] for c in data["culturas"]]
        assert "soja" in culturas
        assert "milho" in culturas
        assert "boi" in culturas
        assert "cafe" in culturas
        assert "algodao" in culturas
        assert "trigo" in culturas
        
        # Verificar estrutura das culturas
        for cultura in data["culturas"]:
            assert "nome" in cultura
            assert "descricao" in cultura
            assert "unidade" in cultura
            assert "ativo" in cultura

class TestWhatsAppPrevisaoService:
    """Testes para serviço de WhatsApp"""
    
    def setup_method(self):
        """Setup para cada teste"""
        self.service = WhatsAppPrevisaoService()
        
        # Dados de previsão mock
        self.previsao_mock = {
            'cultura': 'soja',
            'estatisticas': {
                'preco_medio': 150.50,
                'preco_minimo': 145.00,
                'preco_maximo': 155.00,
                'tendencia': 'alta',
                'volatilidade': 5.2
            },
            'periodo_previsao': {
                'inicio': '2024-01-01',
                'fim': '2024-01-07',
                'dias': 7
            },
            'previsoes': [
                {
                    'data': datetime.now() + timedelta(days=1),
                    'preco_previsto': 151.00,
                    'limite_inferior': 148.00,
                    'limite_superior': 154.00
                }
            ],
            'grafico_base64': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77mgAAAABJRU5ErkJggg=='
        }
    
    def test_enviar_texto_previsao_debug(self):
        """Testa envio de texto em modo debug"""
        self.service.debug_mode = True
        
        resultado = self.service.enviar_previsao_por_whatsapp(
            contato="5511999999999",
            previsao=self.previsao_mock,
            formato="texto"
        )
        
        assert resultado is True
    
    def test_enviar_pdf_previsao_debug(self):
        """Testa envio de PDF em modo debug"""
        self.service.debug_mode = True
        
        resultado = self.service.enviar_previsao_por_whatsapp(
            contato="5511999999999",
            previsao=self.previsao_mock,
            formato="pdf"
        )
        
        assert resultado is True
    
    def test_enviar_tts_previsao_debug(self):
        """Testa envio de TTS em modo debug"""
        self.service.debug_mode = True
        
        resultado = self.service.enviar_previsao_por_whatsapp(
            contato="5511999999999",
            previsao=self.previsao_mock,
            formato="tts"
        )
        
        assert resultado is True
    
    def test_formato_invalido(self):
        """Testa formato inválido"""
        resultado = self.service.enviar_previsao_por_whatsapp(
            contato="5511999999999",
            previsao=self.previsao_mock,
            formato="formato_inexistente"
        )
        
        assert resultado is False
    
    def test_gerar_mensagem_texto(self):
        """Testa geração de mensagem de texto"""
        mensagem = self.service._gerar_mensagem_texto(self.previsao_mock)
        
        assert "PREVISÃO DE PREÇOS - SOJA" in mensagem
        assert "R$ 150,50" in mensagem
        assert "Alta" in mensagem
        assert "🌱" in mensagem  # Emoji da soja
        assert "📈" in mensagem  # Emoji de tendência alta
        assert "SPR 1.1" in mensagem
    
    def test_gerar_texto_tts(self):
        """Testa geração de texto para TTS"""
        texto = self.service._gerar_texto_tts(self.previsao_mock)
        
        assert "soja" in texto.lower()
        assert "150" in texto
        assert "alta" in texto.lower()
        assert "SPR" in texto
        assert len(texto) > 50  # Texto substancial
    
    def test_gerar_pdf_completo(self):
        """Testa geração de PDF completo"""
        pdf_base64 = self.service._gerar_pdf_completo(self.previsao_mock)
        
        assert isinstance(pdf_base64, str)
        assert len(pdf_base64) > 0
    
    def test_gerar_audio_tts(self):
        """Testa geração de áudio TTS"""
        audio_base64 = self.service._gerar_audio_tts("Teste de TTS")
        
        assert isinstance(audio_base64, str)
        assert len(audio_base64) > 0
    
    @patch('app.services.whatsapp_previsao.send_via_gateway')
    def test_enviar_texto_producao(self, mock_gateway):
        """Testa envio de texto em modo produção"""
        mock_gateway.return_value = True
        self.service.debug_mode = False
        
        resultado = self.service.enviar_previsao_por_whatsapp(
            contato="5511999999999",
            previsao=self.previsao_mock,
            formato="texto"
        )
        
        assert resultado is True
        mock_gateway.assert_called_once()
    
    def test_enviar_previsao_agendada(self):
        """Testa envio de previsão agendada"""
        contatos = ["5511999999999", "5511888888888"]
        
        resultado = self.service.enviar_previsao_agendada(
            cultura="soja",
            contatos=contatos,
            dias_futuros=7,
            formato="texto"
        )
        
        assert "cultura" in resultado
        assert "total_contatos" in resultado
        assert "sucessos" in resultado
        assert "falhas" in resultado
        assert "resultados" in resultado
        assert resultado["total_contatos"] == 2

class TestSchedulerPrevisaoService:
    """Testes para serviço de agendamento"""
    
    def setup_method(self):
        """Setup para cada teste"""
        self.service = SchedulerPrevisaoService()
    
    def test_criar_agendamento_semanal(self):
        """Testa criação de agendamento semanal"""
        contatos = ["5511999999999"]
        
        agendamento_id = self.service.criar_agendamento(
            cultura="soja",
            contatos=contatos,
            frequencia="semanal",
            hora_envio="07:00",
            dia_semana=0,  # Segunda-feira
            dias_futuros=7,
            formato="texto"
        )
        
        assert agendamento_id.startswith("prev_soja_")
        assert agendamento_id in self.service.agendamentos
        
        agendamento = self.service.agendamentos[agendamento_id]
        assert agendamento.cultura == "soja"
        assert agendamento.contatos == contatos
        assert agendamento.frequencia == "semanal"
        assert agendamento.ativo is True
    
    def test_criar_agendamento_diario(self):
        """Testa criação de agendamento diário"""
        contatos = ["5511999999999", "5511888888888"]
        
        agendamento_id = self.service.criar_agendamento(
            cultura="milho",
            contatos=contatos,
            frequencia="diaria",
            hora_envio="08:30",
            dias_futuros=5,
            formato="pdf"
        )
        
        assert agendamento_id in self.service.agendamentos
        
        agendamento = self.service.agendamentos[agendamento_id]
        assert agendamento.cultura == "milho"
        assert agendamento.frequencia == "diaria"
        assert agendamento.hora_envio == "08:30"
        assert agendamento.formato == "pdf"
    
    def test_listar_agendamentos(self):
        """Testa listagem de agendamentos"""
        # Criar alguns agendamentos
        id1 = self.service.criar_agendamento("soja", ["5511999999999"])
        id2 = self.service.criar_agendamento("milho", ["5511888888888"])
        
        # Listar agendamentos
        agendamentos = self.service.listar_agendamentos()
        
        assert len(agendamentos) == 2
        
        # Verificar estrutura
        for agendamento in agendamentos:
            assert "id" in agendamento
            assert "cultura" in agendamento
            assert "contatos" in agendamento
            assert "ativo" in agendamento
            assert "proximo_envio" in agendamento
    
    def test_obter_agendamento(self):
        """Testa obtenção de agendamento específico"""
        contatos = ["5511999999999"]
        agendamento_id = self.service.criar_agendamento("soja", contatos)
        
        agendamento = self.service.obter_agendamento(agendamento_id)
        
        assert agendamento is not None
        assert agendamento["id"] == agendamento_id
        assert agendamento["cultura"] == "soja"
        assert agendamento["contatos"] == contatos
    
    def test_obter_agendamento_inexistente(self):
        """Testa obtenção de agendamento inexistente"""
        agendamento = self.service.obter_agendamento("id_inexistente")
        assert agendamento is None
    
    def test_atualizar_agendamento(self):
        """Testa atualização de agendamento"""
        agendamento_id = self.service.criar_agendamento("soja", ["5511999999999"])
        
        # Atualizar agendamento
        resultado = self.service.atualizar_agendamento(
            agendamento_id,
            dias_futuros=14,
            formato="pdf",
            ativo=False
        )
        
        assert resultado is True
        
        # Verificar atualização
        agendamento = self.service.agendamentos[agendamento_id]
        assert agendamento.dias_futuros == 14
        assert agendamento.formato == "pdf"
        assert agendamento.ativo is False
    
    def test_remover_agendamento(self):
        """Testa remoção de agendamento"""
        agendamento_id = self.service.criar_agendamento("soja", ["5511999999999"])
        
        # Verificar que existe
        assert agendamento_id in self.service.agendamentos
        
        # Remover
        resultado = self.service.remover_agendamento(agendamento_id)
        assert resultado is True
        
        # Verificar que foi removido
        assert agendamento_id not in self.service.agendamentos
    
    def test_pausar_reativar_agendamento(self):
        """Testa pausar e reativar agendamento"""
        agendamento_id = self.service.criar_agendamento("soja", ["5511999999999"])
        
        # Pausar
        resultado = self.service.pausar_agendamento(agendamento_id)
        assert resultado is True
        assert not self.service.agendamentos[agendamento_id].ativo
        
        # Reativar
        resultado = self.service.reativar_agendamento(agendamento_id)
        assert resultado is True
        assert self.service.agendamentos[agendamento_id].ativo
    
    def test_calcular_proximo_envio_diario(self):
        """Testa cálculo de próximo envio diário"""
        proximo = self.service._calcular_proximo_envio("diaria", "07:00")
        
        assert isinstance(proximo, datetime)
        assert proximo > datetime.now()
        assert proximo.hour == 7
        assert proximo.minute == 0
    
    def test_calcular_proximo_envio_semanal(self):
        """Testa cálculo de próximo envio semanal"""
        proximo = self.service._calcular_proximo_envio("semanal", "07:00", 0)  # Segunda
        
        assert isinstance(proximo, datetime)
        assert proximo > datetime.now()
        assert proximo.weekday() == 0  # Segunda-feira
        assert proximo.hour == 7
    
    def test_verificar_envios_pendentes(self):
        """Testa verificação de envios pendentes"""
        # Criar agendamento com próximo envio no passado
        agendamento_id = self.service.criar_agendamento("soja", ["5511999999999"])
        agendamento = self.service.agendamentos[agendamento_id]
        agendamento.proximo_envio = datetime.now() - timedelta(minutes=1)
        
        # Verificar pendentes
        pendentes = self.service.verificar_envios_pendentes()
        
        assert agendamento_id in pendentes
    
    def test_obter_estatisticas(self):
        """Testa obtenção de estatísticas"""
        # Criar alguns agendamentos
        self.service.criar_agendamento("soja", ["5511999999999"], frequencia="diaria")
        self.service.criar_agendamento("milho", ["5511888888888"], frequencia="semanal")
        
        # Pausar um
        ids = list(self.service.agendamentos.keys())
        self.service.pausar_agendamento(ids[0])
        
        # Obter estatísticas
        stats = self.service.obter_estatisticas()
        
        assert stats["total_agendamentos"] == 2
        assert stats["ativos"] == 1
        assert stats["inativos"] == 1
        assert "soja" in stats["por_cultura"]
        assert "milho" in stats["por_cultura"]
        assert "diaria" in stats["por_frequencia"]
        assert "semanal" in stats["por_frequencia"]
        assert "timestamp" in stats

class TestIntegracaoCompleta:
    """Testes de integração completa"""
    
    def test_fluxo_completo_previsao_whatsapp(self):
        """Testa fluxo completo: API -> WhatsApp"""
        # 1. Criar previsão via API
        response = client.post(
            "/previsao/soja",
            json={"dias_futuros": 7}
        )
        
        assert response.status_code == 200
        previsao = response.json()
        
        # 2. Enviar via WhatsApp
        service = WhatsAppPrevisaoService()
        service.debug_mode = True
        
        resultado = service.enviar_previsao_por_whatsapp(
            contato="5511999999999",
            previsao=previsao,
            formato="texto"
        )
        
        assert resultado is True
    
    def test_fluxo_completo_agendamento(self):
        """Testa fluxo completo de agendamento"""
        # 1. Criar agendamento
        scheduler = SchedulerPrevisaoService()
        
        agendamento_id = scheduler.criar_agendamento(
            cultura="soja",
            contatos=["5511999999999"],
            frequencia="diaria",
            hora_envio="07:00",
            dias_futuros=7,
            formato="texto"
        )
        
        # 2. Verificar agendamento
        agendamento = scheduler.obter_agendamento(agendamento_id)
        assert agendamento is not None
        
        # 3. Simular execução
        # Definir próximo envio no passado para forçar execução
        scheduler.agendamentos[agendamento_id].proximo_envio = datetime.now() - timedelta(minutes=1)
        
        # Verificar pendentes
        pendentes = scheduler.verificar_envios_pendentes()
        assert agendamento_id in pendentes
        
        # Executar
        resultado = scheduler.executar_agendamento(agendamento_id)
        assert "cultura" in resultado
        assert "total_contatos" in resultado 