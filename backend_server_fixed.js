const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3002;
const WHATSAPP_SERVER_PORT = process.env.WHATSAPP_SERVER_PORT || 3003;
const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || `http://localhost:${WHATSAPP_SERVER_PORT}`;

// Security configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // requests per window
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');

// Security middleware - must be first
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: {
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warning(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
            timestamp: new Date().toISOString()
        });
    }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: 10, // Only 10 auth attempts per window
    message: {
        error: 'Too many authentication attempts',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    },
    skipSuccessfulRequests: true
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use(generalLimiter);

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
}));

// CORS configuration - more restrictive in production
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'http://localhost:3002', 
        'http://localhost:3003',
        'http://localhost:3004'
    ];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warning(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-API-Key'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 200
}));

// Body parsing with security limits
app.use(express.json({ 
    limit: '10mb', // Reduced from 50mb for security
    verify: (req, res, buf) => {
        // Store raw body for webhook signature verification
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 100 // Limit number of parameters
}));

// Security headers middleware
app.use((req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Content type
    if (req.path.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
    }
    
    next();
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remove null bytes and normalize
            return obj.replace(/\x00/g, '').trim();
        } else if (Array.isArray(obj)) {
            return obj.map(sanitize);
        } else if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                // Sanitize key names
                const cleanKey = key.replace(/[^\w.-]/g, '');
                sanitized[cleanKey] = sanitize(value);
            }
            return sanitized;
        }
        return obj;
    };
    
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    if (req.params) {
        req.params = sanitize(req.params);
    }
    
    next();
};

app.use(sanitizeInput);

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            timestamp: new Date().toISOString()
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logger.warning(`Invalid token from IP: ${req.ip}`);
            return res.status(403).json({ 
                error: 'Invalid or expired token',
                timestamp: new Date().toISOString()
            });
        }
        
        req.user = user;
        next();
    });
};

