"""
Módulo de Clientes
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ModuloClientes:
    def __init__(self):
        self.clientes = []
        self.configuracoes = {}
    
    def cadastrar_cliente(self, nome: str, email: str, telefone: Optional[str] = None) -> Dict:
        """Cadastra um novo cliente"""
        try:
            cliente = {
                'id': len(self.clientes) + 1,
                'nome': nome,
                'email': email,
                'telefone': telefone,
                'data_cadastro': datetime.now().isoformat(),
                'ativo': True
            }
            
            self.clientes.append(cliente)
            logger.info(f"✅ Cliente cadastrado: {nome}")
            return cliente
        except Exception as e:
            logger.error(f"❌ Erro ao cadastrar cliente: {e}")
            return {'erro': str(e)}
    
    def listar_clientes(self) -> List[Dict]:
        """Lista todos os clientes"""
        try:
            logger.info(f"📋 Listando {len(self.clientes)} clientes")
            return self.clientes
        except Exception as e:
            logger.error(f"❌ Erro ao listar clientes: {e}")
            return []
    
    def atualizar_cliente(self, cliente_id: int, dados: Dict) -> Dict:
        """Atualiza dados de um cliente"""
        try:
            cliente = next((c for c in self.clientes if c['id'] == cliente_id), None)
            if not cliente:
                return {'erro': 'Cliente não encontrado'}
            
            # Atualiza os dados do cliente
            for chave, valor in dados.items():
                if chave in cliente:
                    cliente[chave] = valor
            
            cliente['data_atualizacao'] = datetime.now().isoformat()
            
            logger.info(f"✅ Cliente atualizado: ID {cliente_id}")
            return cliente
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar cliente: {e}")
            return {'erro': str(e)}
    
    def buscar_cliente(self, termo: str) -> List[Dict]:
        """Busca clientes por nome ou email"""
        try:
            resultados = []
            for cliente in self.clientes:
                if (termo.lower() in cliente['nome'].lower() or 
                    termo.lower() in cliente['email'].lower()):
                    resultados.append(cliente)
            
            logger.info(f"🔍 Busca: {len(resultados)} clientes encontrados")
            return resultados
        except Exception as e:
            logger.error(f"❌ Erro na busca: {e}")
            return []
    
    def desativar_cliente(self, cliente_id: int) -> Dict:
        """Desativa um cliente"""
        try:
            cliente = next((c for c in self.clientes if c['id'] == cliente_id), None)
            if not cliente:
                return {'erro': 'Cliente não encontrado'}
            
            cliente['ativo'] = False
            cliente['data_desativacao'] = datetime.now().isoformat()
            
            logger.info(f"🚫 Cliente desativado: ID {cliente_id}")
            return {'status': 'desativado', 'cliente_id': cliente_id}
        except Exception as e:
            logger.error(f"❌ Erro ao desativar cliente: {e}")
            return {'erro': str(e)} 