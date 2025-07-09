# services/whatsapp_previsao.py
# 📦 SPR 1.1 – Serviço de Integração WhatsApp com Previsão de Preços

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import base64
import io

from app.precificacao.previsao_precos import PrevisorDePrecos
from app.dispatcher import send_via_gateway

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhatsAppPrevisaoService:
    """
    Serviço para envio de previsões de preços via WhatsApp.
    
    Funcionalidades:
    - Envio de texto simples com previsões
    - Envio de PDFs com relatórios
    - Geração de TTS com resumo
    - Templates personalizados por cultura
    """
    
    def __init__(self):
        self.debug_mode = os.getenv('DEBUG', 'True').lower() == 'true'
        
    def enviar_previsao_por_whatsapp(
        self, 
        contato: str, 
        previsao: Dict, 
        formato: str = 'texto'
    ) -> bool:
        """
        Envia previsão de preços via WhatsApp.
        
        Args:
            contato: Número do WhatsApp
            previsao: Dados da previsão
            formato: Formato do envio (texto, pdf, tts)
            
        Returns:
            True se enviado com sucesso
        """
        try:
            if formato == 'texto':
                return self._enviar_texto_previsao(contato, previsao)
            elif formato == 'pdf':
                return self._enviar_pdf_previsao(contato, previsao)
            elif formato == 'tts':
                return self._enviar_tts_previsao(contato, previsao)
            else:
                logger.error(f"Formato {formato} não suportado")
                return False
                
        except Exception as e:
            logger.error(f"Erro ao enviar previsão por WhatsApp: {str(e)}")
            return False
    
    def _enviar_texto_previsao(self, contato: str, previsao: Dict) -> bool:
        """
        Envia previsão em formato de texto.
        
        Args:
            contato: Número do WhatsApp
            previsao: Dados da previsão
            
        Returns:
            True se enviado com sucesso
        """
        try:
            # Gerar mensagem de texto
            mensagem = self._gerar_mensagem_texto(previsao)
            
            # Enviar via gateway ou simulação
            if self.debug_mode:
                logger.info(f"[SIMULAÇÃO] Enviando para {contato}: {mensagem[:100]}...")
                return True
            else:
                return send_via_gateway(contato, mensagem)
                
        except Exception as e:
            logger.error(f"Erro ao enviar texto: {str(e)}")
            return False
    
    def _enviar_pdf_previsao(self, contato: str, previsao: Dict) -> bool:
        """
        Envia previsão em formato PDF.
        
        Args:
            contato: Número do WhatsApp
            previsao: Dados da previsão
            
        Returns:
            True se enviado com sucesso
        """
        try:
            # Gerar PDF
            pdf_base64 = self._gerar_pdf_completo(previsao)
            
            # Mensagem com PDF
            mensagem = f"📊 Relatório de Previsão - {previsao['cultura'].title()}\n\n"
            mensagem += f"Período: {previsao['periodo_previsao']['inicio']} a {previsao['periodo_previsao']['fim']}\n"
            mensagem += f"Preço Médio: R$ {previsao['estatisticas']['preco_medio']:.2f}\n"
            mensagem += f"Tendência: {previsao['estatisticas']['tendencia'].title()}\n\n"
            mensagem += "📎 Relatório completo em anexo"
            
            # Enviar via gateway ou simulação
            if self.debug_mode:
                logger.info(f"[SIMULAÇÃO] Enviando PDF para {contato}: {len(pdf_base64)} bytes")
                return True
            else:
                # TODO: Implementar envio de arquivo via gateway
                return send_via_gateway(contato, mensagem)
                
        except Exception as e:
            logger.error(f"Erro ao enviar PDF: {str(e)}")
            return False
    
    def _enviar_tts_previsao(self, contato: str, previsao: Dict) -> bool:
        """
        Envia previsão em formato TTS (áudio).
        
        Args:
            contato: Número do WhatsApp
            previsao: Dados da previsão
            
        Returns:
            True se enviado com sucesso
        """
        try:
            # Gerar texto para TTS
            texto_tts = self._gerar_texto_tts(previsao)
            
            # Gerar áudio TTS (placeholder)
            audio_base64 = self._gerar_audio_tts(texto_tts)
            
            # Mensagem com áudio
            mensagem = f"🎵 Previsão de {previsao['cultura'].title()} em áudio"
            
            # Enviar via gateway ou simulação
            if self.debug_mode:
                logger.info(f"[SIMULAÇÃO] Enviando TTS para {contato}: {texto_tts[:100]}...")
                return True
            else:
                # TODO: Implementar envio de áudio via gateway
                return send_via_gateway(contato, mensagem)
                
        except Exception as e:
            logger.error(f"Erro ao enviar TTS: {str(e)}")
            return False
    
    def _gerar_mensagem_texto(self, previsao: Dict) -> str:
        """
        Gera mensagem de texto formatada.
        
        Args:
            previsao: Dados da previsão
            
        Returns:
            Mensagem formatada
        """
        cultura = previsao['cultura'].title()
        stats = previsao['estatisticas']
        periodo = previsao['periodo_previsao']
        
        # Emoji baseado na cultura
        emoji_cultura = {
            'soja': '🌱',
            'milho': '🌽',
            'boi': '🐂',
            'cafe': '☕',
            'algodao': '🌾',
            'trigo': '🌾'
        }.get(previsao['cultura'].lower(), '📊')
        
        # Emoji baseado na tendência
        emoji_tendencia = '📈' if stats['tendencia'] == 'alta' else '📉'
        
        mensagem = f"{emoji_cultura} *PREVISÃO DE PREÇOS - {cultura.upper()}*\n\n"
        mensagem += f"📅 *Período:* {periodo['inicio']} a {periodo['fim']}\n"
        mensagem += f"📊 *Dias analisados:* {periodo['dias']}\n\n"
        
        mensagem += f"💰 *Preço Médio:* R$ {stats['preco_medio']:.2f}\n"
        mensagem += f"📊 *Faixa de Preços:* R$ {stats['preco_minimo']:.2f} - R$ {stats['preco_maximo']:.2f}\n"
        mensagem += f"{emoji_tendencia} *Tendência:* {stats['tendencia'].title()}\n"
        mensagem += f"📈 *Volatilidade:* {stats['volatilidade']:.2f}\n\n"
        
        # Adicionar algumas previsões específicas
        previsoes_sample = previsao['previsoes'][:5]  # Primeiros 5 dias
        mensagem += f"📋 *Próximos dias:*\n"
        
        for prev in previsoes_sample:
            data_str = prev['data'].strftime('%d/%m')
            preco = prev['preco_previsto']
            mensagem += f"• {data_str}: R$ {preco:.2f}\n"
        
        if len(previsao['previsoes']) > 5:
            mensagem += f"... e mais {len(previsao['previsoes']) - 5} dias\n"
        
        mensagem += f"\n⏰ *Gerado em:* {datetime.now().strftime('%d/%m/%Y às %H:%M')}\n"
        mensagem += f"🤖 *SPR 1.1 - Sistema de Previsão Rural*"
        
        return mensagem
    
    def _gerar_texto_tts(self, previsao: Dict) -> str:
        """
        Gera texto otimizado para TTS.
        
        Args:
            previsao: Dados da previsão
            
        Returns:
            Texto para TTS
        """
        cultura = previsao['cultura']
        stats = previsao['estatisticas']
        periodo = previsao['periodo_previsao']
        
        texto = f"Previsão de preços para {cultura}. "
        texto += f"Período de {periodo['dias']} dias. "
        texto += f"Preço médio estimado: {stats['preco_medio']:.0f} reais. "
        texto += f"Tendência de {stats['tendencia']}. "
        texto += f"Volatilidade de {stats['volatilidade']:.1f}. "
        
        # Adicionar contexto da primeira previsão
        if previsao['previsoes']:
            primeira = previsao['previsoes'][0]
            texto += f"Amanhã o preço estimado é {primeira['preco_previsto']:.0f} reais. "
        
        texto += "Relatório gerado pelo sistema SPR."
        
        return texto
    
    def _gerar_pdf_completo(self, previsao: Dict) -> str:
        """
        Gera PDF completo da previsão.
        
        Args:
            previsao: Dados da previsão
            
        Returns:
            PDF em base64
        """
        try:
            # Usar o gráfico existente como base
            if 'grafico_base64' in previsao:
                return previsao['grafico_base64']
            
            # Gerar PDF textual simples
            cultura = previsao['cultura'].upper()
            stats = previsao['estatisticas']
            periodo = previsao['periodo_previsao']
            
            pdf_content = f"""
            RELATÓRIO DE PREVISÃO DE PREÇOS
            {cultura}
            
            PERÍODO DE ANÁLISE
            De: {periodo['inicio']}
            Até: {periodo['fim']}
            Dias: {periodo['dias']}
            
            ESTATÍSTICAS
            Preço Médio: R$ {stats['preco_medio']:.2f}
            Preço Mínimo: R$ {stats['preco_minimo']:.2f}
            Preço Máximo: R$ {stats['preco_maximo']:.2f}
            Tendência: {stats['tendencia'].title()}
            Volatilidade: {stats['volatilidade']:.2f}
            
            PREVISÕES DETALHADAS
            """
            
            # Adicionar previsões
            for prev in previsao['previsoes']:
                data_str = prev['data'].strftime('%d/%m/%Y')
                preco = prev['preco_previsto']
                limite_inf = prev['limite_inferior']
                limite_sup = prev['limite_superior']
                
                pdf_content += f"{data_str}: R$ {preco:.2f} ({limite_inf:.2f} - {limite_sup:.2f})\n"
            
            pdf_content += f"\n\nRelatório gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}"
            pdf_content += "\nSPR 1.1 - Sistema de Previsão Rural"
            
            return base64.b64encode(pdf_content.encode()).decode()
            
        except Exception as e:
            logger.error(f"Erro ao gerar PDF: {str(e)}")
            return ""
    
    def _gerar_audio_tts(self, texto: str) -> str:
        """
        Gera áudio TTS em base64.
        
        Args:
            texto: Texto para conversão
            
        Returns:
            Áudio em base64 (placeholder)
        """
        try:
            # Placeholder para TTS real
            # TODO: Implementar com biblioteca TTS (pyttsx3, gTTS, etc.)
            
            # Simular áudio como base64
            audio_placeholder = f"AUDIO_TTS: {texto}"
            return base64.b64encode(audio_placeholder.encode()).decode()
            
        except Exception as e:
            logger.error(f"Erro ao gerar TTS: {str(e)}")
            return ""
    
    def enviar_previsao_agendada(
        self, 
        cultura: str, 
        contatos: List[str], 
        dias_futuros: int = 7,
        formato: str = 'texto'
    ) -> Dict:
        """
        Envia previsão agendada para múltiplos contatos.
        
        Args:
            cultura: Nome da cultura
            contatos: Lista de números WhatsApp
            dias_futuros: Número de dias para previsão
            formato: Formato do envio
            
        Returns:
            Resultado do envio
        """
        try:
            # Criar previsor e gerar previsão
            previsor = PrevisorDePrecos(commodity=cultura)
            previsor.carregar_dados()
            previsor.treinar_modelo()
            
            # Gerar datas futuras
            from datetime import timedelta
            datas_futuras = [
                datetime.now() + timedelta(days=i) 
                for i in range(1, dias_futuros + 1)
            ]
            
            # Fazer previsões
            previsoes = previsor.prever(datas_futuras)
            relatorio = previsor.gerar_relatorio(previsoes)
            
            # Enviar para cada contato
            resultados = []
            for contato in contatos:
                sucesso = self.enviar_previsao_por_whatsapp(contato, relatorio, formato)
                resultados.append({
                    'contato': contato,
                    'sucesso': sucesso,
                    'timestamp': datetime.now().isoformat()
                })
            
            # Log da operação
            logger.info(json.dumps({
                "evento": "previsao_agendada_enviada",
                "cultura": cultura,
                "contatos": len(contatos),
                "sucessos": sum(1 for r in resultados if r['sucesso']),
                "formato": formato,
                "timestamp": datetime.now().isoformat()
            }))
            
            return {
                'cultura': cultura,
                'total_contatos': len(contatos),
                'sucessos': sum(1 for r in resultados if r['sucesso']),
                'falhas': sum(1 for r in resultados if not r['sucesso']),
                'resultados': resultados,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao enviar previsão agendada: {str(e)}")
            return {
                'erro': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Instância global do serviço
whatsapp_previsao_service = WhatsAppPrevisaoService() 