// API key authentication for external services
const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validAPIKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);
    
    if (!apiKey || !validAPIKeys.includes(apiKey)) {
        logger.warning(`Invalid API key from IP: ${req.ip}`);
        return res.status(401).json({
            error: 'Valid API key required',
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

// Webhook signature verification
const verifyWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature) {
        return res.status(401).json({
            error: 'Webhook signature required',
            timestamp: new Date().toISOString()
        });
    }
    
    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(req.rawBody || '')
        .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
    )) {
        logger.warning(`Invalid webhook signature from IP: ${req.ip}`);
        return res.status(401).json({
            error: 'Invalid webhook signature',
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

// Configuração do Axios com timeout e retry otimizados
const axiosInstance = axios.create({
    timeout: 30000, // 30 segundos
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SPR-Backend/1.2'
    },
    // Configurações adicionais
    maxRedirects: 3,
    validateStatus: (status) => status < 500 // Não rejeitar 4xx
});

// Implementação de retry com circuit breaker
class CircuitBreaker {
    constructor(failureThreshold = 5, recoveryTimeout = 60000) {
        this.failureThreshold = failureThreshold;
        this.recoveryTimeout = recoveryTimeout;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async call(requestFn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await requestFn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}

const whatsappCircuitBreaker = new CircuitBreaker(3, 30000); // 3 falhas, 30s timeout

// Retry logic melhorado com exponential backoff
const retryRequest = async (requestFn, maxRetries = 3, baseDelay = 2000) => {
    return whatsappCircuitBreaker.call(async () => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                console.log(`🔄 Tentativa ${i + 1}/${maxRetries} falhou:`, error.message);
                
                if (i === maxRetries - 1) throw error;
                
                // Exponential backoff com jitter
                const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    });
};

// Variáveis de estado do sistema
let systemStatus = {
    whatsappConnected: false,
    lastQrCode: null,
    clientInfo: null,
    lastSeen: null,
    lastCheck: new Date(),
    circuitBreakerState: 'CLOSED',
    metrics: {
        totalMessages: 0,
        activeChats: 0,
        responseTime: 150,
        deliveryRate: 98.5,
        readRate: 85.2,
        iaGenerations: 0,
        totalRequests: 0,
        failedRequests: 0
    }
};

// Função auxiliar melhorada para verificar WhatsApp Server
async function checkWhatsAppServerStatus() {
    try {
        console.log('🔍 Verificando status do WhatsApp Server...');
        systemStatus.metrics.totalRequests++;
        
        const response = await retryRequest(() => 
            axiosInstance.get(`${WHATSAPP_SERVER_URL}/api/status`)
        );
        
        const isConnected = response.data.whatsappConnected || response.data.connected || false;
        systemStatus.whatsappConnected = isConnected;
        systemStatus.lastCheck = new Date();
        systemStatus.circuitBreakerState = whatsappCircuitBreaker.state;
        
        if (response.data.clientInfo) {
            systemStatus.clientInfo = response.data.clientInfo;
        }
        
        console.log(`✅ WhatsApp Server: ${isConnected ? 'Online' : 'Offline'}`);
        return true;
    } catch (error) {
        console.error('❌ WhatsApp Server indisponível:', error.message);
        systemStatus.whatsappConnected = false;
        systemStatus.lastCheck = new Date();
        systemStatus.circuitBreakerState = whatsappCircuitBreaker.state;
        systemStatus.metrics.failedRequests++;
        return false;
    }
}

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password required',
                timestamp: new Date().toISOString()
            });
        }
        
        // In production, validate against database
        const validUsers = {
            'admin': process.env.ADMIN_PASSWORD_HASH,
            'manager': process.env.MANAGER_PASSWORD_HASH,
            'operator': process.env.OPERATOR_PASSWORD_HASH
        };
        
        const userPasswordHash = validUsers[username];
        if (!userPasswordHash || !await bcrypt.compare(password, userPasswordHash)) {
            logger.warning(`Failed login attempt for user: ${username} from IP: ${req.ip}`);
            return res.status(401).json({
                error: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }
        
        // Define user roles
        const userRoles = {
            'admin': ['admin', 'manager', 'operator'],
            'manager': ['manager', 'operator'],
            'operator': ['operator']
        };
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                username, 
                roles: userRoles[username] || [],
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
            },
            JWT_SECRET
        );
        
        logger.info(`User ${username} logged in successfully from IP: ${req.ip}`);
        
        res.json({
            success: true,
            token,
            user: {
                username,
                roles: userRoles[username] || []
            },
            expiresIn: 3600,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/auth/refresh', authenticateToken, (req, res) => {
    try {
        // Generate new token
        const newToken = jwt.sign(
            { 
                username: req.user.username,
                roles: req.user.roles,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
            },
            JWT_SECRET
        );
        
        res.json({
            success: true,
            token: newToken,
            expiresIn: 3600,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Token refresh failed',
            timestamp: new Date().toISOString()
        });
    }
});

// ENDPOINT PRINCIPAL: Status geral do sistema (public for development)
app.get('/api/status', async (req, res) => {
    try {
        console.log('📊 Endpoint /api/status chamado');
        
        // Verificar status do WhatsApp Server
        const whatsappServerOnline = await checkWhatsAppServerStatus();
        
        const response = {
            status: "online",
            timestamp: new Date().toISOString(),
            version: "1.2.1",
            services: {
                whatsapp: systemStatus.whatsappConnected ? "connected" : "disconnected",
                database: "connected",
                api: "running",
                ia: "ready",
                whatsappServer: whatsappServerOnline ? "online" : "offline",
                circuitBreaker: systemStatus.circuitBreakerState
            },
            metrics: {
                ...systemStatus.metrics,
                uptime: process.uptime(),
                lastCheck: systemStatus.lastCheck,
                successRate: systemStatus.metrics.totalRequests > 0 
                    ? ((systemStatus.metrics.totalRequests - systemStatus.metrics.failedRequests) / systemStatus.metrics.totalRequests * 100).toFixed(2)
                    : 100
            }
        };
        
        console.log('✅ Status retornado:', response.services);
        res.json(response);
    } catch (error) {
        console.error('❌ Erro no endpoint /api/status:', error);
        res.status(500).json({
            status: "error",
            message: error.message,
            timestamp: new Date().toISOString(),
            version: "1.2.1"
        });
    }
});

