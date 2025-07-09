#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPR 1.1 - Sistema de Previsão Rural
Ponto de entrada central do sistema
Desenvolvido por: Carlos Eduardo Lazzari Anghinoni - Royal Negócios Agrícolas
"""

import os
import sys
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv

logging.basicConfig(
   level=logging.INFO,
   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
   handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger('SPR')

class SPRSystem:
   def __init__(self):
       self.version = "1.1"
       self.environment: Optional[str] = None
       self.modules: Dict[str, dict] = {}
       # Ajustado para apontar para o diretório pai (SPR/) já que agora estamos em app/
       self.project_root = Path(__file__).parent.parent

   def load_environment(self) -> bool:
       try:
           env_file = self.project_root / '.env'
           if env_file.exists():
               load_dotenv(env_file)
               logger.info(f"✅ Arquivo .env carregado: {env_file}")
           else:
               logger.warning("⚠️  Arquivo .env não encontrado, usando variáveis padrão")
           self.environment = os.getenv('SPR_ENVIRONMENT', 'dev').lower()
           logger.info(f"🌍 Ambiente configurado: {self.environment}")
           return True
       except Exception as e:
           logger.error(f"❌ Erro ao carregar .env: {e}")
           return False

   def discover_modules(self) -> List[str]:
       modules = []
       # Ajustado para procurar na nova estrutura app/
       main_directories = ['analise', 'precificacao', 'suporte_tecnico']
       for directory in main_directories:
           module_path = Path(__file__).parent / directory
           if module_path.exists() and module_path.is_dir():
               modules.append(directory)
               logger.info(f"📁 Módulo descoberto: {directory}")
           else:
               logger.warning(f"⚠️  Módulo não encontrado: {directory}")
       return modules

   def register_module(self, module_name: str) -> bool:
       try:
           module_path = Path(__file__).parent / module_name
           if not module_path.exists():
               logger.error(f"❌ Módulo não encontrado: {module_name}")
               return False
           self.modules[module_name] = {
               'path': str(module_path),
               'status': 'registered',
               'files': list(module_path.glob('*.py'))
           }
           logger.info(f"✅ Módulo registrado: {module_name}")
           return True
       except Exception as e:
           logger.error(f"❌ Erro ao registrar módulo {module_name}: {e}")
           return False

   def initialize_modules(self) -> bool:
       try:
           logger.info("🚀 Iniciando módulos do SPR...")
           for module_name, module_info in self.modules.items():
               logger.info(f"   ⚡ Inicializando {module_name}...")
               module_info['status'] = 'initialized'
               files_count = len(module_info['files'])
               logger.info(f"   📄 {module_name}: {files_count} arquivo(s) encontrado(s)")
           logger.info("✅ Todos os módulos inicializados com sucesso")
           return True
       except Exception as e:
           logger.error(f"❌ Erro na inicialização dos módulos: {e}")
           return False

   def health_check(self) -> Dict[str, str]:
       health_status = {
           'system': 'healthy',
           'version': self.version
       }
       return health_status

   def startup(self) -> bool:
       logger.info("=" * 60)
       logger.info("🌾 SPR 1.1 - Sistema de Previsão Rural")
       logger.info("   Royal Negócios Agrícolas")
       logger.info("=" * 60)
       if not self.load_environment():
           return False
       discovered_modules = self.discover_modules()
       if not discovered_modules:
           logger.warning("⚠️  Nenhum módulo encontrado")
           return False
       for module in discovered_modules:
           if not self.register_module(module):
               logger.error(f"❌ Falha ao registrar módulo: {module}")
               return False
       if not self.initialize_modules():
           return False
       logger.info("🎯 SPR 1.1 iniciado com sucesso!")
       logger.info("=" * 60)
       return True

   def shutdown(self):
       logger.info("🔄 Finalizando SPR 1.1...")
       for module_name in self.modules:
           logger.info(f"   ⏹️  Finalizando {module_name}")
       logger.info("✅ SPR 1.1 finalizado")

def parse_arguments():
   parser = argparse.ArgumentParser(
       description='SPR 1.1 - Sistema de Previsão Rural',
       formatter_class=argparse.RawDescriptionHelpFormatter
   )
   parser.add_argument('--check', action='store_true', help='Executa health check do sistema')
   parser.add_argument('--version', action='store_true', help='Mostra versão do sistema')
   return parser.parse_args()

def main():
   try:
       args = parse_arguments()
       if args.version:
           print("SPR 1.1 - Sistema de Previsão Rural")
           print("Royal Negócios Agrícolas")
           return 0
       spr = SPRSystem()
       if args.check:
           if not spr.load_environment():
               return 1
           discovered = spr.discover_modules()
           for module in discovered:
               spr.register_module(module)
           health = spr.health_check()
           print("🔍 SPR Health Check:")
           for component, status in health.items():
               print(f"   {component}: {status}")
           return 0
       if spr.startup():
           print("\n💡 Sistema pronto para operação")
           print("   (Pressione Ctrl+C para finalizar)")
           try:
               input("\n   Pressione Enter para finalizar...")
           except KeyboardInterrupt:
               print("\n")
           finally:
               spr.shutdown()
           return 0
       else:
           logger.error("❌ Falha na inicialização do sistema")
           return 1
   except KeyboardInterrupt:
       print("\n\n🔄 Interrompido pelo usuário")
       return 0
   except Exception as e:
       logger.error(f"❌ Erro fatal: {e}")
       return 1

if __name__ == "__main__":
   sys.exit(main()) 