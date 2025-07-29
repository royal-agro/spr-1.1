#!/usr/bin/env python3
"""
Integração WhatsApp com Sistema de Previsões SPR
Conecta o WhatsApp com os módulos de previsão de preços
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json

# Adicionar path do projeto
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.dispatcher import WhatsAppDispatcher

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhatsAppSPRIntegration:
    """
    Integração entre WhatsApp e Sistema de Previsões SPR
    
    Funcionalidades:
    - Envio automático de previsões
    - Resposta a consultas via WhatsApp
    - Alertas de preços
    - Relatórios personalizados
    """
    
    def __init__(self):
        self.dispatcher = WhatsAppDispatcher()
        self.commodities = ['soja', 'milho', 'cafe', 'algodao', 'boi'] # [[memory:2670784]]
        
        # Configurações
        self.debug_mode = os.getenv('DEBUG', 'True').lower() == 'true'
        self.auto_send_enabled = os.getenv('WHATSAPP_AUTO_SEND', 'True').lower() == 'true'
        
        logger.info("🌾 SPR WhatsApp Integration inicializada")
    
    def send_daily_forecast(self, contacts: List[str]) -> Dict[str, Any]:
        """
        Envia previsão diária para lista de contatos
        
        Args:
            contacts: Lista de números de WhatsApp
            
        Returns:
            Dict com resultado dos envios
        """
        logger.info(f"📅 Enviando previsão diária para {len(contacts)} contatos")
        
        results = {
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        try:
            # Gerar mensagem de previsão
            forecast_message = self._generate_daily_forecast()
            
            # Enviar para cada contato
            for contact in contacts:
                try:
                    result = self.dispatcher.send_message(contact, forecast_message)
                    
                    if result.get('success'):
                        results['success'] += 1
                        logger.info(f"✅ Previsão enviada para {contact}")
                    else:
                        results['failed'] += 1
                        logger.error(f"❌ Falha ao enviar para {contact}: {result.get('error')}")
                    
                    results['details'].append({
                        'contact': contact,
                        'success': result.get('success', False),
                        'error': result.get('error', None)
                    })
                    
                except Exception as e:
                    results['failed'] += 1
                    logger.error(f"❌ Erro ao enviar para {contact}: {e}")
                    
                    results['details'].append({
                        'contact': contact,
                        'success': False,
                        'error': str(e)
                    })
            
            logger.info(f"📊 Envio concluído: {results['success']} sucessos, {results['failed']} falhas")
            return results
            
        except Exception as e:
            logger.error(f"❌ Erro no envio da previsão diária: {e}")
            return {
                'success': 0,
                'failed': len(contacts),
                'error': str(e)
            }
    
    def _generate_daily_forecast(self) -> str:
        """
        Gera mensagem de previsão diária
        
        Returns:
            Mensagem formatada
        """
        try:
            # Dados simulados - substituir por dados reais do sistema
            forecasts = self._get_commodity_forecasts()
            
            message = f"""🌾 *SPR - Previsão Diária*
📅 {datetime.now().strftime('%d/%m/%Y')}

*COMMODITIES AGRÍCOLAS:*

"""
            
            for commodity, data in forecasts.items():
                trend_emoji = "📈" if data['trend'] == 'alta' else "📉" if data['trend'] == 'baixa' else "➡️"
                
                message += f"""*{commodity.upper()}*
💰 Preço: R$ {data['price']:.2f}
{trend_emoji} Tendência: {data['trend'].upper()}
📊 Variação: {data['variation']:+.2f}%
🎯 Confiança: {data['confidence']:.0f}%

"""
            
            message += """*RECOMENDAÇÕES:*
• Acompanhe as condições climáticas
• Monitore mercado internacional
• Considere estratégias de hedge

📱 *Royal Negócios Agrícolas*
🤖 Mensagem automática do SPR

