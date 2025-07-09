# services/whatsapp_price_locator.py
# 📦 SPR 1.1 – Serviço de Integração WhatsApp com Price Locator

import os
import json
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from app.precificacao.price_locator import PriceLocator
from app.dispatcher import send_via_gateway

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class WhatsAppQuery:
    """Dados de consulta via WhatsApp"""
    contact: str
    message: str
    product_id: Optional[str] = None
    location: Optional[str] = None
    volume: Optional[float] = None
    weights: Optional[Dict[str, float]] = None
    query_type: str = "search"  # search, help, products, regions

class WhatsAppPriceLocatorService:
    """
    Serviço para consulta de preços via WhatsApp.
    
    Funcionalidades:
    - Processamento de mensagens em linguagem natural
    - Consulta de melhores preços via WhatsApp
    - Envio de resultados formatados
    - Comandos de ajuda e informações
    """
    
    def __init__(self):
        self.price_locator = PriceLocator()
        self.debug_mode = os.getenv('DEBUG', 'True').lower() == 'true'
        
        # Padrões de reconhecimento de mensagens
        self.message_patterns = {
            'search': [
                r'(?:preço|preco|valor|custo)\s+(?:de\s+)?(\w+)(?:\s+em\s+(\w+[-\d\s,]+))?(?:\s+(\d+(?:\.\d+)?)\s*(?:kg|ton|toneladas?|sacas?)?)?',
                r'(?:onde|local|melhor)\s+(?:comprar|adquirir)\s+(\w+)(?:\s+(?:em|para)\s+(\w+[-\d\s,]+))?',
                r'(?:buscar|procurar|encontrar)\s+(\w+)(?:\s+(?:em|para)\s+(\w+[-\d\s,]+))?'
            ],
            'help': [
                r'(?:ajuda|help|como|uso|usar)',
                r'(?:comandos|opcoes|opções)'
            ],
            'products': [
                r'(?:produtos|commodities|culturas)\s+(?:disponíveis|suportadas?)',
                r'(?:que|quais)\s+(?:produtos|commodities)'
            ],
            'regions': [
                r'(?:regiões|regioes|estados)\s+(?:disponíveis|suportadas?)',
                r'(?:que|quais)\s+(?:regiões|regioes|estados)'
            ]
        }
        
        # Mapeamento de produtos em português
        self.product_mapping = {
            'soja': 'soja',
            'milho': 'milho',
            'cafe': 'cafe',
            'café': 'cafe',
            'algodao': 'algodao',
            'algodão': 'algodao',
            'boi': 'boi',
            'gado': 'boi',
            'trigo': 'trigo'
        }
    
    def process_whatsapp_message(self, contact: str, message: str) -> bool:
        """
        Processa mensagem recebida via WhatsApp.
        
        Args:
            contact: Número do contato
            message: Conteúdo da mensagem
            
        Returns:
            True se processada com sucesso
        """
        try:
            logger.info(f"📱 Processando mensagem de {contact}: {message[:50]}...")
            
            # Analisar mensagem
            query = self._parse_message(contact, message)
            
            # Processar consulta
            response = self._process_query(query)
            
            # Enviar resposta
            success = self._send_response(contact, response)
            
            if success:
                logger.info(f"✅ Resposta enviada para {contact}")
            else:
                logger.error(f"❌ Falha ao enviar resposta para {contact}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Erro ao processar mensagem: {e}")
            # Enviar mensagem de erro
            self._send_error_message(contact, str(e))
            return False
    
    def _parse_message(self, contact: str, message: str) -> WhatsAppQuery:
        """
        Analisa mensagem para extrair informações da consulta.
        
        Args:
            contact: Número do contato
            message: Conteúdo da mensagem
            
        Returns:
            WhatsAppQuery com dados extraídos
        """
        message_lower = message.lower().strip()
        
        # Verificar tipo de consulta
        for query_type, patterns in self.message_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, message_lower)
                if match:
                    if query_type == 'search':
                        return self._parse_search_query(contact, message, match)
                    else:
                        return WhatsAppQuery(
                            contact=contact,
                            message=message,
                            query_type=query_type
                        )
        
        # Consulta padrão se não reconhecida
        return WhatsAppQuery(
            contact=contact,
            message=message,
            query_type="help"
        )
    
    def _parse_search_query(self, contact: str, message: str, match) -> WhatsAppQuery:
        """
        Analisa consulta de busca de preços.
        
        Args:
            contact: Número do contato
            message: Mensagem original
            match: Resultado do regex
            
        Returns:
            WhatsAppQuery com dados de busca
        """
        groups = match.groups()
        
        # Extrair produto
        product_raw = groups[0] if groups[0] else None
        product_id = self.product_mapping.get(product_raw, product_raw)
        
        # Extrair localização
        location = groups[1] if len(groups) > 1 and groups[1] else None
        
        # Extrair volume
        volume = None
        if len(groups) > 2 and groups[2]:
            try:
                volume = float(groups[2])
            except ValueError:
                pass
        
        # Pesos padrão
        weights = {'price': 0.5, 'time': 0.3, 'quality': 0.2}
        
        # Ajustar pesos baseado em palavras-chave
        if 'barato' in message.lower() or 'menor preço' in message.lower():
            weights = {'price': 0.7, 'time': 0.2, 'quality': 0.1}
        elif 'rápido' in message.lower() or 'urgente' in message.lower():
            weights = {'price': 0.3, 'time': 0.6, 'quality': 0.1}
        elif 'qualidade' in message.lower():
            weights = {'price': 0.3, 'time': 0.2, 'quality': 0.5}
        
        return WhatsAppQuery(
            contact=contact,
            message=message,
            product_id=product_id,
            location=location,
            volume=volume,
            weights=weights,
            query_type="search"
        )
    
    def _process_query(self, query: WhatsAppQuery) -> str:
        """
        Processa consulta e gera resposta.
        
        Args:
            query: Dados da consulta
            
        Returns:
            Resposta formatada
        """
        try:
            if query.query_type == "search":
                return self._process_search_query(query)
            elif query.query_type == "help":
                return self._generate_help_message()
            elif query.query_type == "products":
                return self._generate_products_message()
            elif query.query_type == "regions":
                return self._generate_regions_message()
            else:
                return self._generate_help_message()
                
        except Exception as e:
            logger.error(f"❌ Erro ao processar consulta: {e}")
            return f"❌ Erro ao processar sua consulta: {str(e)}"
    
    def _process_search_query(self, query: WhatsAppQuery) -> str:
        """
        Processa consulta de busca de preços.
        
        Args:
            query: Dados da consulta de busca
            
        Returns:
            Resposta formatada com resultados
        """
        try:
            # Validar dados obrigatórios
            if not query.product_id:
                return "❌ Por favor, especifique o produto desejado.\n\nExemplo: 'preço soja em 01310-100'"
            
            if not query.location:
                return "❌ Por favor, informe sua localização (CEP ou coordenadas).\n\nExemplo: 'preço soja em 01310-100'"
            
            # Validar produto suportado
            supported_products = self.price_locator.get_supported_products()
            if query.product_id not in supported_products:
                return f"❌ Produto '{query.product_id}' não suportado.\n\n📋 Produtos disponíveis:\n{', '.join(supported_products)}"
            
            # Executar busca
            result = self.price_locator.find_best_prices(
                buyer_location=query.location,
                product_id=query.product_id,
                volume=query.volume,
                weights=query.weights
            )
            
            # Verificar erro
            if 'error' in result:
                return f"❌ Erro na busca: {result['error']}"
            
            # Formatar resposta
            return self._format_search_results(result)
            
        except Exception as e:
            logger.error(f"❌ Erro na busca: {e}")
            return f"❌ Erro ao buscar preços: {str(e)}"
    
    def _format_search_results(self, result: Dict) -> str:
        """
        Formata resultados da busca para WhatsApp.
        
        Args:
            result: Resultado da busca de preços
            
        Returns:
            Mensagem formatada
        """
        try:
            product_name = result['product_id'].upper()
            location = result['buyer_location']
            total_options = result['total_options_found']
            
            # Cabeçalho
            message = f"🔍 *MELHORES PREÇOS - {product_name}*\n"
            message += f"📍 Destino: {location}\n"
            message += f"📊 {total_options} opções encontradas\n\n"
            
            # Melhor opção
            best = result['best_choice']
            message += f"🥇 *MELHOR OPÇÃO*\n"
            message += f"📍 Origem: {best['origin_region']}\n"
            message += f"💰 Preço: R$ {best['product_price']:.2f}\n"
            message += f"🚚 Frete: R$ {best['freight_cost']:.2f}\n"
            message += f"💳 Total: R$ {best['total_cost']:.2f}\n"
            message += f"⏱️ Prazo: {best['delivery_days']} dias\n"
            message += f"⭐ Qualidade: {best['quality_score']:.0%}\n"
            message += f"🏪 Fornecedor: {best['supplier']}\n\n"
            
            # Top 3 opções
            message += "📋 *TOP 3 OPÇÕES*\n"
            for i, choice in enumerate(result['choices'][:3], 1):
                message += f"{i}. {choice['origin_region']}\n"
                message += f"   💰 R$ {choice['total_cost']:.2f} ({choice['delivery_days']}d)\n"
            
            # Rodapé
            message += f"\n🤖 *SPR Price Locator*\n"
            message += f"🕐 {datetime.now().strftime('%d/%m/%Y %H:%M')}\n"
            message += "💡 Digite 'ajuda' para mais comandos"
            
            return message
            
        except Exception as e:
            logger.error(f"❌ Erro ao formatar resultados: {e}")
            return "❌ Erro ao formatar resultados da busca"
    
    def _generate_help_message(self) -> str:
        """Gera mensagem de ajuda"""
        message = "🤖 *SPR PRICE LOCATOR - AJUDA*\n\n"
        message += "📋 *COMANDOS DISPONÍVEIS:*\n\n"
        
        message += "🔍 *BUSCAR PREÇOS:*\n"
        message += "• 'preço soja em 01310-100'\n"
        message += "• 'onde comprar milho para 12345-678'\n"
        message += "• 'buscar café em -15.6014,-56.0979'\n"
        message += "• 'valor algodão em SP 1000 kg'\n\n"
        
        message += "📋 *INFORMAÇÕES:*\n"
        message += "• 'produtos' - Lista produtos disponíveis\n"
        message += "• 'regiões' - Lista regiões suportadas\n"
        message += "• 'ajuda' - Mostra esta mensagem\n\n"
        
        message += "💡 *DICAS:*\n"
        message += "• Use CEP ou coordenadas para localização\n"
        message += "• Especifique volume para cálculo preciso\n"
        message += "• Palavras como 'barato', 'rápido' ajustam prioridades\n\n"
        
        message += "🌾 *PRODUTOS SUPORTADOS:*\n"
        products = self.price_locator.get_supported_products()
        message += f"{', '.join(products)}\n\n"
        
        message += "🤖 *SPR 1.1 - Sistema de Precificação Rural*"
        
        return message
    
    def _generate_products_message(self) -> str:
        """Gera mensagem com produtos disponíveis"""
        products = self.price_locator.get_supported_products()
        
        message = "🌾 *PRODUTOS DISPONÍVEIS*\n\n"
        for i, product in enumerate(products, 1):
            message += f"{i}. {product.upper()}\n"
        
        message += f"\n📊 Total: {len(products)} produtos\n"
        message += "\n💡 Use: 'preço [produto] em [localização]'"
        
        return message
    
    def _generate_regions_message(self) -> str:
        """Gera mensagem com regiões disponíveis"""
        regions = self.price_locator.get_supported_regions()
        
        message = "🗺️ *REGIÕES SUPORTADAS*\n\n"
        for code, info in regions.items():
            message += f"• {code} - {info['name']}\n"
        
        message += f"\n📊 Total: {len(regions)} regiões\n"
        message += "\n💡 Coletamos preços de todas essas regiões"
        
        return message
    
    def _send_response(self, contact: str, response: str) -> bool:
        """
        Envia resposta via WhatsApp.
        
        Args:
            contact: Número do contato
            response: Mensagem de resposta
            
        Returns:
            True se enviada com sucesso
        """
        try:
            if self.debug_mode:
                logger.info(f"📱 [DEBUG] Enviando para {contact}:\n{response}")
                return True
            
            # Enviar via gateway real
            return send_via_gateway(
                contact=contact,
                message=response,
                message_type="text"
            )
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar resposta: {e}")
            return False
    
    def _send_error_message(self, contact: str, error: str) -> bool:
        """
        Envia mensagem de erro via WhatsApp.
        
        Args:
            contact: Número do contato
            error: Descrição do erro
            
        Returns:
            True se enviada com sucesso
        """
        message = f"❌ *ERRO*\n\n{error}\n\n💡 Digite 'ajuda' para ver comandos disponíveis"
        return self._send_response(contact, message)
    
    def send_scheduled_updates(self, contacts: List[str], product_id: str) -> Dict:
        """
        Envia atualizações programadas de preços.
        
        Args:
            contacts: Lista de contatos
            product_id: ID do produto
            
        Returns:
            Resultado dos envios
        """
        try:
            logger.info(f"📅 Enviando atualizações programadas: {product_id}")
            
            # Buscar preços atuais (localização padrão SP)
            result = self.price_locator.find_best_prices(
                buyer_location="01310-100",
                product_id=product_id
            )
            
            if 'error' in result:
                logger.error(f"❌ Erro na busca programada: {result['error']}")
                return {'success': False, 'error': result['error']}
            
            # Formatar mensagem de atualização
            message = self._format_scheduled_update(result)
            
            # Enviar para todos os contatos
            results = []
            for contact in contacts:
                success = self._send_response(contact, message)
                results.append({
                    'contact': contact,
                    'success': success,
                    'timestamp': datetime.now().isoformat()
                })
            
            successful_sends = sum(1 for r in results if r['success'])
            
            logger.info(f"✅ Atualizações enviadas: {successful_sends}/{len(contacts)}")
            
            return {
                'success': True,
                'total_contacts': len(contacts),
                'successful_sends': successful_sends,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no envio programado: {e}")
            return {'success': False, 'error': str(e)}
    
    def _format_scheduled_update(self, result: Dict) -> str:
        """
        Formata mensagem de atualização programada.
        
        Args:
            result: Resultado da busca
            
        Returns:
            Mensagem formatada
        """
        product_name = result['product_id'].upper()
        best = result['best_choice']
        
        message = f"📊 *ATUALIZAÇÃO DE PREÇOS - {product_name}*\n\n"
        message += f"🥇 *MELHOR OPÇÃO HOJE*\n"
        message += f"📍 {best['origin_region']}\n"
        message += f"💰 R$ {best['product_price']:.2f}\n"
        message += f"💳 Total: R$ {best['total_cost']:.2f}\n"
        message += f"⏱️ Prazo: {best['delivery_days']} dias\n\n"
        
        message += f"📈 *RESUMO DO MERCADO*\n"
        choices = result['choices'][:3]
        avg_price = sum(c['product_price'] for c in choices) / len(choices)
        message += f"💰 Preço médio: R$ {avg_price:.2f}\n"
        message += f"📊 {result['total_options_found']} opções analisadas\n\n"
        
        message += f"🕐 {datetime.now().strftime('%d/%m/%Y %H:%M')}\n"
        message += "🤖 *SPR Price Locator*"
        
        return message
    
    def get_service_status(self) -> Dict:
        """
        Retorna status do serviço.
        
        Returns:
            Status do serviço WhatsApp Price Locator
        """
        try:
            products_count = len(self.price_locator.get_supported_products())
            regions_count = len(self.price_locator.get_supported_regions())
            
            return {
                'service': 'WhatsApp Price Locator',
                'status': 'active',
                'version': '1.1',
                'debug_mode': self.debug_mode,
                'supported_products': products_count,
                'supported_regions': regions_count,
                'message_patterns': len(self.message_patterns),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no status: {e}")
            return {
                'service': 'WhatsApp Price Locator',
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            } 