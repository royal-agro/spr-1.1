import os
import shutil
from PIL import Image
import imghdr

# Caminhos
origem = r"C:\Users\carlo\SPR\Imagens Royal"
destino = r"C:\Users\carlo\SPR 1.1\spr-main\assets\imagens_royal"

# Cria pasta destino se não existir
os.makedirs(destino, exist_ok=True)

# Palavras-chave para renomeação
keywords = {
    "logo": ["logo", "marca", "logotipo"],
    "ndvi": ["ndvi", "vegetação"],
    "clima": ["clima", "weather", "nuvem"],
    "soja": ["soja", "soy"],
    "milho": ["milho", "corn"],
    "trigo": ["trigo", "wheat"],
    "fundo": ["background", "fundo", "login"],
    "grafico": ["chart", "grafico"],
}

def detectar_tipo(nome):
    nome_lower = nome.lower()
    for key, words in keywords.items():
        if any(w in nome_lower for w in words):
            return key
    return "imagem"

# Renomeia e move
contador = {}
for arquivo in os.listdir(origem):
    caminho_arquivo = os.path.join(origem, arquivo)
    if not os.path.isfile(caminho_arquivo):
        continue
    if not imghdr.what(caminho_arquivo):
        continue

    tipo = detectar_tipo(arquivo)
    contador[tipo] = contador.get(tipo, 1)
    ext = os.path.splitext(arquivo)[1].lower()
    novo_nome = f"{tipo}-{contador[tipo]}{ext}"
    destino_final = os.path.join(destino, novo_nome)
    shutil.copy2(caminho_arquivo, destino_final)
    print(f"✔️ {arquivo} → {novo_nome}")

print("\n✅ Imagens renomeadas e copiadas com sucesso!")
