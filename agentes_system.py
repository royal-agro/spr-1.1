#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPR Multi-Agent System Controller
Sistema de controle para equipe multi-agente especializada em agronegócio
Desenvolvido para: Sistema Preditivo Royal (SPR)
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import glob

class SPRAgentSystem:
    def __init__(self, config_path: str = "config/agentes_config.json"):
        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = {}
        self.agents: Dict[str, 'Agent'] = {}
        self.project_root = Path(__file__).parent
        self.logger = self._setup_logging()
        
    def _setup_logging(self) -> logging.Logger:
        """Configura sistema de logging para agentes"""
        logging.basicConfig(
            level=logging.INFO,
            format='🤖 %(asctime)s - [%(name)s] - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(sys.stdout),
                logging.FileHandler(self.project_root / "logs" / "agentes_system.log", mode='a')
            ]
        )
        return logging.getLogger('SPR_Agents')

    def load_config(self) -> bool:
        """Carrega configuração dos agentes"""
        try:
            if not self.config_path.exists():
                self.logger.error(f"❌ Arquivo de configuração não encontrado: {self.config_path}")
                return False
                
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
                
            self.logger.info(f"✅ Configuração carregada: {self.config_path}")
            return True
        except Exception as e:
            self.logger.error(f"❌ Erro ao carregar configuração: {e}")
            return False

    def initialize_agents(self) -> bool:
        """Inicializa todos os agentes do sistema"""
        try:
            agent_configs = self.config.get('spr_multi_agent_system', {}).get('agents', {})
            
            self.logger.info("🚀 Inicializando Sistema Multi-Agente SPR...")
            
            for agent_id, agent_config in agent_configs.items():
                agent = Agent(agent_id, agent_config, self.project_root, self.logger)
                if agent.initialize():
                    self.agents[agent_id] = agent
                    self.logger.info(f"✅ Agente inicializado: {agent.name}")
                else:
                    self.logger.error(f"❌ Falha ao inicializar agente: {agent_id}")
                    
            self.logger.info(f"🎯 Sistema Multi-Agente SPR inicializado com {len(self.agents)} agentes")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Erro na inicialização dos agentes: {e}")
            return False

    def get_agent_by_pattern(self, file_path: str) -> Optional['Agent']:
        """Encontra o agente responsável por um arquivo específico"""
        for agent in self.agents.values():
            if agent.matches_file_pattern(file_path):
                return agent
        return None

    def get_collaboration_suggestions(self, primary_agent_id: str) -> List[str]:
        """Sugere agentes para colaboração baseado na matriz de colaboração"""
        matrix = self.config.get('spr_multi_agent_system', {}).get('collaboration_matrix', {})
        suggestions = []
        
        # Interações primárias
        for interaction, description in matrix.get('primary_interactions', {}).items():
            if primary_agent_id in interaction:
                suggestions.append(f"🔗 {interaction}: {description}")
                
        # Interações secundárias
        for interaction, description in matrix.get('secondary_interactions', {}).items():
            if primary_agent_id in interaction or 'all' in interaction:
                suggestions.append(f"🔗 {interaction}: {description}")
                
        return suggestions

    def analyze_project_files(self) -> Dict[str, List[str]]:
        """Analisa arquivos do projeto e mapeia para agentes responsáveis"""
        file_mapping = {}
        
        # Padrões de arquivos importantes
        file_patterns = [
            "**/*.py", "**/*.js", "**/*.ts", "**/*.tsx", 
            "**/*.sql", "**/*.yml", "**/*.json", "**/*.md"
        ]
        
        for pattern in file_patterns:
            for file_path in glob.glob(str(self.project_root / pattern), recursive=True):
                rel_path = os.path.relpath(file_path, self.project_root)
                agent = self.get_agent_by_pattern(rel_path)
                
                if agent:
                    if agent.id not in file_mapping:
                        file_mapping[agent.id] = []
                    file_mapping[agent.id].append(rel_path)
                    
        return file_mapping

    def generate_team_report(self) -> str:
        """Gera relatório completo do sistema multi-agente"""
        report = []
        report.append("=" * 80)
        report.append("🌾 RELATÓRIO DO SISTEMA MULTI-AGENTE SPR")
        report.append("=" * 80)
        
        # Informações do projeto
        project_info = self.config.get('spr_multi_agent_system', {}).get('project_context', {})
        report.append(f"📊 Projeto: {project_info.get('name', 'N/A')}")
        report.append(f"🏗 Stack: {', '.join(project_info.get('stack', {}).values())}")
        report.append(f"🌾 Domínio: {project_info.get('domain', 'N/A')}")
        report.append("")
        
        # Status dos agentes
        report.append("👥 AGENTES ATIVOS:")
        for agent_id, agent in self.agents.items():
            report.append(f"  ✅ {agent.name} ({agent_id})")
            report.append(f"     🎯 {agent.role}")
            report.append(f"     🔧 {', '.join(agent.technologies)}")
            report.append("")
            
        # Mapeamento de arquivos
        file_mapping = self.analyze_project_files()
        report.append("📁 RESPONSABILIDADE POR ARQUIVOS:")
        for agent_id, files in file_mapping.items():
            agent_name = self.agents[agent_id].name if agent_id in self.agents else agent_id
            report.append(f"  👤 {agent_name}: {len(files)} arquivo(s)")
            
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)

    def start_system(self) -> bool:
        """Inicia o sistema completo"""
        self.logger.info("🌾 Iniciando Sistema Multi-Agente SPR...")
        
        if not self.load_config():
            return False
            
        if not self.initialize_agents():
            return False
            
        # Criar diretórios necessários
        os.makedirs(self.project_root / "logs", exist_ok=True)
        
        # Gerar relatório
        report = self.generate_team_report()
        self.logger.info("📊 Relatório do sistema gerado")
        
        # Salvar relatório
        with open(self.project_root / "logs" / f"team_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt", 'w', encoding='utf-8') as f:
            f.write(report)
            
        print(report)
        
        self.logger.info("🚀 Sistema Multi-Agente SPR iniciado com sucesso!")
        return True


