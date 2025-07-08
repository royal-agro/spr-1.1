import shutil, os
from pathlib import Path
from datetime import datetime

nova_pasta = Path(r"C:\Users\carlo\SPR 1.1")
pasta_antiga = Path(r"C:\Users\carlo\spr-1.1")
log_path = nova_pasta / "logs" / "migracao_spr.log"
log_path.parent.mkdir(parents=True, exist_ok=True)

itens_para_mover = ["main.py", "Precificacao", "Suporte_Tecnico", "Analise"]
log = [f"📦 MIGRAÇÃO SPR — {datetime.now().isoformat()}"]

for nome in itens_para_mover:
    origem = pasta_antiga / nome
    destino = nova_pasta / nome
    if origem.exists():
        if origem.is_file():
            shutil.copy2(origem, destino)
            log.append(f"✔ Arquivo copiado: {nome}")
        elif origem.is_dir():
            if destino.exists():
                shutil.rmtree(destino)
                log.append(f"⚠ Pasta já existia e foi sobrescrita: {nome}")
            shutil.copytree(origem, destino)
            log.append(f"✔ Pasta copiada: {nome}")
    else:
        log.append(f"⛔ Não encontrado em spr-1.1: {nome}")

# Remove pasta antiga
if pasta_antiga.exists():
    shutil.rmtree(pasta_antiga)
    log.append("🧹 Pasta antiga 'spr-1.1' removida com sucesso.")

# Salva log
with open(log_path, "a", encoding="utf-8") as f:
    f.write("\n".join(log) + "\n\n")

print("✅ Migração concluída. Verifique o log em:", log_path)
