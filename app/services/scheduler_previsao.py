# services/scheduler_previsao.py
# 📦 SPR 1.1 – Serviço de Agendamento para Previsões Automáticas

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import asyncio

from app.services.whatsapp_previsao import whatsapp_previsao_service

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AgendamentoPrevisao:
    """
    Classe para representar um agendamento de previsão.
    """
    id: str
    cultura: str
    contatos: List[str]
    dias_futuros: int
    formato: str
    frequencia: str  # 'diaria', 'semanal', 'mensal'
    hora_envio: str  # formato HH:MM
    dia_semana: Optional[int] = None  # 0=segunda, 6=domingo
    ativo: bool = True
    criado_em: datetime = None
    ultimo_envio: Optional[datetime] = None
    proximo_envio: Optional[datetime] = None

class SchedulerPrevisaoService:
    """
    Serviço para agendamento automático de previsões de preços.
    
    Funcionalidades:
    - Agendar previsões automáticas
    - Gerenciar frequências (diária, semanal, mensal)
    - Integração com WhatsApp
    - Monitoramento de execuções
    """
    
    def __init__(self):
        self.agendamentos: Dict[str, AgendamentoPrevisao] = {}
        self.executando = False
        
    def criar_agendamento(
        self,
        cultura: str,
        contatos: List[str],
        frequencia: str = 'semanal',
        hora_envio: str = '07:00',
        dia_semana: Optional[int] = 0,  # Segunda-feira
        dias_futuros: int = 7,
        formato: str = 'texto'
    ) -> str:
        """
        Cria um novo agendamento de previsão.
        
        Args:
            cultura: Nome da cultura
            contatos: Lista de números WhatsApp
            frequencia: Frequência do envio (diaria, semanal, mensal)
            hora_envio: Hora do envio (HH:MM)
            dia_semana: Dia da semana (0=segunda, 6=domingo)
            dias_futuros: Número de dias para previsão
            formato: Formato do envio
            
        Returns:
            ID do agendamento criado
        """
        try:
            # Gerar ID único
            agendamento_id = f"prev_{cultura}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Calcular próximo envio
            proximo_envio = self._calcular_proximo_envio(
                frequencia, hora_envio, dia_semana
            )
            
            # Criar agendamento
            agendamento = AgendamentoPrevisao(
                id=agendamento_id,
                cultura=cultura,
                contatos=contatos,
                dias_futuros=dias_futuros,
                formato=formato,
                frequencia=frequencia,
                hora_envio=hora_envio,
                dia_semana=dia_semana,
                ativo=True,
                criado_em=datetime.now(),
                proximo_envio=proximo_envio
            )
            
            # Armazenar agendamento
            self.agendamentos[agendamento_id] = agendamento
            
            # Log da criação
            logger.info(json.dumps({
                "evento": "agendamento_criado",
                "id": agendamento_id,
                "cultura": cultura,
                "contatos": len(contatos),
                "frequencia": frequencia,
                "proximo_envio": proximo_envio.isoformat(),
                "timestamp": datetime.now().isoformat()
            }))
            
            return agendamento_id
            
        except Exception as e:
            logger.error(f"Erro ao criar agendamento: {str(e)}")
            raise
    
    def listar_agendamentos(self, ativo_apenas: bool = True) -> List[Dict]:
        """
        Lista todos os agendamentos.
        
        Args:
            ativo_apenas: Se deve listar apenas agendamentos ativos
            
        Returns:
            Lista de agendamentos
        """
        agendamentos = []
        
        for agendamento in self.agendamentos.values():
            if ativo_apenas and not agendamento.ativo:
                continue
                
            agendamentos.append({
                'id': agendamento.id,
                'cultura': agendamento.cultura,
                'contatos': len(agendamento.contatos),
                'dias_futuros': agendamento.dias_futuros,
                'formato': agendamento.formato,
                'frequencia': agendamento.frequencia,
                'hora_envio': agendamento.hora_envio,
                'dia_semana': agendamento.dia_semana,
                'ativo': agendamento.ativo,
                'criado_em': agendamento.criado_em.isoformat() if agendamento.criado_em else None,
                'ultimo_envio': agendamento.ultimo_envio.isoformat() if agendamento.ultimo_envio else None,
                'proximo_envio': agendamento.proximo_envio.isoformat() if agendamento.proximo_envio else None
            })
        
        return agendamentos
    
    def obter_agendamento(self, agendamento_id: str) -> Optional[Dict]:
        """
        Obtém um agendamento específico.
        
        Args:
            agendamento_id: ID do agendamento
            
        Returns:
            Dados do agendamento ou None
        """
        agendamento = self.agendamentos.get(agendamento_id)
        if not agendamento:
            return None
            
        return {
            'id': agendamento.id,
            'cultura': agendamento.cultura,
            'contatos': agendamento.contatos,
            'dias_futuros': agendamento.dias_futuros,
            'formato': agendamento.formato,
            'frequencia': agendamento.frequencia,
            'hora_envio': agendamento.hora_envio,
            'dia_semana': agendamento.dia_semana,
            'ativo': agendamento.ativo,
            'criado_em': agendamento.criado_em.isoformat() if agendamento.criado_em else None,
            'ultimo_envio': agendamento.ultimo_envio.isoformat() if agendamento.ultimo_envio else None,
            'proximo_envio': agendamento.proximo_envio.isoformat() if agendamento.proximo_envio else None
        }
    
    def atualizar_agendamento(
        self,
        agendamento_id: str,
        **kwargs
    ) -> bool:
        """
        Atualiza um agendamento existente.
        
        Args:
            agendamento_id: ID do agendamento
            **kwargs: Campos a serem atualizados
            
        Returns:
            True se atualizado com sucesso
        """
        try:
            agendamento = self.agendamentos.get(agendamento_id)
            if not agendamento:
                return False
            
            # Atualizar campos permitidos
            campos_permitidos = [
                'contatos', 'dias_futuros', 'formato', 'frequencia',
                'hora_envio', 'dia_semana', 'ativo'
            ]
            
            for campo, valor in kwargs.items():
                if campo in campos_permitidos:
                    setattr(agendamento, campo, valor)
            
            # Recalcular próximo envio se necessário
            if any(campo in kwargs for campo in ['frequencia', 'hora_envio', 'dia_semana']):
                agendamento.proximo_envio = self._calcular_proximo_envio(
                    agendamento.frequencia,
                    agendamento.hora_envio,
                    agendamento.dia_semana
                )
            
            logger.info(f"Agendamento {agendamento_id} atualizado")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar agendamento {agendamento_id}: {str(e)}")
            return False
    
    def remover_agendamento(self, agendamento_id: str) -> bool:
        """
        Remove um agendamento.
        
        Args:
            agendamento_id: ID do agendamento
            
        Returns:
            True se removido com sucesso
        """
        try:
            if agendamento_id in self.agendamentos:
                del self.agendamentos[agendamento_id]
                logger.info(f"Agendamento {agendamento_id} removido")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Erro ao remover agendamento {agendamento_id}: {str(e)}")
            return False
    
    def pausar_agendamento(self, agendamento_id: str) -> bool:
        """
        Pausa um agendamento (define como inativo).
        
        Args:
            agendamento_id: ID do agendamento
            
        Returns:
            True se pausado com sucesso
        """
        return self.atualizar_agendamento(agendamento_id, ativo=False)
    
    def reativar_agendamento(self, agendamento_id: str) -> bool:
        """
        Reativa um agendamento pausado.
        
        Args:
            agendamento_id: ID do agendamento
            
        Returns:
            True se reativado com sucesso
        """
        return self.atualizar_agendamento(agendamento_id, ativo=True)
    
    def _calcular_proximo_envio(
        self,
        frequencia: str,
        hora_envio: str,
        dia_semana: Optional[int] = None
    ) -> datetime:
        """
        Calcula a próxima data/hora de envio.
        
        Args:
            frequencia: Frequência do envio
            hora_envio: Hora do envio (HH:MM)
            dia_semana: Dia da semana (para frequência semanal)
            
        Returns:
            Próxima data/hora de envio
        """
        try:
            # Parsear hora
            hora, minuto = map(int, hora_envio.split(':'))
            
            # Data base (hoje)
            agora = datetime.now()
            
            if frequencia == 'diaria':
                # Próximo envio: amanhã na hora especificada
                proximo = agora.replace(hour=hora, minute=minuto, second=0, microsecond=0)
                if proximo <= agora:
                    proximo += timedelta(days=1)
                    
            elif frequencia == 'semanal':
                # Próximo envio: próximo dia da semana na hora especificada
                dias_ate_proximo = (dia_semana - agora.weekday()) % 7
                if dias_ate_proximo == 0:
                    # Mesmo dia da semana
                    proximo = agora.replace(hour=hora, minute=minuto, second=0, microsecond=0)
                    if proximo <= agora:
                        dias_ate_proximo = 7
                
                if dias_ate_proximo > 0:
                    proximo = agora + timedelta(days=dias_ate_proximo)
                    proximo = proximo.replace(hour=hora, minute=minuto, second=0, microsecond=0)
                    
            elif frequencia == 'mensal':
                # Próximo envio: mesmo dia do próximo mês
                if agora.month == 12:
                    proximo = agora.replace(year=agora.year + 1, month=1, hour=hora, minute=minuto, second=0, microsecond=0)
                else:
                    proximo = agora.replace(month=agora.month + 1, hour=hora, minute=minuto, second=0, microsecond=0)
                    
            else:
                raise ValueError(f"Frequência '{frequencia}' não suportada")
            
            return proximo
            
        except Exception as e:
            logger.error(f"Erro ao calcular próximo envio: {str(e)}")
            # Fallback: amanhã na mesma hora
            return agora + timedelta(days=1)
    
    def verificar_envios_pendentes(self) -> List[str]:
        """
        Verifica agendamentos que devem ser executados agora.
        
        Returns:
            Lista de IDs de agendamentos a serem executados
        """
        agora = datetime.now()
        pendentes = []
        
        for agendamento_id, agendamento in self.agendamentos.items():
            if (agendamento.ativo and 
                agendamento.proximo_envio and 
                agendamento.proximo_envio <= agora):
                pendentes.append(agendamento_id)
        
        return pendentes
    
    def executar_agendamento(self, agendamento_id: str) -> Dict:
        """
        Executa um agendamento específico.
        
        Args:
            agendamento_id: ID do agendamento
            
        Returns:
            Resultado da execução
        """
        try:
            agendamento = self.agendamentos.get(agendamento_id)
            if not agendamento:
                return {'erro': 'Agendamento não encontrado'}
            
            # Executar envio
            resultado = whatsapp_previsao_service.enviar_previsao_agendada(
                cultura=agendamento.cultura,
                contatos=agendamento.contatos,
                dias_futuros=agendamento.dias_futuros,
                formato=agendamento.formato
            )
            
            # Atualizar agendamento
            agendamento.ultimo_envio = datetime.now()
            agendamento.proximo_envio = self._calcular_proximo_envio(
                agendamento.frequencia,
                agendamento.hora_envio,
                agendamento.dia_semana
            )
            
            # Log da execução
            logger.info(json.dumps({
                "evento": "agendamento_executado",
                "id": agendamento_id,
                "cultura": agendamento.cultura,
                "contatos": len(agendamento.contatos),
                "sucessos": resultado.get('sucessos', 0),
                "falhas": resultado.get('falhas', 0),
                "proximo_envio": agendamento.proximo_envio.isoformat(),
                "timestamp": datetime.now().isoformat()
            }))
            
            return resultado
            
        except Exception as e:
            logger.error(f"Erro ao executar agendamento {agendamento_id}: {str(e)}")
            return {'erro': str(e)}
    
    async def iniciar_monitoramento(self, intervalo_segundos: int = 60):
        """
        Inicia o monitoramento automático de agendamentos.
        
        Args:
            intervalo_segundos: Intervalo de verificação em segundos
        """
        self.executando = True
        logger.info("Monitoramento de agendamentos iniciado")
        
        while self.executando:
            try:
                # Verificar agendamentos pendentes
                pendentes = self.verificar_envios_pendentes()
                
                # Executar agendamentos pendentes
                for agendamento_id in pendentes:
                    resultado = self.executar_agendamento(agendamento_id)
                    logger.info(f"Agendamento {agendamento_id} executado: {resultado}")
                
                # Aguardar próxima verificação
                await asyncio.sleep(intervalo_segundos)
                
            except Exception as e:
                logger.error(f"Erro no monitoramento: {str(e)}")
                await asyncio.sleep(intervalo_segundos)
    
    def parar_monitoramento(self):
        """
        Para o monitoramento automático.
        """
        self.executando = False
        logger.info("Monitoramento de agendamentos parado")
    
    def obter_estatisticas(self) -> Dict:
        """
        Obtém estatísticas dos agendamentos.
        
        Returns:
            Estatísticas dos agendamentos
        """
        total = len(self.agendamentos)
        ativos = sum(1 for a in self.agendamentos.values() if a.ativo)
        inativos = total - ativos
        
        # Contar por cultura
        por_cultura = {}
        for agendamento in self.agendamentos.values():
            cultura = agendamento.cultura
            if cultura not in por_cultura:
                por_cultura[cultura] = 0
            por_cultura[cultura] += 1
        
        # Contar por frequência
        por_frequencia = {}
        for agendamento in self.agendamentos.values():
            freq = agendamento.frequencia
            if freq not in por_frequencia:
                por_frequencia[freq] = 0
            por_frequencia[freq] += 1
        
        return {
            'total_agendamentos': total,
            'ativos': ativos,
            'inativos': inativos,
            'por_cultura': por_cultura,
            'por_frequencia': por_frequencia,
            'executando': self.executando,
            'timestamp': datetime.now().isoformat()
        }

# Instância global do serviço
scheduler_previsao_service = SchedulerPrevisaoService() 