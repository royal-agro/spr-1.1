# examples/price_locator_example.py
# 📦 SPR 1.1 – Exemplo de Uso do Price Locator

import json
import asyncio
from datetime import datetime
import sys
import os

# Adicionar path do projeto
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.precificacao.price_locator import PriceLocator
from app.services.whatsapp_price_locator import WhatsAppPriceLocatorService

def example_basic_usage():
    """Exemplo básico de uso do Price Locator"""
    print("🔍 EXEMPLO 1: Uso Básico do Price Locator")
    print("=" * 50)
    
    # Criar instância
    locator = PriceLocator()
    
    # Buscar melhores preços
    result = locator.find_best_prices(
        buyer_location="01310-100",  # CEP de São Paulo
        product_id="soja",
        volume=1000  # 1000 kg
    )
    
    if 'error' not in result:
        print(f"✅ Produto: {result['product_id']}")
        print(f"📍 Localização: {result['buyer_location']}")
        print(f"📊 Opções encontradas: {result['total_options_found']}")
        
        best = result['best_choice']
        print(f"\n🥇 MELHOR OPÇÃO:")
        print(f"   📍 Origem: {best['origin_region']}")
        print(f"   💰 Preço: R$ {best['product_price']:.2f}")
        print(f"   🚚 Frete: R$ {best['freight_cost']:.2f}")
        print(f"   💳 Total: R$ {best['total_cost']:.2f}")
        print(f"   ⏱️ Prazo: {best['delivery_days']} dias")
        print(f"   ⭐ Qualidade: {best['quality_score']:.0%}")
        
        print(f"\n📋 TOP 3 OPÇÕES:")
        for i, choice in enumerate(result['choices'][:3], 1):
            print(f"   {i}. {choice['origin_region']} - R$ {choice['total_cost']:.2f}")
    else:
        print(f"❌ Erro: {result['error']}")
    
    print("\n" + "=" * 50 + "\n")

def example_custom_weights():
    """Exemplo com pesos personalizados"""
    print("⚖️ EXEMPLO 2: Pesos Personalizados")
    print("=" * 50)
    
    locator = PriceLocator()
    
    # Cenário 1: Priorizar preço baixo
    print("💰 Cenário 1: Priorizar preço baixo")
    result1 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="milho",
        weights={'price': 0.8, 'time': 0.1, 'quality': 0.1}
    )
    
    if 'error' not in result1:
        best1 = result1['best_choice']
        print(f"   🥇 Melhor: {best1['origin_region']} - R$ {best1['total_cost']:.2f}")
    
    # Cenário 2: Priorizar velocidade
    print("\n⚡ Cenário 2: Priorizar velocidade")
    result2 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="milho",
        weights={'price': 0.2, 'time': 0.7, 'quality': 0.1}
    )
    
    if 'error' not in result2:
        best2 = result2['best_choice']
        print(f"   🥇 Melhor: {best2['origin_region']} - {best2['delivery_days']} dias")
    
    # Cenário 3: Priorizar qualidade
    print("\n⭐ Cenário 3: Priorizar qualidade")
    result3 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="milho",
        weights={'price': 0.2, 'time': 0.2, 'quality': 0.6}
    )
    
    if 'error' not in result3:
        best3 = result3['best_choice']
        print(f"   🥇 Melhor: {best3['origin_region']} - {best3['quality_score']:.0%} qualidade")
    
    print("\n" + "=" * 50 + "\n")

def example_multiple_products():
    """Exemplo com múltiplos produtos"""
    print("🌾 EXEMPLO 3: Múltiplos Produtos")
    print("=" * 50)
    
    locator = PriceLocator()
    products = locator.get_supported_products()
    
    print(f"📋 Produtos suportados: {len(products)}")
    
    for product in products[:3]:  # Testar apenas 3 produtos
        print(f"\n🔍 Buscando preços para {product.upper()}:")
        
        result = locator.find_best_prices(
            buyer_location="-15.6014, -56.0979",  # Coordenadas de MT
            product_id=product,
            volume=500
        )
        
        if 'error' not in result:
            best = result['best_choice']
            print(f"   💰 Melhor preço: R$ {best['product_price']:.2f}")
            print(f"   📍 Origem: {best['origin_region']}")
            print(f"   💳 Total: R$ {best['total_cost']:.2f}")
        else:
            print(f"   ❌ Erro: {result['error']}")
    
    print("\n" + "=" * 50 + "\n")

