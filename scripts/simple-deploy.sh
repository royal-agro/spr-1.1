#\!/bin/bash
# SPR Deploy Automation - Simple version
PROJECT_ROOT="/home/cadu/projeto_SPR"
cd "$PROJECT_ROOT"

echo "[$(date)] Iniciando deploy automático..."

# Backup automatico antes do deploy
mkdir -p backups/daily
tar -czf "backups/daily/backup-$(date +%Y%m%d_%H%M).tar.gz" frontend/src app backend_server_fixed.js whatsapp_server_real.js --exclude="*node_modules*" 2>/dev/null

# Verificar se frontend está funcionando
if curl -s http://localhost:3000 > /dev/null; then
  echo "[$(date)] ✅ Frontend funcionando"
else  
  echo "[$(date)] ⚠️ Frontend offline"
fi

# Commit automatico se houver mudanças
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "chore: automated deployment $(date)"
  git push origin master
  echo "[$(date)] ✅ Deploy enviado para GitHub"
else
  echo "[$(date)] ✅ Nenhuma mudança para commit"
fi

echo "[$(date)] Deploy automático concluído"

