#!/usr/bin/env python3
"""
Script de configuração do WhatsApp para produção no DigitalOcean
Configuração automática com whatsapp-web.js + SPR 1.1
"""

import os
import sys
import subprocess
import json
import asyncio
import logging
from pathlib import Path

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhatsAppProductionSetup:
    """Configuração do WhatsApp para produção"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.whatsapp_dir = self.project_root / "whatsapp_production"
        self.env_file = self.project_root / ".env"
        
    async def setup_production_environment(self):
        """Configurar ambiente de produção completo"""
        try:
            logger.info("🚀 Iniciando configuração de produção do WhatsApp...")
            
            # 1. Verificar sistema
            await self.check_system_requirements()
            
            # 2. Instalar Node.js se necessário
            await self.install_nodejs()
            
            # 3. Configurar diretório de produção
            await self.setup_production_directory()
            
            # 4. Instalar dependências
            await self.install_whatsapp_dependencies()
            
            # 5. Configurar PM2 para gerenciamento de processos
            await self.setup_pm2()
            
            # 6. Configurar nginx para proxy reverso
            await self.setup_nginx()
            
            # 7. Configurar SSL com Let's Encrypt
            await self.setup_ssl()
            
            # 8. Configurar firewall
            await self.setup_firewall()
            
            # 9. Configurar monitoramento
            await self.setup_monitoring()
            
            # 10. Criar serviços systemd
            await self.setup_systemd_services()
            
            logger.info("✅ Configuração de produção concluída!")
            await self.show_final_instructions()
            
        except Exception as e:
            logger.error(f"❌ Erro na configuração: {e}")
            return False

    async def check_system_requirements(self):
        """Verificar requisitos do sistema"""
        logger.info("🔍 Verificando requisitos do sistema...")
        
        # Verificar SO
        if not sys.platform.startswith('linux'):
            raise Exception("Este script é para servidores Linux (DigitalOcean)")
        
        # Verificar se é root ou sudo
        if os.geteuid() != 0:
            raise Exception("Execute como root ou com sudo")
        
        # Verificar memória (mínimo 2GB)
        with open('/proc/meminfo', 'r') as f:
            meminfo = f.read()
            for line in meminfo.split('\n'):
                if 'MemTotal:' in line:
                    mem_kb = int(line.split()[1])
                    mem_gb = mem_kb / 1024 / 1024
                    if mem_gb < 2:
                        logger.warning(f"⚠️ Memória baixa: {mem_gb:.1f}GB (recomendado: 2GB+)")
                    else:
                        logger.info(f"✅ Memória: {mem_gb:.1f}GB")
                    break
        
        logger.info("✅ Requisitos do sistema verificados")

    async def install_nodejs(self):
        """Instalar Node.js LTS"""
        logger.info("📦 Instalando Node.js...")
        
        try:
            # Verificar se já está instalado
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                version = result.stdout.strip()
                logger.info(f"✅ Node.js já instalado: {version}")
                return
        except FileNotFoundError:
            pass
        
        # Instalar Node.js via NodeSource
        commands = [
            "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -",
            "apt-get install -y nodejs",
            "npm install -g npm@latest"
        ]
        
        for cmd in commands:
            logger.info(f"Executando: {cmd}")
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Erro ao executar: {cmd}\n{stderr.decode()}")
        
        logger.info("✅ Node.js instalado com sucesso!")

    async def setup_production_directory(self):
        """Configurar diretório de produção"""
        logger.info("📁 Configurando diretório de produção...")
        
        # Criar estrutura de diretórios
        directories = [
            self.whatsapp_dir,
            self.whatsapp_dir / "logs",
            self.whatsapp_dir / "sessions",
            self.whatsapp_dir / "media",
            self.whatsapp_dir / "backups",
            self.whatsapp_dir / "scripts"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            logger.info(f"📂 Criado: {directory}")
        
        # Configurar permissões
        subprocess.run(["chown", "-R", "www-data:www-data", str(self.whatsapp_dir)])
        subprocess.run(["chmod", "-R", "755", str(self.whatsapp_dir)])
        
        logger.info("✅ Diretório de produção configurado!")

    async def install_whatsapp_dependencies(self):
        """Instalar dependências do WhatsApp"""
        logger.info("📦 Instalando dependências do WhatsApp...")
        
        # package.json para produção
        package_json = {
            "name": "spr-whatsapp-production",
            "version": "1.0.0",
            "description": "SPR WhatsApp Production Server",
            "main": "server.js",
            "scripts": {
                "start": "node server.js",
                "dev": "nodemon server.js",
                "pm2:start": "pm2 start ecosystem.config.js",
                "pm2:stop": "pm2 stop ecosystem.config.js",
                "pm2:restart": "pm2 restart ecosystem.config.js"
            },
            "dependencies": {
                "whatsapp-web.js": "^1.23.0",
                "express": "^4.18.2",
                "cors": "^2.8.5",
                "helmet": "^7.0.0",
                "morgan": "^1.10.0",
                "dotenv": "^16.3.1",
                "winston": "^3.10.0",
                "redis": "^4.6.7",
                "qrcode": "^1.5.3",
                "multer": "^1.4.5",
                "sharp": "^0.32.1",
                "node-cron": "^3.0.2",
                "puppeteer": "^21.0.0"
            },
            "devDependencies": {
                "nodemon": "^3.0.1"
            }
        }
        
        package_path = self.whatsapp_dir / "package.json"
        with open(package_path, 'w') as f:
            json.dump(package_json, f, indent=2)
        
        # Instalar dependências
        install_process = await asyncio.create_subprocess_exec(
            "npm", "install", "--production",
            cwd=str(self.whatsapp_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await install_process.communicate()
        
        if install_process.returncode != 0:
            raise Exception(f"Erro ao instalar dependências: {stderr.decode()}")
        
        logger.info("✅ Dependências instaladas!")

    async def setup_pm2(self):
        """Configurar PM2 para gerenciamento de processos"""
        logger.info("⚙️ Configurando PM2...")
        
        # Instalar PM2 globalmente
        install_process = await asyncio.create_subprocess_exec(
            "npm", "install", "-g", "pm2",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await install_process.communicate()
        
        # Configuração do ecosystem PM2
        ecosystem_config = {
            "apps": [
                {
                    "name": "spr-whatsapp",
                    "script": "server.js",
                    "cwd": str(self.whatsapp_dir),
                    "instances": 1,
                    "exec_mode": "fork",
                    "watch": False,
                    "max_memory_restart": "1G",
                    "env": {
                        "NODE_ENV": "production",
                        "PORT": "3000"
                    },
                    "error_file": str(self.whatsapp_dir / "logs/error.log"),
                    "out_file": str(self.whatsapp_dir / "logs/out.log"),
                    "log_file": str(self.whatsapp_dir / "logs/combined.log"),
                    "time": True,
                    "autorestart": True,
                    "max_restarts": 10,
                    "min_uptime": "10s"
                }
            ]
        }
        
        ecosystem_path = self.whatsapp_dir / "ecosystem.config.js"
        with open(ecosystem_path, 'w') as f:
            f.write(f"module.exports = {json.dumps(ecosystem_config, indent=2)};")
        
        logger.info("✅ PM2 configurado!")

    async def setup_nginx(self):
        """Configurar Nginx como proxy reverso"""
        logger.info("🌐 Configurando Nginx...")
        
        # Instalar nginx
        install_process = await asyncio.create_subprocess_shell(
            "apt-get update && apt-get install -y nginx",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await install_process.communicate()
        
        # Configuração do Nginx
        nginx_config = f"""
