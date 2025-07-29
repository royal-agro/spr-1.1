"""
SPR 1.1 - Cliente CKAN para dados do MAPA
Cliente genérico para API CKAN do portal dados.agricultura.gov.br
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin
import pandas as pd

from core.config import Config
from core.utils import HttpClient, FileUtils
from core.logging_conf import get_module_logger

logger = get_module_logger("mapa.ckan_client")


class CKANAPIError(Exception):
    """Exceção específica para erros da API CKAN"""
    pass


class CKANClient:
    """Cliente genérico para API CKAN"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or Config.MAPA_CKAN_BASE
        self.api_base = urljoin(self.base_url, "/api/3/action/")
        self.http_client = HttpClient()
        
        # Cache para evitar consultas repetidas
        self._packages_cache: Dict[str, Dict] = {}
        self._resources_cache: Dict[str, Dict] = {}
    
    def package_search(
        self,
        query: str = "*:*",
        rows: int = 100,
        start: int = 0,
        sort: str = "metadata_modified desc",
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Busca packages (datasets) no CKAN
        
        Args:
            query: Query de busca (padrão: todos)
            rows: Número de resultados por página
            start: Offset para paginação
            sort: Critério de ordenação
            filters: Filtros adicionais (fq parameter)
        
        Returns:
            Resultado da busca com metadados
        """
        logger.info(f"Buscando packages: '{query}' (rows={rows}, start={start})")
        
        params = {
            "q": query,
            "rows": rows,
            "start": start,
            "sort": sort
        }
        
        # Adiciona filtros se fornecidos
        if filters:
            filter_queries = []
            for key, value in filters.items():
                if isinstance(value, list):
                    # Múltiplos valores: (key:value1 OR key:value2)
                    or_values = " OR ".join([f"{key}:{v}" for v in value])
                    filter_queries.append(f"({or_values})")
                else:
                    filter_queries.append(f"{key}:{value}")
            
            if filter_queries:
                params["fq"] = " AND ".join(filter_queries)
        
        try:
            response = self.http_client.get(
                urljoin(self.api_base, "package_search"),
                params=params
            )
            
            result = response.json()
            
            if not result.get("success", False):
                raise CKANAPIError(f"API retornou erro: {result.get('error', 'Erro desconhecido')}")
            
            search_result = result["result"]
            
            logger.info(
                f"Busca concluída: {search_result['count']} resultados totais, "
                f"retornando {len(search_result['results'])} registros"
            )
            
            return search_result
            
        except Exception as e:
            logger.error(f"Erro na busca de packages: {e}")
            raise CKANAPIError(f"Falha ao buscar packages: {e}")
    
    def package_show(self, package_id: str) -> Dict[str, Any]:
        """
        Obtém detalhes completos de um package
        
        Args:
            package_id: ID ou nome do package
        
        Returns:
            Metadados completos do package
        """
        # Verifica cache
        if package_id in self._packages_cache:
            logger.debug(f"Package {package_id} encontrado no cache")
            return self._packages_cache[package_id]
        
        logger.info(f"Obtendo detalhes do package: {package_id}")
        
        try:
            response = self.http_client.get(
                urljoin(self.api_base, "package_show"),
                params={"id": package_id}
            )
            
            result = response.json()
            
            if not result.get("success", False):
                raise CKANAPIError(f"Package não encontrado: {package_id}")
            
            package_data = result["result"]
            
            # Salva no cache
            self._packages_cache[package_id] = package_data
            
            logger.info(
                f"Package obtido: '{package_data.get('title', package_id)}' "
                f"com {len(package_data.get('resources', []))} recursos"
            )
            
            return package_data
            
        except Exception as e:
            logger.error(f"Erro ao obter package {package_id}: {e}")
            raise CKANAPIError(f"Falha ao obter package: {e}")
    
    def resource_show(self, resource_id: str) -> Dict[str, Any]:
        """
        Obtém detalhes de um resource específico
        
        Args:
            resource_id: ID do resource
        
        Returns:
            Metadados do resource
        """
        # Verifica cache
        if resource_id in self._resources_cache:
            logger.debug(f"Resource {resource_id} encontrado no cache")
            return self._resources_cache[resource_id]
        
        logger.info(f"Obtendo detalhes do resource: {resource_id}")
        
        try:
            response = self.http_client.get(
                urljoin(self.api_base, "resource_show"),
                params={"id": resource_id}
            )
            
            result = response.json()
            
            if not result.get("success", False):
                raise CKANAPIError(f"Resource não encontrado: {resource_id}")
            
            resource_data = result["result"]
            
            # Salva no cache
            self._resources_cache[resource_id] = resource_data
            
            logger.info(f"Resource obtido: '{resource_data.get('name', resource_id)}'")
            
            return resource_data
            
        except Exception as e:
            logger.error(f"Erro ao obter resource {resource_id}: {e}")
            raise CKANAPIError(f"Falha ao obter resource: {e}")
    
    def download_resource(
        self,
        resource_id: str,
        output_path: Path,
        force_download: bool = False
    ) -> Path:
        """
        Baixa um resource para arquivo local
        
        Args:
            resource_id: ID do resource
            output_path: Caminho de destino
            force_download: Se deve forçar download mesmo se arquivo existe
        
        Returns:
            Caminho do arquivo baixado
        """
        # Verifica se arquivo já existe
        if output_path.exists() and not force_download:
            logger.info(f"Arquivo já existe: {output_path}")
            return output_path
        
        # Obtém metadados do resource
        resource_data = self.resource_show(resource_id)
        
        download_url = resource_data.get("url")
        if not download_url:
            raise CKANAPIError(f"Resource {resource_id} não possui URL de download")
        
        logger.info(f"Baixando resource {resource_id} de: {download_url}")
        
        # Garante que diretório pai existe
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Faz download
            downloaded_file = self.http_client.download_file(download_url, output_path)
            
            # Verifica se arquivo foi baixado corretamente
            if not downloaded_file.exists() or downloaded_file.stat().st_size == 0:
                raise CKANAPIError(f"Download falhou ou arquivo vazio: {downloaded_file}")
            
            logger.info(
                f"Download concluído: {downloaded_file} "
                f"({downloaded_file.stat().st_size} bytes)"
            )
            
            return downloaded_file
            
        except Exception as e:
            logger.error(f"Erro no download do resource {resource_id}: {e}")
            
            # Remove arquivo parcial se existir
            if output_path.exists():
                output_path.unlink()
            
            raise CKANAPIError(f"Falha no download: {e}")
    
    def search_datasets_by_keywords(
        self,
        keywords: List[str],
        organization: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Busca datasets por palavras-chave
        
        Args:
            keywords: Lista de palavras-chave
            organization: Filtro por organização
            limit: Limite de resultados
        
        Returns:
            Lista de packages encontrados
        """
        # Constrói query
        if len(keywords) == 1:
            query = keywords[0]
        else:
            # Busca por qualquer palavra-chave
            query = "(" + " OR ".join(keywords) + ")"
        
        filters = {}
        if organization:
            filters["organization"] = organization
        
        all_results = []
        start = 0
        rows = min(50, limit)
        
        while len(all_results) < limit:
            result = self.package_search(
                query=query,
                rows=rows,
                start=start,
                filters=filters
            )
            
            packages = result.get("results", [])
            if not packages:
                break
            
            all_results.extend(packages)
            start += rows
            
            # Se retornou menos que o solicitado, não há mais resultados
            if len(packages) < rows:
                break
        
        return all_results[:limit]
    
    def get_latest_resources_by_format(
        self,
        package_id: str,
        preferred_formats: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtém resources mais recentes de um package, priorizando formatos
        
        Args:
            package_id: ID do package
            preferred_formats: Formatos preferidos (ex: ['CSV', 'XLSX'])
        
        Returns:
            Lista de resources ordenados por preferência e data
        """
        if preferred_formats is None:
            preferred_formats = ['CSV', 'XLSX', 'XLS', 'JSON']
        
        # Converte para minúsculo para comparação
        preferred_formats = [fmt.lower() for fmt in preferred_formats]
        
        package_data = self.package_show(package_id)
        resources = package_data.get("resources", [])
        
        if not resources:
            return []
        
        # Adiciona score de preferência baseado no formato
        scored_resources = []
        for resource in resources:
            format_str = resource.get("format", "").lower()
            
            # Score baseado na posição na lista de preferência
            if format_str in preferred_formats:
                score = len(preferred_formats) - preferred_formats.index(format_str)
            else:
                score = 0
            
            scored_resources.append({
                **resource,
                "_preference_score": score
            })
        
        # Ordena por score de preferência (desc) e depois por data modificação (desc)
        scored_resources.sort(
            key=lambda x: (
                x["_preference_score"],
                x.get("last_modified", "1900-01-01")
            ),
            reverse=True
        )
        
        return scored_resources
    
    def get_organizations(self) -> List[Dict[str, Any]]:
        """Obtém lista de organizações disponíveis"""
        try:
            response = self.http_client.get(urljoin(self.api_base, "organization_list"))
            result = response.json()
            
            if result.get("success", False):
                return result["result"]
            else:
                return []
                
        except Exception as e:
            logger.error(f"Erro ao obter organizações: {e}")
            return []
    
    def get_groups(self) -> List[Dict[str, Any]]:
        """Obtém lista de grupos/temas disponíveis"""
        try:
            response = self.http_client.get(urljoin(self.api_base, "group_list"))
            result = response.json()
            
            if result.get("success", False):
                return result["result"]
            else:
                return []
                
        except Exception as e:
            logger.error(f"Erro ao obter grupos: {e}")
            return []
    
    def health_check(self) -> Dict[str, Any]:
        """Verifica saúde da API CKAN"""
        try:
            # Testa busca simples
            result = self.package_search(query="*:*", rows=1)
            
            return {
                "status": "healthy",
                "api_accessible": True,
                "total_packages": result.get("count", 0),
                "api_version": "3",
                "last_check": pd.Timestamp.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "api_accessible": False,
                "error": str(e),
                "last_check": pd.Timestamp.now().isoformat()
            }
    
    def export_package_catalog(self, output_file: Path) -> int:
        """
        Exporta catálogo completo de packages para CSV
        
        Args:
            output_file: Arquivo de saída
        
        Returns:
            Número de packages exportados
        """
        logger.info("Exportando catálogo completo de packages...")
        
        all_packages = []
        start = 0
        rows = 100
        
        while True:
            result = self.package_search(
                query="