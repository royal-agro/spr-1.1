"""
📦 SPR 1.1 - Agendador de Ingestão de Dados
Sistema de agendamento automático para coleta de dados
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import atexit
import os

# Importar jobs de ingestão
from app.ingestao.ingest_cepea import job_ingestao_cepea
from app.ingestao.ingest_clima import job_ingestao_clima
from app.ingestao.ingest_cambio import job_ingestao_cambio
from app.ingestao.ingest_estoque import job_ingestao_estoque
from app.ingestao.ingest_sentimento import job_ingestao_sentimento

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SchedulerIngestao:
    """
    Gerenciador de agendamento para ingestão de dados
    """
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.jobs_status = {}
        self.logs_execucao = []
        self.max_logs = 1000  # Máximo de logs mantidos
        
        # Registrar shutdown
        atexit.register(lambda: self.parar_scheduler())
        
    def iniciar_scheduler(self):
        """Inicia o scheduler de tarefas"""
        try:
            self.scheduler.start()
            logger.info("✅ Scheduler de ingestão iniciado")
            
            # Configurar jobs padrão
            self.configurar_jobs_padrao()
            
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar scheduler: {e}")
            raise
    
    def parar_scheduler(self):
        """Para o scheduler de tarefas"""
        try:
            if self.scheduler.running:
                self.scheduler.shutdown()
                logger.info("✅ Scheduler de ingestão parado")
        except Exception as e:
            logger.error(f"❌ Erro ao parar scheduler: {e}")
    
    def configurar_jobs_padrao(self):
        """Configura jobs padrão de ingestão"""
        logger.info("🔧 Configurando jobs padrão...")
        
        # Job CEPEA - Diário às 08:00
        self.agendar_job(
            job_id="cepea_diario",
            job_func=job_ingestao_cepea,
            trigger="cron",
            hour=8,
            minute=0,
            descricao="Ingestão diária de preços CEPEA"
        )
        
        # Job Clima - Diário às 06:00
        self.agendar_job(
            job_id="clima_diario",
            job_func=job_ingestao_clima,
            trigger="cron",
            hour=6,
            minute=0,
            descricao="Ingestão diária de dados climáticos"
        )
        
        # Job Câmbio - Dias úteis às 09:00
        self.agendar_job(
            job_id="cambio_diario",
            job_func=job_ingestao_cambio,
            trigger="cron",
            hour=9,
            minute=0,
            day_of_week="mon-fri",
            descricao="Ingestão diária de dados cambiais"
        )
        
        # Job Estoque - Mensal no dia 1 às 10:00
        self.agendar_job(
            job_id="estoque_mensal",
            job_func=job_ingestao_estoque,
            trigger="cron",
            day=1,
            hour=10,
            minute=0,
            descricao="Ingestão mensal de dados de estoque"
        )
        
        # Job Sentimento - A cada 4 horas
        self.agendar_job(
            job_id="sentimento_4h",
            job_func=job_ingestao_sentimento,
            trigger="interval",
            hours=4,
            descricao="Ingestão de sentimento a cada 4 horas"
        )
        
        logger.info("✅ Jobs padrão configurados")
    
    def agendar_job(self, job_id: str, job_func, trigger: str, descricao: str = "", **kwargs):
        """
        Agenda um job de ingestão
        
        Args:
            job_id: ID único do job
            job_func: Função a ser executada
            trigger: Tipo de trigger (cron, interval)
            descricao: Descrição do job
            **kwargs: Parâmetros do trigger
        """
        try:
            # Wrapper para capturar logs
            def job_wrapper():
                return self._executar_job_com_log(job_id, job_func, descricao)
            
            # Configurar trigger
            if trigger == "cron":
                trigger_obj = CronTrigger(**kwargs)
            elif trigger == "interval":
                trigger_obj = IntervalTrigger(**kwargs)
            else:
                raise ValueError(f"Trigger inválido: {trigger}")
            
            # Agendar job
            self.scheduler.add_job(
                func=job_wrapper,
                trigger=trigger_obj,
                id=job_id,
                replace_existing=True,
                max_instances=1
            )
            
            # Registrar status
            self.jobs_status[job_id] = {
                "descricao": descricao,
                "trigger": trigger,
                "kwargs": kwargs,
                "status": "agendado",
                "ultima_execucao": None,
                "proxima_execucao": None,
                "total_execucoes": 0,
                "sucessos": 0,
                "erros": 0
            }
            
            logger.info(f"✅ Job agendado: {job_id} - {descricao}")
            
        except Exception as e:
            logger.error(f"❌ Erro ao agendar job {job_id}: {e}")
            raise
    
    def _executar_job_com_log(self, job_id: str, job_func, descricao: str):
        """Executa job com logging e controle de status"""
        inicio = datetime.now()
        
        try:
            logger.info(f"🚀 Iniciando job: {job_id}")
            
            # Executar job
            resultado = job_func()
            
            # Atualizar status
            self.jobs_status[job_id]["ultima_execucao"] = inicio
            self.jobs_status[job_id]["total_execucoes"] += 1
            
            if resultado.get("status") == "sucesso":
                self.jobs_status[job_id]["sucessos"] += 1
                logger.info(f"✅ Job concluído: {job_id}")
            else:
                self.jobs_status[job_id]["erros"] += 1
                logger.error(f"❌ Job falhou: {job_id}")
            
            # Registrar log
            log_entry = {
                "job_id": job_id,
                "descricao": descricao,
                "inicio": inicio.isoformat(),
                "fim": datetime.now().isoformat(),
                "duracao_segundos": (datetime.now() - inicio).total_seconds(),
                "resultado": resultado,
                "status": resultado.get("status", "erro")
            }
            
            self.logs_execucao.append(log_entry)
            
            # Manter apenas os últimos logs
            if len(self.logs_execucao) > self.max_logs:
                self.logs_execucao = self.logs_execucao[-self.max_logs:]
            
            return resultado
            
        except Exception as e:
            # Atualizar status de erro
            self.jobs_status[job_id]["erros"] += 1
            self.jobs_status[job_id]["ultima_execucao"] = inicio
            
            logger.error(f"❌ Erro na execução do job {job_id}: {e}")
            
            # Registrar log de erro
            log_entry = {
                "job_id": job_id,
                "descricao": descricao,
                "inicio": inicio.isoformat(),
                "fim": datetime.now().isoformat(),
                "duracao_segundos": (datetime.now() - inicio).total_seconds(),
                "erro": str(e),
                "status": "erro"
            }
            
            self.logs_execucao.append(log_entry)
            
            return {"status": "erro", "erro": str(e)}
    
    def obter_status_jobs(self) -> Dict:
        """Obtém status de todos os jobs"""
        status = {}
        
        for job_id, info in self.jobs_status.items():
            # Obter próxima execução do scheduler
            job = self.scheduler.get_job(job_id)
            proxima_execucao = None
            
            if job and job.next_run_time:
                proxima_execucao = job.next_run_time.isoformat()
            
            status[job_id] = {
                **info,
                "proxima_execucao": proxima_execucao,
                "ativo": job is not None
            }
        
        return status
    
    def obter_logs_execucao(self, job_id: str = None, limite: int = 50) -> List[Dict]:
        """Obtém logs de execução"""
        logs = self.logs_execucao
        
        # Filtrar por job_id se especificado
        if job_id:
            logs = [log for log in logs if log["job_id"] == job_id]
        
        # Ordenar por data (mais recente primeiro)
        logs_ordenados = sorted(logs, key=lambda x: x["inicio"], reverse=True)
        
        # Limitar resultados
        return logs_ordenados[:limite]
    
    def pausar_job(self, job_id: str):
        """Pausa um job específico"""
        try:
            self.scheduler.pause_job(job_id)
            self.jobs_status[job_id]["status"] = "pausado"
            logger.info(f"⏸️ Job pausado: {job_id}")
        except Exception as e:
            logger.error(f"❌ Erro ao pausar job {job_id}: {e}")
            raise
    
    def reativar_job(self, job_id: str):
        """Reativa um job pausado"""
        try:
            self.scheduler.resume_job(job_id)
            self.jobs_status[job_id]["status"] = "agendado"
            logger.info(f"▶️ Job reativado: {job_id}")
        except Exception as e:
            logger.error(f"❌ Erro ao reativar job {job_id}: {e}")
            raise
    
    def executar_job_manual(self, job_id: str):
        """Executa um job manualmente"""
        try:
            if job_id not in self.jobs_status:
                raise ValueError(f"Job não encontrado: {job_id}")
            
            # Obter função do job
            job_functions = {
                "cepea_diario": job_ingestao_cepea,
                "clima_diario": job_ingestao_clima,
                "cambio_diario": job_ingestao_cambio,
                "estoque_mensal": job_ingestao_estoque,
                "sentimento_4h": job_ingestao_sentimento
            }
            
            job_func = job_functions.get(job_id)
            if not job_func:
                raise ValueError(f"Função do job não encontrada: {job_id}")
            
            # Executar
            descricao = self.jobs_status[job_id]["descricao"]
            resultado = self._executar_job_com_log(job_id, job_func, descricao)
            
            logger.info(f"✅ Job executado manualmente: {job_id}")
            return resultado
            
        except Exception as e:
            logger.error(f"❌ Erro na execução manual do job {job_id}: {e}")
            raise
    
    def obter_estatisticas(self) -> Dict:
        """Obtém estatísticas gerais do scheduler"""
        total_jobs = len(self.jobs_status)
        jobs_ativos = len([j for j in self.jobs_status.values() if j["status"] == "agendado"])
        
        # Estatísticas de execução
        total_execucoes = sum(j["total_execucoes"] for j in self.jobs_status.values())
        total_sucessos = sum(j["sucessos"] for j in self.jobs_status.values())
        total_erros = sum(j["erros"] for j in self.jobs_status.values())
        
        # Taxa de sucesso
        taxa_sucesso = (total_sucessos / total_execucoes * 100) if total_execucoes > 0 else 0
        
        # Logs recentes
        logs_recentes = self.obter_logs_execucao(None, 10)
        
        return {
            "total_jobs": total_jobs,
            "jobs_ativos": jobs_ativos,
            "jobs_pausados": total_jobs - jobs_ativos,
            "total_execucoes": total_execucoes,
            "total_sucessos": total_sucessos,
            "total_erros": total_erros,
            "taxa_sucesso": round(taxa_sucesso, 1),
            "scheduler_ativo": self.scheduler.running,
            "logs_recentes": logs_recentes
        }
    
    def salvar_configuracao(self, arquivo: str = "scheduler_config.json"):
        """Salva configuração do scheduler"""
        try:
            config = {
                "jobs_status": self.jobs_status,
                "data_salvamento": datetime.now().isoformat()
            }
            
            with open(arquivo, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ Configuração salva: {arquivo}")
            
        except Exception as e:
            logger.error(f"❌ Erro ao salvar configuração: {e}")
    
    def carregar_configuracao(self, arquivo: str = "scheduler_config.json"):
        """Carrega configuração do scheduler"""
        try:
            if os.path.exists(arquivo):
                with open(arquivo, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                
                self.jobs_status = config.get("jobs_status", {})
                logger.info(f"✅ Configuração carregada: {arquivo}")
                
        except Exception as e:
            logger.error(f"❌ Erro ao carregar configuração: {e}")

# Instância global do scheduler
scheduler_ingestao = SchedulerIngestao()

def iniciar_sistema_ingestao():
    """Função para iniciar o sistema completo de ingestão"""
    logger.info("🚀 Iniciando sistema de ingestão de dados...")
    
    try:
        # Carregar configuração
        scheduler_ingestao.carregar_configuracao()
        
        # Iniciar scheduler
        scheduler_ingestao.iniciar_scheduler()
        
        logger.info("✅ Sistema de ingestão iniciado com sucesso!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro ao iniciar sistema de ingestão: {e}")
        return False

def parar_sistema_ingestao():
    """Função para parar o sistema de ingestão"""
    logger.info("🛑 Parando sistema de ingestão...")
    
    try:
        # Salvar configuração
        scheduler_ingestao.salvar_configuracao()
        
        # Parar scheduler
        scheduler_ingestao.parar_scheduler()
        
        logger.info("✅ Sistema de ingestão parado com sucesso!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro ao parar sistema de ingestão: {e}")
        return False

if __name__ == "__main__":
    # Iniciar sistema
    if iniciar_sistema_ingestao():
        print("📊 Sistema de ingestão ativo!")
        print("📋 Status dos jobs:")
        
        # Mostrar status
        status = scheduler_ingestao.obter_status_jobs()
        for job_id, info in status.items():
            print(f"  • {job_id}: {info['descricao']} - {info['status']}")
        
        # Mostrar estatísticas
        stats = scheduler_ingestao.obter_estatisticas()
        print(f"\n📈 Estatísticas:")
        print(f"  • Jobs ativos: {stats['jobs_ativos']}")
        print(f"  • Taxa de sucesso: {stats['taxa_sucesso']}%")
        
        # Manter rodando
        try:
            import time
            while True:
                time.sleep(60)  # Verificar a cada minuto
        except KeyboardInterrupt:
            print("\n🛑 Parando sistema...")
            parar_sistema_ingestao()
    else:
        print("❌ Falha ao iniciar sistema de ingestão") 