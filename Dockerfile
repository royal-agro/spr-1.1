# Dockerfile SPR 1.1

FROM python:3.10-slim

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos do projeto
COPY . .

# Instalar dependências
RUN pip install --no-cache-dir -r requirements.txt

# Carregar variáveis do .env (em produção via docker-compose ou systemd)
ENV SPR_ENV=production

# Comando de entrada
CMD ["python", "main.py"]