Para mais informações, responda com o nome da commodity."""
            
            return message
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar previsão: {e}")
            return f"❌ Erro ao gerar previsão diária: {e}"
    
    def _get_commodity_forecasts(self) -> Dict[str, Dict[str, Any]]:
        """
        Obtém previsões das commodities
        
        Returns:
            Dict com previsões por commodity
        """
        # Dados simulados - substituir por integração real com módulos de previsão
        forecasts = {
            'soja': {
                'price': 150.75,
                'trend': 'alta',
                'variation': 2.3,
                'confidence': 85.0
            },
            'milho': {
                'price': 85.20,
                'trend': 'estavel',
                'variation': 0.5,
                'confidence': 78.0
            },
            'cafe': {
                'price': 890.50,
                'trend': 'baixa',
                'variation': -1.8,
                'confidence': 82.0
            },
            'algodao': {
                'price': 3.45,
                'trend': 'alta',
                'variation': 3.1,
                'confidence': 79.0
            },
            'boi': {
                'price': 285.00,
                'trend': 'alta',
                'variation': 1.2,
                'confidence': 88.0
            }
        }
        
        return forecasts
    
    def handle_commodity_query(self, contact: str, commodity: str) -> bool:
        """
        Responde consulta específica sobre commodity
        
        Args:
            contact: Número do contato
            commodity: Nome da commodity
            
        Returns:
            True se enviado com sucesso
        """
        try:
            commodity_lower = commodity.lower()
            
            if commodity_lower not in self.commodities:
                # Listar commodities disponíveis
                available = ', '.join(self.commodities)
                message = f"""❓ Commodity "{commodity}" não encontrada.

*Commodities disponíveis:*
{available}

Digite o nome correto para receber a previsão."""
                
                result = self.dispatcher.send_message(contact, message)
                return result.get('success', False)
            
            # Gerar resposta específica
            forecast_data = self._get_commodity_forecasts().get(commodity_lower, {})
            
            if not forecast_data:
                message = f"❌ Dados não disponíveis para {commodity}"
            else:
                trend_emoji = "📈" if forecast_data['trend'] == 'alta' else "📉" if forecast_data['trend'] == 'baixa' else "➡️"
                
                message = f"""🌾 *SPR - {commodity.upper()}*
📅 {datetime.now().strftime('%d/%m/%Y %H:%M')}

*PREVISÃO ATUAL:*
💰 Preço: R$ {forecast_data['price']:.2f}
{trend_emoji} Tendência: {forecast_data['trend'].upper()}
📊 Variação: {forecast_data['variation']:+.2f}%
🎯 Confiança: {forecast_data['confidence']:.0f}%

*ANÁLISE:*
{self._get_commodity_analysis(commodity_lower)}

*RECOMENDAÇÃO:*
{self._get_commodity_recommendation(commodity_lower, forecast_data)}