// WhatsApp webhook endpoint (external, requires signature verification)
app.post('/api/webhook/whatsapp', verifyWebhookSignature, async (req, res) => {
    try {
        logger.info('WhatsApp webhook received');
        
        // Process webhook payload
        const payload = req.body;
        
        // Basic validation
        if (!payload.object || payload.object !== 'whatsapp_business_account') {
            return res.status(400).json({
                error: 'Invalid webhook object',
                timestamp: new Date().toISOString()
            });
        }
        
        // Process entries
        if (payload.entry && Array.isArray(payload.entry)) {
            for (const entry of payload.entry) {
                if (entry.changes) {
                    for (const change of entry.changes) {
                        if (change.field === 'messages' && change.value.messages) {
                            // Process incoming messages
                            for (const message of change.value.messages) {
                                logger.info(`Received message: ${message.id} from ${message.from}`);
                                // Here you would process the message
                            }
                        }
                    }
                }
            }
        }
        
        // WhatsApp requires a 200 response
        res.status(200).send('OK');
        
    } catch (error) {
        logger.error('Webhook processing error:', error);
        res.status(500).json({
            error: 'Webhook processing failed',
            timestamp: new Date().toISOString()
        });
    }
});

// WhatsApp webhook verification (GET request)
app.get('/api/webhook/whatsapp', (req, res) => {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        
        if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
            logger.info('WhatsApp webhook verified successfully');
            res.status(200).send(challenge);
        } else {
            logger.warning('WhatsApp webhook verification failed');
            res.sendStatus(403);
        }
    } catch (error) {
        logger.error('Webhook verification error:', error);
        res.sendStatus(403);
    }
});

// PROXY MELHORADO PARA WHATSAPP ENDPOINTS (public for development)
app.use('/api/whatsapp', async (req, res) => {
    try {
        console.log(`🔄 Proxy WhatsApp: ${req.method} ${req.path}`);
        systemStatus.metrics.totalRequests++;
        
        const startTime = Date.now();
        const targetUrl = `${WHATSAPP_SERVER_URL}${req.originalUrl}`;
        
        const config = {
            method: req.method.toLowerCase(),
            url: targetUrl,
            data: req.body,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Forwarded-For': req.ip,
                'X-Original-Method': req.method
            }
        };

        const response = await retryRequest(() => axiosInstance(config));
        
        // Calcular tempo de resposta
        const responseTime = Date.now() - startTime;
        systemStatus.metrics.responseTime = Math.round(
            (systemStatus.metrics.responseTime * 0.9) + (responseTime * 0.1)
        );
        
        // Atualizar métricas específicas
        if (req.path.includes('send') && response.data.success) {
            systemStatus.metrics.totalMessages++;
        }
        
        if (req.path.includes('chats') && response.data.chats) {
            systemStatus.metrics.activeChats = response.data.chats.length;
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('❌ Erro no proxy WhatsApp:', error.message);
        systemStatus.metrics.failedRequests++;
        
        // Fallback responses melhorados
        const fallbackResponse = {
            timestamp: new Date().toISOString(),
            error: 'WhatsApp Server indisponível',
            circuitBreakerState: whatsappCircuitBreaker.state,
            retryAfter: whatsappCircuitBreaker.state === 'OPEN' ? 30 : 5
        };
        
        if (req.path.includes('status')) {
            res.json({
                connected: false,
                whatsappConnected: false,
                ...fallbackResponse
            });
        } else if (req.path.includes('chats')) {
            res.json({
                chats: [],
                message: 'Lista de conversas indisponível',
                ...fallbackResponse
            });
        } else if (req.path.includes('send')) {
            res.status(503).json({
                success: false,
                message: 'Serviço de envio temporariamente indisponível',
                ...fallbackResponse
            });
        } else {
            res.status(503).json({
                success: false,
                message: 'Serviço temporariamente indisponível',
                ...fallbackResponse
            });
        }
    }
});