def example_location_formats():
    """Exemplo com diferentes formatos de localização"""
    print("📍 EXEMPLO 4: Formatos de Localização")
    print("=" * 50)
    
    locator = PriceLocator()
    
    locations = [
        ("01310-100", "CEP com hífen"),
        ("01310100", "CEP sem hífen"),
        ("-23.5505, -46.6333", "Coordenadas São Paulo"),
        ("-15.6014, -56.0979", "Coordenadas Cuiabá")
    ]
    
    for location, description in locations:
        print(f"\n📍 Testando: {description}")
        print(f"   Entrada: {location}")
        
        result = locator.find_best_prices(
            buyer_location=location,
            product_id="soja"
        )
        
        if 'error' not in result:
            print(f"   ✅ Processado: {result['buyer_location']}")
            print(f"   💰 Melhor preço: R$ {result['best_choice']['total_cost']:.2f}")
        else:
            print(f"   ❌ Erro: {result['error']}")
    
    print("\n" + "=" * 50 + "\n")

def example_whatsapp_integration():
    """Exemplo de integração com WhatsApp"""
    print("📱 EXEMPLO 5: Integração WhatsApp")
    print("=" * 50)
    
    whatsapp_service = WhatsAppPriceLocatorService()
    
    # Simular mensagens WhatsApp
    test_messages = [
        ("5511999999999", "preço soja em 01310-100"),
        ("5511999999999", "onde comprar milho para 12345-678"),
        ("5511999999999", "buscar café barato em SP"),
        ("5511999999999", "produtos disponíveis"),
        ("5511999999999", "ajuda"),
        ("5511999999999", "regiões suportadas")
    ]
    
    for contact, message in test_messages:
        print(f"\n📱 Mensagem: '{message}'")
        
        # Processar mensagem
        success = whatsapp_service.process_whatsapp_message(contact, message)
        
        if success:
            print(f"   ✅ Processada com sucesso")
        else:
            print(f"   ❌ Erro no processamento")
    
    print("\n" + "=" * 50 + "\n")

def example_cache_performance():
    """Exemplo de performance do cache"""
    print("⚡ EXEMPLO 6: Performance do Cache")
    print("=" * 50)
    
    locator = PriceLocator()
    
    # Primeira busca (sem cache)
    print("🔍 Primeira busca (sem cache):")
    start_time = datetime.now()
    
    result1 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="soja",
        volume=1000
    )
    
    time1 = (datetime.now() - start_time).total_seconds()
    print(f"   ⏱️ Tempo: {time1:.3f} segundos")
    print(f"   📊 Opções: {result1.get('total_options_found', 0)}")
    
    # Segunda busca (com cache)
    print("\n🔍 Segunda busca (com cache):")
    start_time = datetime.now()
    
    result2 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="soja",
        volume=1000
    )
    
    time2 = (datetime.now() - start_time).total_seconds()
    print(f"   ⏱️ Tempo: {time2:.3f} segundos")
    print(f"   📊 Opções: {result2.get('total_options_found', 0)}")
    
    # Comparar performance
    if time1 > 0 and time2 > 0:
        speedup = time1 / time2
        print(f"\n⚡ Speedup do cache: {speedup:.1f}x")
    
    # Limpar cache
    locator.clear_cache()
    print("🗑️ Cache limpo")
    
    print("\n" + "=" * 50 + "\n")