class Agent:
    """Classe que representa um agente individual do sistema"""
    
    def __init__(self, agent_id: str, config: Dict[str, Any], project_root: Path, logger: logging.Logger):
        self.id = agent_id
        self.config = config
        self.project_root = project_root
        self.logger = logger
        
        # Propriedades do agente
        self.name = config.get('name', agent_id)
        self.role = config.get('role', '')
        self.technologies = config.get('technologies', [])
        self.responsibilities = config.get('responsibilities', [])
        self.file_patterns = config.get('file_patterns', [])
        self.apis_focus = config.get('apis_focus', [])
        
        self.status = "inactive"
        
    def initialize(self) -> bool:
        """Inicializa o agente"""
        try:
            self.logger.info(f"🔧 Inicializando agente: {self.name}")
            
            # Verificar se há arquivos correspondentes aos padrões
            matching_files = []
            for pattern in self.file_patterns:
                matches = glob.glob(str(self.project_root / pattern), recursive=True)
                matching_files.extend(matches)
                
            if matching_files:
                self.logger.info(f"📁 {self.name}: {len(matching_files)} arquivo(s) encontrado(s)")
                self.status = "active"
                return True
            else:
                self.logger.warning(f"⚠️ {self.name}: Nenhum arquivo encontrado para os padrões especificados")
                self.status = "standby"
                return True
                
        except Exception as e:
            self.logger.error(f"❌ Erro ao inicializar {self.name}: {e}")
            self.status = "error"
            return False
            
    def matches_file_pattern(self, file_path: str) -> bool:
        """Verifica se um arquivo corresponde aos padrões do agente"""
        import fnmatch
        
        for pattern in self.file_patterns:
            if fnmatch.fnmatch(file_path, pattern):
                return True
        return False
        
    def get_context_info(self) -> Dict[str, Any]:
        """Retorna informações contextuais do agente"""
        return {
            'id': self.id,
            'name': self.name,
            'role': self.role,
            'status': self.status,
            'technologies': self.technologies,
            'responsibilities': self.responsibilities,
            'file_patterns': self.file_patterns,
            'apis_focus': self.apis_focus
        }


def main():
    """Função principal para execução do sistema"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SPR Multi-Agent System Controller')
    parser.add_argument('--start', action='store_true', help='Inicia o sistema multi-agente')
    parser.add_argument('--config', type=str, default='config/agentes_config.json', 
                       help='Caminho para arquivo de configuração')
    
    args = parser.parse_args()
    
    system = SPRAgentSystem(args.config)
    
    if args.start:
        success = system.start_system()
        sys.exit(0 if success else 1)
    else:
        print("🤖 SPR Multi-Agent System Controller")
        print("Use --start para iniciar o sistema")
        print("Use --help para ver todas as opções")


if __name__ == "__main__":
    main()