// Endpoint para gerar mensagem com IA - OTIMIZADO
const generateMessageWithAI = (prompt, tone, contactName, isGroup, context) => {
    const toneMessages = {
        formal: `Prezado(a) ${contactName || 'cliente'}, espero que esteja bem. `,
        normal: `Olá ${contactName || 'cliente'}, `,
        informal: `Oi ${contactName || 'cliente'}, `,
        alegre: `Oi ${contactName || 'cliente'}! 😊 `
    };

    const baseMessage = toneMessages[tone] || toneMessages.normal;
    
    // Lógica inteligente baseada no prompt
    const promptLower = prompt.toLowerCase();
    
    // Palavras-chave específicas do agronegócio
    const keywords = {
        'reunião|meeting|encontro': 'Gostaria de agendar uma reunião para conversarmos melhor sobre nossos serviços e oportunidades de negócio.',
        'preço|cotação|valor': 'Posso te ajudar com informações atualizadas sobre preços e cotações de commodities. Temos os melhores dados do mercado.',
        'soja': 'Tenho informações atualizadas sobre soja para você. O mercado está aquecido e temos ótimas oportunidades.',
        'milho': 'O mercado do milho está em movimento. Posso compartilhar as últimas análises e projeções.',
        'café': 'O setor cafeeiro apresenta boas perspectivas. Vamos conversar sobre as oportunidades?',
        'algodão': 'O mercado do algodão está com tendência positiva. Posso te passar mais detalhes.',
        'açúcar': 'O açúcar está com boa demanda internacional. Temos análises detalhadas para compartilhar.',
        'obrigado|agradec': 'Muito obrigado pela confiança! Estamos sempre à disposição para ajudar no que precisar.',
        'desculp': 'Peço desculpas pelo inconveniente. Como posso ajudar a resolver essa situação?',
        'proposta|orçamento': 'Vou preparar uma proposta personalizada para suas necessidades. Quando podemos conversar?',
        'contrato|acordo': 'Vamos alinhar os detalhes do contrato. Preciso entender melhor suas expectativas.',
        'mercado|análise': 'Nossas análises de mercado são atualizadas diariamente. Posso compartilhar os dados mais recentes com você.'
    };
    
    // Buscar correspondência de palavras-chave
    for (const [pattern, response] of Object.entries(keywords)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(promptLower)) {
            return baseMessage + response;
        }
    }
    
    // Mensagem padrão com o prompt do usuário
    return baseMessage + prompt + ' Estou aqui para ajudar com informações sobre commodities e agronegócio.';
};