def example_error_handling():
    """Exemplo de tratamento de erros"""
    print("🚨 EXEMPLO 7: Tratamento de Erros")
    print("=" * 50)
    
    locator = PriceLocator()
    
    # Teste 1: Produto não suportado
    print("❌ Teste 1: Produto não suportado")
    result1 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="produto_inexistente"
    )
    print(f"   Resultado: {result1.get('error', 'Sem erro')}")
    
    # Teste 2: Localização inválida
    print("\n❌ Teste 2: Localização inválida")
    result2 = locator.find_best_prices(
        buyer_location="localização_inválida",
        product_id="soja"
    )
    print(f"   Resultado: {result2.get('error', 'Sem erro')}")
    
    # Teste 3: Pesos inválidos
    print("\n❌ Teste 3: Pesos inválidos")
    result3 = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="soja",
        weights={'price': 0.5, 'time': 0.5, 'quality': 0.5}  # Soma 1.5
    )
    print(f"   Resultado: {result3.get('error', 'Sem erro')}")
    
    print("\n" + "=" * 50 + "\n")

def example_detailed_analysis():
    """Exemplo de análise detalhada"""
    print("📊 EXEMPLO 8: Análise Detalhada")
    print("=" * 50)
    
    locator = PriceLocator()
    
    result = locator.find_best_prices(
        buyer_location="01310-100",
        product_id="soja",
        volume=2000
    )
    
    if 'error' not in result:
        choices = result['choices']
        
        print(f"📈 ANÁLISE ESTATÍSTICA:")
        
        # Preços
        prices = [c['product_price'] for c in choices]
        print(f"   💰 Preço médio: R$ {sum(prices)/len(prices):.2f}")
        print(f"   💰 Preço mínimo: R$ {min(prices):.2f}")
        print(f"   💰 Preço máximo: R$ {max(prices):.2f}")
        
        # Fretes
        freights = [c['freight_cost'] for c in choices]
        print(f"   🚚 Frete médio: R$ {sum(freights)/len(freights):.2f}")
        print(f"   🚚 Frete mínimo: R$ {min(freights):.2f}")
        print(f"   🚚 Frete máximo: R$ {max(freights):.2f}")
        
        # Prazos
        days = [c['delivery_days'] for c in choices]
        print(f"   ⏱️ Prazo médio: {sum(days)/len(days):.1f} dias")
        print(f"   ⏱️ Prazo mínimo: {min(days)} dias")
        print(f"   ⏱️ Prazo máximo: {max(days)} dias")
        
        # Qualidade
        quality = [c['quality_score'] for c in choices]
        print(f"   ⭐ Qualidade média: {sum(quality)/len(quality):.0%}")
        print(f"   ⭐ Qualidade mínima: {min(quality):.0%}")
        print(f"   ⭐ Qualidade máxima: {max(quality):.0%}")
        
        # Top 5 por critério
        print(f"\n🏆 TOP 5 POR CRITÉRIO:")
        
        print("   💰 Menor preço:")
        sorted_by_price = sorted(choices, key=lambda x: x['product_price'])
        for i, choice in enumerate(sorted_by_price[:5], 1):
            print(f"      {i}. {choice['origin_region']} - R$ {choice['product_price']:.2f}")
        
        print("   ⚡ Menor prazo:")
        sorted_by_time = sorted(choices, key=lambda x: x['delivery_days'])
        for i, choice in enumerate(sorted_by_time[:5], 1):
            print(f"      {i}. {choice['origin_region']} - {choice['delivery_days']} dias")
        
        print("   ⭐ Maior qualidade:")
        sorted_by_quality = sorted(choices, key=lambda x: x['quality_score'], reverse=True)
        for i, choice in enumerate(sorted_by_quality[:5], 1):
            print(f"      {i}. {choice['origin_region']} - {choice['quality_score']:.0%}")
    
    print("\n" + "=" * 50 + "\n")

def main():
    """Função principal - executa todos os exemplos"""
    print("🤖 SPR 1.1 - Price Locator Examples")
    print("=" * 50)
    print("📦 Demonstração completa do módulo Price Locator")
    print("🕐 Iniciado em:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 50 + "\n")
    
    try:
        # Executar exemplos
        example_basic_usage()
        example_custom_weights()
        example_multiple_products()
        example_location_formats()
        example_whatsapp_integration()
        example_cache_performance()
        example_error_handling()
        example_detailed_analysis()
        
        print("✅ TODOS OS EXEMPLOS EXECUTADOS COM SUCESSO!")
        print("🤖 SPR Price Locator funcionando corretamente")
        
    except Exception as e:
        print(f"❌ ERRO NA EXECUÇÃO: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 