📱 *Royal Negócios Agrícolas*
🤖 Resposta automática do SPR"""
            
            result = self.dispatcher.send_message(contact, message)
            return result.get('success', False)
            
        except Exception as e:
            logger.error(f"❌ Erro ao responder consulta: {e}")
            return False
    
    def _get_commodity_analysis(self, commodity: str) -> str:
        """
        Gera análise específica da commodity
        
        Args:
            commodity: Nome da commodity
            
        Returns:
            Texto da análise
        """
        analyses = {
            'soja': "Mercado impulsionado por demanda chinesa e condições climáticas favoráveis no Brasil.",
            'milho': "Preços estáveis com boa oferta interna e demanda moderada do setor de rações.",
            'cafe': "Pressão vendedora devido à boa safra e estoques elevados.",
            'algodao': "Alta impulsionada por demanda têxtil e redução de área plantada.",
            'boi': "Mercado aquecido com oferta limitada e demanda firme do mercado interno."
        }
        
        return analyses.get(commodity, "Análise não disponível para esta commodity.")
    
    def _get_commodity_recommendation(self, commodity: str, forecast_data: Dict[str, Any]) -> str:
        """
        Gera recomendação baseada na previsão
        
        Args:
            commodity: Nome da commodity
            forecast_data: Dados da previsão
            
        Returns:
            Texto da recomendação
        """
        trend = forecast_data.get('trend', 'estavel')
        confidence = forecast_data.get('confidence', 0)
        
        if trend == 'alta' and confidence > 80:
            return "🟢 RECOMENDAÇÃO: Momento favorável para venda. Considere estratégias de comercialização."
        elif trend == 'baixa' and confidence > 80:
            return "🔴 RECOMENDAÇÃO: Aguarde melhores condições. Considere hedge para proteção."
        elif trend == 'estavel':
            return "🟡 RECOMENDAÇÃO: Mercado estável. Monitore indicadores para definir estratégia."
        else:
            return "⚪ RECOMENDAÇÃO: Cenário incerto. Aguarde confirmação de tendência."
    
    def send_price_alert(self, contact: str, commodity: str, alert_type: str, threshold: float, current_price: float) -> bool:
        """
        Envia alerta de preço
        
        Args:
            contact: Número do contato
            commodity: Nome da commodity
            alert_type: Tipo do alerta ('above', 'below')
            threshold: Valor limite
            current_price: Preço atual
            
        Returns:
            True se enviado com sucesso
        """
        try:
            alert_emoji = "🚨" if alert_type == 'above' else "⚠️"
            direction = "acima" if alert_type == 'above' else "abaixo"
            
            message = f"""{alert_emoji} *ALERTA DE PREÇO*

*{commodity.upper()}*
📊 Preço atual: R$ {current_price:.2f}
🎯 Limite: R$ {threshold:.2f}
📈 Status: {direction.upper()} do limite

⏰ {datetime.now().strftime('%d/%m/%Y %H:%M')}

📱 *Royal Negócios Agrícolas*
🤖 Alerta automático do SPR"""
            
            result = self.dispatcher.send_message(contact, message)
            
            if result.get('success'):
                logger.info(f"🚨 Alerta enviado para {contact}: {commodity} {direction} R$ {threshold:.2f}")
                return True
            else:
                logger.error(f"❌ Falha ao enviar alerta: {result.get('error')}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao enviar alerta: {e}")
            return False
    
    def get_integration_status(self) -> Dict[str, Any]:
        """
        Verifica status da integração
        
        Returns:
            Dict com status dos componentes
        """
        try:
            # Verificar dispatcher
            dispatcher_health = self.dispatcher.health_check()
            
            # Verificar servidor WhatsApp
            whatsapp_status = self.dispatcher.get_status()
            
            return {
                'integration_active': True,
                'dispatcher_health': dispatcher_health.get('success', False),
                'whatsapp_connected': whatsapp_status.get('success', False),
                'auto_send_enabled': self.auto_send_enabled,
                'supported_commodities': self.commodities,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar status: {e}")
            return {
                'integration_active': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Instância global
spr_whatsapp = WhatsAppSPRIntegration()

# Funções de conveniência
def send_daily_forecast_to_contacts(contacts: List[str]) -> Dict[str, Any]:
    """Envia previsão diária para lista de contatos"""
    return spr_whatsapp.send_daily_forecast(contacts)

def handle_commodity_query(contact: str, commodity: str) -> bool:
    """Responde consulta sobre commodity"""
    return spr_whatsapp.handle_commodity_query(contact, commodity)

def send_price_alert(contact: str, commodity: str, alert_type: str, threshold: float, current_price: float) -> bool:
    """Envia alerta de preço"""
    return spr_whatsapp.send_price_alert(contact, commodity, alert_type, threshold, current_price)

def get_integration_status() -> Dict[str, Any]:
    """Verifica status da integração"""
    return spr_whatsapp.get_integration_status()

if __name__ == "__main__":
    # Teste da integração
    print("🌾 Testando integração SPR WhatsApp...")
    
    status = get_integration_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    # Teste de consulta
    test_contact = input("Digite um número para teste (ou Enter para pular): ").strip()
    if test_contact:
        print("Enviando consulta de teste...")
        result = handle_commodity_query(test_contact, "soja")
        print(f"Resultado: {result}") 