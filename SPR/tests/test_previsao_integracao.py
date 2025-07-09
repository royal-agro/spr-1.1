# test_previsao_integracao.py
# 📦 SPR 1.1 – Testes de Integração Simplificados para Volume 2

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.services.whatsapp_previsao import WhatsAppPrevisaoService
from app.services.scheduler_previsao import SchedulerPrevisaoService

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
        assert "R$ 150.50" in mensagem
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
    
    def test_integracao_whatsapp_scheduler(self):
        """Testa integração entre WhatsApp e Scheduler"""
        # 1. Criar serviços
        whatsapp_service = WhatsAppPrevisaoService()
        whatsapp_service.debug_mode = True
        
        scheduler = SchedulerPrevisaoService()
        
        # 2. Criar agendamento
        agendamento_id = scheduler.criar_agendamento(
            cultura="milho",
            contatos=["5511999999999", "5511888888888"],
            frequencia="semanal",
            hora_envio="08:00",
            dia_semana=1,  # Terça-feira
            dias_futuros=14,
            formato="pdf"
        )
        
        # 3. Verificar que foi criado
        agendamento = scheduler.obter_agendamento(agendamento_id)
        assert agendamento["cultura"] == "milho"
        assert len(agendamento["contatos"]) == 2
        assert agendamento["formato"] == "pdf"
        
        # 4. Simular execução
        scheduler.agendamentos[agendamento_id].proximo_envio = datetime.now() - timedelta(minutes=1)
        resultado = scheduler.executar_agendamento(agendamento_id)
        
        # 5. Verificar resultado
        assert resultado["cultura"] == "milho"
        assert resultado["total_contatos"] == 2
        assert resultado["sucessos"] >= 0
        assert resultado["falhas"] >= 0
    
    def test_multiplos_formatos_whatsapp(self):
        """Testa envio em múltiplos formatos via WhatsApp"""
        service = WhatsAppPrevisaoService()
        service.debug_mode = True
        
        # Dados de previsão
        previsao = {
            'cultura': 'cafe',
            'estatisticas': {
                'preco_medio': 200.75,
                'preco_minimo': 195.00,
                'preco_maximo': 205.00,
                'tendencia': 'baixa',
                'volatilidade': 3.8
            },
            'periodo_previsao': {
                'inicio': '2024-01-01',
                'fim': '2024-01-10',
                'dias': 10
            },
            'previsoes': [
                {
                    'data': datetime.now() + timedelta(days=i),
                    'preco_previsto': 200.0 + i,
                    'limite_inferior': 198.0 + i,
                    'limite_superior': 202.0 + i
                }
                for i in range(1, 11)
            ]
        }
        
        # Testar todos os formatos
        formatos = ['texto', 'pdf', 'tts']
        contato = "5511999999999"
        
        for formato in formatos:
            resultado = service.enviar_previsao_por_whatsapp(
                contato=contato,
                previsao=previsao,
                formato=formato
            )
            assert resultado is True, f"Falha no formato {formato}" 