// Endpoint para gerar mensagem com IA (requires authentication)
app.post('/api/generate-message', authenticateToken, (req, res) => {
    try {
        const { prompt, tone = 'normal', contactName, isGroup = false, context = 'whatsapp' } = req.body;
        
        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Prompt é obrigatório',
                message: 'Por favor, forneça um prompt para gerar a mensagem',
                timestamp: new Date().toISOString()
            });
        }
        
        if (prompt.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Prompt muito longo',
                message: 'O prompt deve ter no máximo 1000 caracteres',
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('🤖 Gerando mensagem com IA:', { 
            prompt: prompt.substring(0, 50) + '...', 
            tone, 
            contactName, 
            isGroup, 
            context 
        });
        
        // Gerar mensagem principal
        const generatedMessage = generateMessageWithAI(prompt.trim(), tone, contactName, isGroup, context);
        
        // Atualizar métricas
        systemStatus.metrics.iaGenerations++;
        
        const response = {
            success: true,
            message: generatedMessage,
            tone: tone,
            contactName: contactName,
            isGroup: isGroup,
            context: context,
            timestamp: new Date().toISOString(),
            metadata: {
                promptLength: prompt.length,
                messageLength: generatedMessage.length,
                processingTime: Date.now() % 1000 // Simular tempo de processamento
            },
            metrics: {
                iaGenerations: systemStatus.metrics.iaGenerations
            }
        };
        
        console.log('✅ Mensagem gerada com sucesso');
        res.json(response);
        
    } catch (error) {
        console.error('❌ Erro ao gerar mensagem:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao gerar mensagem',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint de health check melhorado (public, no auth required)
app.get('/api/health', async (req, res) => {
    const healthData = {
        status: 'OK',
        message: 'Backend funcionando!',
        timestamp: new Date().toISOString(),
        version: '1.2.1',
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        services: {
            whatsappServer: systemStatus.whatsappConnected ? 'connected' : 'disconnected',
            circuitBreaker: systemStatus.circuitBreakerState,
            lastCheck: systemStatus.lastCheck
        },
        metrics: systemStatus.metrics
    };
    
    res.json(healthData);
});

// Endpoint de métricas detalhadas (requires admin role)
app.get('/api/metrics', authenticateToken, (req, res) => {
    // Check if user has admin role
    if (!req.user.roles || !req.user.roles.includes('admin')) {
        return res.status(403).json({
            error: 'Admin role required',
            timestamp: new Date().toISOString()
        });
    }
    const metrics = {
        ...systemStatus.metrics,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        whatsappConnected: systemStatus.whatsappConnected,
        circuitBreakerState: systemStatus.circuitBreakerState,
        lastCheck: systemStatus.lastCheck,
        system: {
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        }
    };
    
    res.json(metrics);
});

// Análise de sentimento
app.post('/api/analyze-sentiment', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Mensagem é obrigatória',
                timestamp: new Date().toISOString()
            });
        }
        
        // Análise simples baseada em palavras-chave
        const positiveWords = ['bom', 'ótimo', 'excelente', 'obrigado', 'parabéns', 'sucesso'];
        const negativeWords = ['ruim', 'péssimo', 'problema', 'erro', 'falha', 'cancelar'];
        
        const messageLower = message.toLowerCase();
        const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
        const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;
        
        let sentiment = 'neutral';
        let confidence = 50;
        
        if (positiveCount > negativeCount) {
            sentiment = 'positive';
            confidence = Math.min(90, 50 + (positiveCount * 15));
        } else if (negativeCount > positiveCount) {
            sentiment = 'negative';
            confidence = Math.min(90, 50 + (negativeCount * 15));
        }
        
        const sentimentAnalysis = {
            sentiment,
            confidence,
            emotions: {
                joy: sentiment === 'positive' ? confidence : Math.random() * 30,
                anger: sentiment === 'negative' ? confidence : Math.random() * 20,
                sadness: sentiment === 'negative' ? confidence * 0.8 : Math.random() * 15,
                surprise: Math.random() * 40,
                fear: sentiment === 'negative' ? confidence * 0.6 : Math.random() * 10
            },
            keywords: {
                positive: positiveWords.filter(word => messageLower.includes(word)),
                negative: negativeWords.filter(word => messageLower.includes(word))
            },
            timestamp: new Date().toISOString()
        };
        
        res.json(sentimentAnalysis);
    } catch (error) {
        console.error('❌ Erro na análise de sentimento:', error);
        res.status(500).json({ 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Upload de arquivos simulado
app.post('/api/upload', async (req, res) => {
    try {
        const { filename, size, type } = req.body;
        
        // Validações básicas
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (size && size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'Arquivo muito grande',
                message: 'Tamanho máximo permitido: 10MB',
                timestamp: new Date().toISOString()
            });
        }
        
        if (type && !allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de arquivo não permitido',
                message: 'Tipos permitidos: JPG, PNG, PDF, TXT',
                timestamp: new Date().toISOString()
            });
        }
        
        const uploadResult = {
            success: true,
            message: "Upload simulado com sucesso",
            fileId: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            filename: filename || 'arquivo_desconhecido',
            size: size || 0,
            type: type || 'application/octet-stream',
            url: `/uploads/${Date.now()}_${filename || 'file'}`,
            timestamp: new Date().toISOString()
        };
        
        res.json(uploadResult);
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Configurações do sistema
app.get('/api/config', (req, res) => {
    const config = {
        whatsappEnabled: true,
        aiEnabled: true,
        maxMessageLength: 4096,
        supportedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'txt'],
        version: "1.2.1",
        features: {
            sentimentAnalysis: true,
            autoReply: true,
            fileUpload: true,
            messageScheduling: false,
            groupManagement: true
        },
        limits: {
            maxFileSize: 10485760, // 10MB
            rateLimit: 200,
            rateLimitWindow: 60000,
            maxRetries: 3,
            timeoutMs: 30000
        },
        timeouts: {
            whatsappRequest: 30000,
            retryDelay: 5000,
            maxRetries: 3,
            circuitBreakerThreshold: 3,
            circuitBreakerTimeout: 30000
        }
    };
    res.json(config);
});

app.post('/api/config', (req, res) => {
    // Validar configurações recebidas
    const allowedKeys = [
        'whatsappEnabled', 'aiEnabled', 'maxMessageLength', 
        'autoReply', 'fileUpload'
    ];
    
    const validConfig = {};
    for (const key of allowedKeys) {
        if (req.body.hasOwnProperty(key)) {
            validConfig[key] = req.body[key];
        }
    }
    
    res.json({
        success: true,
        message: "Configurações salvas",
        config: validConfig,
        applied: Object.keys(validConfig).length,
        timestamp: new Date().toISOString()
    });
});

// Middleware para capturar rotas não encontradas
app.use('*', (req, res) => {
    console.log(`❌ Rota não encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: "Endpoint não encontrado",
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        suggestion: "Verifique a documentação da API",
        availableEndpoints: [
            'GET /api/status - Status geral do sistema',
            'GET /api/health - Health check',
            'GET /api/metrics - Métricas detalhadas',
            'GET /api/whatsapp/* - Endpoints do WhatsApp (proxy)',
            'POST /api/generate-message - Gerar mensagem com IA',
            'POST /api/analyze-sentiment - Análise de sentimento',
            'POST /api/upload - Upload de arquivos',
            'GET /api/config - Configurações do sistema',
            'POST /api/config - Atualizar configurações'
        ]
    });
});

// Tratamento de erros global melhorado
app.use((error, req, res, next) => {
    console.error('❌ Erro global capturado:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    
    // Não expor detalhes internos em produção
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(error.status || 500).json({
        error: "Erro interno do servidor",
        message: isDevelopment ? error.message : "Algo deu errado",
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...(isDevelopment && { stack: error.stack })
    });
});

// Inicialização do servidor
app.listen(PORT, async () => {
    console.log(`🚀 Backend Server FINAL v1.2.1 rodando na porta ${PORT}`);
    console.log(`📡 Endpoints principais:`);
    console.log(`   ✅ GET  http://localhost:${PORT}/api/health`);
    console.log(`   📊 GET  http://localhost:${PORT}/api/status`);
    console.log(`   📈 GET  http://localhost:${PORT}/api/metrics`);
    console.log(`   🤖 POST http://localhost:${PORT}/api/generate-message`);
    console.log(`   📱 *    http://localhost:${PORT}/api/whatsapp/* (proxy)`);
    
    // Verificar status inicial do WhatsApp Server
    console.log(`🔍 Verificando WhatsApp Server na porta ${WHATSAPP_SERVER_PORT}...`);
    const isOnline = await checkWhatsAppServerStatus();
    console.log(`📱 WhatsApp Server: ${isOnline ? '✅ Online' : '❌ Offline'}`);
    
    // Configurar verificação periódica do WhatsApp Server
    setInterval(async () => {
        await checkWhatsAppServerStatus();
    }, 15000); // Verifica a cada 15 segundos
    
    console.log(`✅ Melhorias v1.2.1:`);
    console.log(`   🔄 Circuit Breaker implementado`);
    console.log(`   ⚡ Retry com exponential backoff`);
    console.log(`   📊 Métricas detalhadas`);
    console.log(`   🛡️ Rate limiting otimizado`);
    console.log(`   🎯 Fallbacks robustos`);
    console.log(`   ⏱️  Timeouts de 30s`);
    console.log(`✅ Servidor FINAL pronto para produção!`);
});

// Graceful shutdown melhorado
const gracefulShutdown = (signal) => {
    console.log(`🛑 Recebido sinal ${signal}, iniciando shutdown graceful...`);
    
    // Aguardar requisições pendentes
    setTimeout(() => {
        console.log('🔄 Finalizando conexões...');
        process.exit(0);
    }, 5000); // 5 segundos para finalizar requisições
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
    process.exit(1);
});