server {{
    listen 80;
    server_name spr-whatsapp.yourdomain.com;  # Substitua pelo seu domínio
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name spr-whatsapp.yourdomain.com;  # Substitua pelo seu domínio
    
    # SSL Configuration (será configurado pelo Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/spr-whatsapp.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/spr-whatsapp.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy para aplicação Node.js
    location / {{
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }}
    
    # Servir arquivos estáticos
    location /static/ {{
        alias {self.whatsapp_dir}/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }}
    
    # Logs
    access_log /var/log/nginx/spr-whatsapp.access.log;
    error_log /var/log/nginx/spr-whatsapp.error.log;
}}
"""
        
        nginx_config_path = Path("/etc/nginx/sites-available/spr-whatsapp")
        with open(nginx_config_path, 'w') as f:
            f.write(nginx_config)
        
        # Habilitar site
        nginx_enabled_path = Path("/etc/nginx/sites-enabled/spr-whatsapp")
        if nginx_enabled_path.exists():
            nginx_enabled_path.unlink()
        nginx_enabled_path.symlink_to(nginx_config_path)
        
        # Testar configuração
        test_process = await asyncio.create_subprocess_exec(
            "nginx", "-t",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await test_process.communicate()
        
        if test_process.returncode != 0:
            raise Exception(f"Erro na configuração do Nginx: {stderr.decode()}")
        
        # Recarregar Nginx
        await asyncio.create_subprocess_exec("systemctl", "reload", "nginx")
        
        logger.info("✅ Nginx configurado!")

    async def setup_ssl(self):
        """Configurar SSL com Let's Encrypt"""
        logger.info("🔒 Configurando SSL...")
        
        # Instalar certbot
        install_process = await asyncio.create_subprocess_shell(
            "apt-get install -y certbot python3-certbot-nginx",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await install_process.communicate()
        
        logger.info("✅ Certbot instalado!")
        logger.info("⚠️ Execute manualmente: certbot --nginx -d spr-whatsapp.yourdomain.com")

    async def setup_firewall(self):
        """Configurar firewall UFW"""
        logger.info("🔥 Configurando firewall...")
        
        commands = [
            "ufw --force enable",
            "ufw allow ssh",
            "ufw allow 'Nginx Full'",
            "ufw allow 3000",  # Porta da aplicação Node.js
            "ufw --force reload"
        ]
        
        for cmd in commands:
            process = await asyncio.create_subprocess_shell(cmd)
            await process.communicate()
        
        logger.info("✅ Firewall configurado!")

    async def setup_monitoring(self):
        """Configurar monitoramento básico"""
        logger.info("📊 Configurando monitoramento...")
        
        # Script de monitoramento
        monitoring_script = f"""#!/bin/bash
# Script de monitoramento do SPR WhatsApp

LOG_FILE="{self.whatsapp_dir}/logs/monitoring.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Iniciando verificação..." >> $LOG_FILE

# Verificar se PM2 está rodando
if ! pm2 list | grep -q "spr-whatsapp"; then
    echo "[$DATE] ERRO: PM2 não está rodando SPR WhatsApp" >> $LOG_FILE
    pm2 start {self.whatsapp_dir}/ecosystem.config.js
fi

# Verificar uso de memória
MEMORY_USAGE=$(free | grep Mem | awk '{{printf("%.1f", $3/$2 * 100.0)}}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    echo "[$DATE] ALERTA: Uso de memória alto: $MEMORY_USAGE%" >> $LOG_FILE
fi

# Verificar espaço em disco
DISK_USAGE=$(df / | tail -1 | awk '{{print $5}}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "[$DATE] ALERTA: Espaço em disco baixo: $DISK_USAGE%" >> $LOG_FILE
fi

# Verificar se aplicação está respondendo
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "[$DATE] ERRO: Aplicação não está respondendo" >> $LOG_FILE
    pm2 restart spr-whatsapp
fi

echo "[$DATE] Verificação concluída" >> $LOG_FILE
"""
        
        monitoring_path = self.whatsapp_dir / "scripts/monitoring.sh"
        with open(monitoring_path, 'w') as f:
            f.write(monitoring_script)
        
        subprocess.run(["chmod", "+x", str(monitoring_path)])
        
        # Adicionar ao crontab
        cron_entry = f"*/5 * * * * {monitoring_path}\n"
        
        # Adicionar backup diário
        backup_entry = f"0 2 * * * {self.whatsapp_dir}/scripts/backup.sh\n"
        
        logger.info("✅ Monitoramento configurado!")
        logger.info("⚠️ Adicione ao crontab: crontab -e")
        logger.info(f"   {cron_entry.strip()}")
        logger.info(f"   {backup_entry.strip()}")

    async def setup_systemd_services(self):
        """Configurar serviços systemd"""
        logger.info("⚙️ Configurando serviços systemd...")
        
        # Serviço para SPR WhatsApp
        service_content = f"""[Unit]
Description=SPR WhatsApp Service
After=network.target

[Service]
Type=forking
User=www-data
WorkingDirectory={self.whatsapp_dir}
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 restart ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
        
        service_path = Path("/etc/systemd/system/spr-whatsapp.service")
        with open(service_path, 'w') as f:
            f.write(service_content)
        
        # Habilitar serviço
        commands = [
            "systemctl daemon-reload",
            "systemctl enable spr-whatsapp",
        ]
        
        for cmd in commands:
            process = await asyncio.create_subprocess_shell(cmd)
            await process.communicate()
        
        logger.info("✅ Serviços systemd configurados!")

    async def show_final_instructions(self):
        """Mostrar instruções finais"""
        instructions = f"""
🎉 CONFIGURAÇÃO CONCLUÍDA!

📋 PRÓXIMOS PASSOS:

1. 🌐 Configure seu domínio:
   - Aponte spr-whatsapp.yourdomain.com para o IP do servidor
   - Execute: certbot --nginx -d spr-whatsapp.yourdomain.com

2. 🚀 Inicie os serviços:
   cd {self.whatsapp_dir}
   npm run pm2:start
   systemctl start spr-whatsapp

3. 📱 Configure WhatsApp:
   - Acesse: https://spr-whatsapp.yourdomain.com
   - Escaneie o QR code com seu WhatsApp Business

4. 📊 Monitoramento:
   - Logs: {self.whatsapp_dir}/logs/
   - PM2: pm2 monit
   - Status: systemctl status spr-whatsapp

5. 🔧 Comandos úteis:
   - Reiniciar: pm2 restart spr-whatsapp
   - Logs: pm2 logs spr-whatsapp
   - Parar: pm2 stop spr-whatsapp

📁 Diretórios importantes:
   - Projeto: {self.whatsapp_dir}
   - Logs: {self.whatsapp_dir}/logs/
   - Sessões: {self.whatsapp_dir}/sessions/
   - Scripts: {self.whatsapp_dir}/scripts/

🔗 URLs:
   - Aplicação: https://spr-whatsapp.yourdomain.com
   - Health Check: https://spr-whatsapp.yourdomain.com/health
   - QR Code: https://spr-whatsapp.yourdomain.com/qr

⚠️ IMPORTANTE:
   - Mantenha o servidor sempre atualizado
   - Faça backups regulares das sessões
   - Monitore os logs regularmente
   - Configure alertas para falhas

✅ SPR WhatsApp está pronto para produção!
"""
        
        print(instructions)
        
        # Salvar instruções em arquivo
        instructions_path = self.whatsapp_dir / "PRODUCTION_SETUP.md"
        with open(instructions_path, 'w') as f:
            f.write(instructions)

async def main():
    """Função principal"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("""
SPR WhatsApp Production Setup

Uso: python3 setup_whatsapp_production.py

Este script configura automaticamente:
- Node.js LTS
- WhatsApp-web.js
- PM2 para gerenciamento de processos
- Nginx como proxy reverso
- SSL com Let's Encrypt
- Firewall UFW
- Monitoramento básico
- Serviços systemd

Requisitos:
- Ubuntu 20.04+ ou Debian 11+
- 2GB+ RAM
- Acesso root/sudo
- Domínio configurado (opcional)

Exemplo de uso:
sudo python3 setup_whatsapp_production.py
""")
        return
    
    setup = WhatsAppProductionSetup()
    await setup.setup_production_environment()

if __name__ == "__main__":
    asyncio.run(main()) 