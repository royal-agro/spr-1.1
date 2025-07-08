#!/usr/bin/env python3
"""
SPR 1.1 - Script de Sincronização com GitHub via GitHub App
Versão corrigida para autenticação JWT e sincronização automática
"""

import os
import sys
import json
import time
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import requests
import jwt
from git import Repo
from dotenv import load_dotenv

# Configurações
SCRIPT_DIR = Path(__file__).parent
SPR_DIR = SCRIPT_DIR / "SPR"
TEMP_DIR = SCRIPT_DIR / "temp_repo"
CONFIG_FILE = SCRIPT_DIR / "github_pulso_app.json"
PEM_FILE = SCRIPT_DIR / "github_pulso_app.pem"

# Configurações do GitHub
GITHUB_API_URL = "https://api.github.com"
OWNER = "royal-Agro"
REPO_NAME = "spr-main"

class GitHubAppAuth:
    """Classe para autenticação via GitHub App"""
    
    def __init__(self, app_id, private_key_path, installation_id):
        self.app_id = app_id
        self.private_key_path = private_key_path
        self.installation_id = installation_id
        self.installation_token = None
        self.token_expires_at = None
    
    def _load_private_key(self):
        """Carrega a chave privada do arquivo PEM"""
        try:
            with open(self.private_key_path, 'r') as f:
                return f.read()
        except Exception as e:
            print(f"❌ Erro ao carregar chave privada: {e}")
            return None
    
    def _generate_jwt(self):
        """Gera JWT para autenticação da GitHub App"""
        private_key = self._load_private_key()
        if not private_key:
            return None
        
        # Payload do JWT
        now = int(time.time())
        payload = {
            'iat': now - 60,  # Issued at (60s no passado para compensar clock skew)
            'exp': now + 600,  # Expira em 10 minutos
            'iss': self.app_id  # Issuer (App ID)
        }
        
        try:
            # Gera o JWT
            token = jwt.encode(payload, private_key, algorithm='RS256')
            return token
        except Exception as e:
            print(f"❌ Erro ao gerar JWT: {e}")
            return None
    
    def get_installation_token(self):
        """Obtém token de instalação da GitHub App"""
        # Verifica se o token ainda é válido
        if (self.installation_token and self.token_expires_at and 
            datetime.now() < self.token_expires_at - timedelta(minutes=5)):
            return self.installation_token
        
        # Gera novo JWT
        jwt_token = self._generate_jwt()
        if not jwt_token:
            return None
        
        # Solicita token de instalação
        headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SPR-Sync-Script/1.1'
        }
        
        url = f"{GITHUB_API_URL}/app/installations/{self.installation_id}/access_tokens"
        
        try:
            response = requests.post(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            self.installation_token = data['token']
            
            # Calcula quando o token expira
            expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            self.token_expires_at = expires_at
            
            print(f"✅ Token de instalação obtido com sucesso (expira em {expires_at})")
            return self.installation_token
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro ao obter token de instalação: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"   Response: {e.response.text}")
            return None

