# 📦 SPR 1.1 - Dockerfile WhatsApp Server
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl

# Configurar Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S whatsapp -u 1001

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p sessions logs media qrcodes && \
    chown -R whatsapp:nodejs /app

# Mudar para usuário não-root
USER whatsapp

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicialização
CMD ["node", "server.js"] 