class SPRSyncManager:
    """Gerenciador de sincronização do SPR"""
    
    def __init__(self):
        self.auth = None
        self.setup_auth()
    
    def setup_auth(self):
        """Configura autenticação com GitHub App"""
        try:
            # Carrega configurações
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
            
            app_id = config['app_id']
            installation_id = config['installation_id']
            
            # Inicializa autenticação
            self.auth = GitHubAppAuth(app_id, PEM_FILE, installation_id)
            print(f"✅ Configuração carregada - App ID: {app_id}, Installation ID: {installation_id}")
            
        except Exception as e:
            print(f"❌ Erro ao carregar configuração: {e}")
            sys.exit(1)
    
    def _make_github_request(self, method, endpoint, **kwargs):
        """Faz requisição autenticada para GitHub API"""
        token = self.auth.get_installation_token()
        if not token:
            raise Exception("Não foi possível obter token de instalação")
        
        headers = kwargs.get('headers', {})
        headers.update({
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SPR-Sync-Script/1.1'
        })
        kwargs['headers'] = headers
        
        url = f"{GITHUB_API_URL}/{endpoint.lstrip('/')}"
        response = requests.request(method, url, **kwargs)
        
        return response
    
    def check_repository_exists(self):
        """Verifica se o repositório existe"""
        print(f"🔍 Verificando se repositório {OWNER}/{REPO_NAME} existe...")
        
        try:
            response = self._make_github_request('GET', f'repos/{OWNER}/{REPO_NAME}')
            
            if response.status_code == 200:
                print(f"✅ Repositório {OWNER}/{REPO_NAME} já existe")
                return True
            elif response.status_code == 404:
                print(f"❌ Repositório {OWNER}/{REPO_NAME} não existe")
                return False
            else:
                print(f"⚠️  Status inesperado: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao verificar repositório: {e}")
            return False
    
    def create_repository(self):
        """Cria o repositório no GitHub"""
        print(f"🔨 Criando repositório {OWNER}/{REPO_NAME}...")
        
        # Primeiro, verifica se é uma organização
        try:
            org_response = self._make_github_request('GET', f'orgs/{OWNER}')
            is_org = org_response.status_code == 200
        except:
            is_org = False
        
        # Dados do repositório
        repo_data = {
            'name': REPO_NAME,
            'description': 'Repositório principal do sistema SPR (Sistema de Produção Rural)',
            'private': True,
            'auto_init': True,
            'gitignore_template': 'Python'
        }
        
        # Escolhe endpoint baseado em organização ou usuário
        if is_org:
            endpoint = f'orgs/{OWNER}/repos'
        else:
            endpoint = 'user/repos'
        
        try:
            response = self._make_github_request('POST', endpoint, json=repo_data)
            
            if response.status_code == 201:
                print(f"✅ Repositório {OWNER}/{REPO_NAME} criado com sucesso")
                return True
            else:
                print(f"❌ Erro ao criar repositório: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao criar repositório: {e}")
            return False
    
    def ensure_repository_exists(self):
        """Garante que o repositório existe"""
        if not self.check_repository_exists():
            return self.create_repository()
        return True
    
    def cleanup_temp_directory(self):
        """Remove diretório temporário"""
        if TEMP_DIR.exists():
            print(f"🧹 Removendo diretório temporário: {TEMP_DIR}")
            shutil.rmtree(TEMP_DIR)
    
    def clone_repository(self):
        """Clona o repositório"""
        print(f"📥 Clonando repositório {OWNER}/{REPO_NAME}...")
        
        # Remove diretório temporário se existir
        self.cleanup_temp_directory()
        
        # Obtém token para URL de clonagem
        token = self.auth.get_installation_token()
        if not token:
            raise Exception("Não foi possível obter token para clonagem")
        
        # URL com autenticação
        repo_url = f"https://x-access-token:{token}@github.com/{OWNER}/{REPO_NAME}.git"
        
        try:
            repo = Repo.clone_from(repo_url, TEMP_DIR)
            print(f"✅ Repositório clonado em: {TEMP_DIR}")
            return repo
        except Exception as e:
            print(f"❌ Erro ao clonar repositório: {e}")
            return None
    
    def sync_files(self, repo):
        """Sincroniza arquivos da pasta SPR"""
        print(f"🔄 Sincronizando arquivos de {SPR_DIR} para {TEMP_DIR}...")
        
        if not SPR_DIR.exists():
            print(f"❌ Pasta SPR não encontrada: {SPR_DIR}")
            return False
        
        try:
            # Copia arquivos da pasta SPR para o repositório
            for item in SPR_DIR.iterdir():
                if item.is_file():
                    dest_file = TEMP_DIR / item.name
                    shutil.copy2(item, dest_file)
                    print(f"   📄 Copiado: {item.name}")
                elif item.is_dir():
                    dest_dir = TEMP_DIR / item.name
                    if dest_dir.exists():
                        shutil.rmtree(dest_dir)
                    shutil.copytree(item, dest_dir)
                    print(f"   📁 Copiado: {item.name}/")
            
            print("✅ Arquivos sincronizados com sucesso")
            return True
            
        except Exception as e:
            print(f"❌ Erro ao sincronizar arquivos: {e}")
            return False
    
    def commit_and_push(self, repo):
        """Faz commit e push das alterações"""
        print("💾 Fazendo commit e push das alterações...")
        
        try:
            # Adiciona todos os arquivos
            repo.git.add(A=True)
            
            # Verifica se há alterações
            if not repo.index.diff("HEAD"):
                print("ℹ️  Nenhuma alteração detectada")
                return True
            
            # Configura usuário Git
            repo.config_writer().set_value("user", "name", "SPR Sync Script").release()
            repo.config_writer().set_value("user", "email", "spr-sync@royal-agro.com").release()
            
            # Faz commit
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_message = f"SPR Sync - Atualização automática em {timestamp}"
            
            repo.index.commit(commit_message)
            print(f"✅ Commit realizado: {commit_message}")
            
            # Faz push
            origin = repo.remote(name='origin')
            origin.push()
            print("✅ Push realizado com sucesso")
            
            return True
            
        except Exception as e:
            print(f"❌ Erro ao fazer commit/push: {e}")
            return False
    
    def run_sync(self):
        """Executa sincronização completa"""
        print("🚀 Iniciando sincronização SPR...")
        print(f"📍 Diretório de trabalho: {SCRIPT_DIR}")
        print(f"📂 Pasta SPR: {SPR_DIR}")
        print(f"🎯 Repositório: {OWNER}/{REPO_NAME}")
        print("-" * 50)
        
        try:
            # 1. Garante que o repositório existe
            if not self.ensure_repository_exists():
                raise Exception("Falha ao garantir existência do repositório")
            
            # 2. Clona o repositório
            repo = self.clone_repository()
            if not repo:
                raise Exception("Falha ao clonar repositório")
            
            # 3. Sincroniza arquivos
            if not self.sync_files(repo):
                raise Exception("Falha ao sincronizar arquivos")
            
            # 4. Faz commit e push
            if not self.commit_and_push(repo):
                raise Exception("Falha ao fazer commit/push")
            
            # 5. Limpeza
            self.cleanup_temp_directory()
            
            print("-" * 50)
            print("🎉 Sincronização concluída com sucesso!")
            print(f"📍 Repositório: https://github.com/{OWNER}/{REPO_NAME}")
            
            return True
            
        except Exception as e:
            print(f"❌ Erro na sincronização: {e}")
            self.cleanup_temp_directory()
            return False

def main():
    """Função principal"""
    print("=" * 60)
    print("📦 SPR 1.1 - Script de Sincronização com GitHub")
    print("=" * 60)
    
    # Verifica se os arquivos necessários existem
    if not CONFIG_FILE.exists():
        print(f"❌ Arquivo de configuração não encontrado: {CONFIG_FILE}")
        sys.exit(1)
    
    if not PEM_FILE.exists():
        print(f"❌ Arquivo de chave privada não encontrado: {PEM_FILE}")
        sys.exit(1)
    
    # Executa sincronização
    sync_manager = SPRSyncManager()
    success = sync_manager.run_sync()
    
    if success:
        print("\n✅ Script executado com sucesso!")
        sys.exit(0)
    else:
        print("\n❌ Script falhou!")
        sys.exit(1)

if __name__ == "__main__":
    main()
