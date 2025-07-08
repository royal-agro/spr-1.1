# SPR 1.1 - Interface NSPR

Sistema de Produção Rural - Módulo 1: Interface Web

## 📋 Descrição

Interface web completa para o sistema SPR 1.1, desenvolvida especificamente para produtores rurais e operadores de campo. O painel oferece acesso centralizado a todas as funcionalidades do sistema através de uma interface moderna, responsiva e intuitiva.

## 🚀 Características

- **Backend**: FastAPI (Python)
- **Frontend**: HTML + TailwindCSS (via CDN)
- **Responsivo**: Mobile, tablet e desktop
- **Acessível**: Interface otimizada para uso em campo
- **Modular**: Arquitetura preparada para expansão

## 📦 Estrutura do Projeto

```
spr-main/interface_nspr/
├── app_nspr.py              # Aplicação FastAPI principal
├── requirements.txt         # Dependências Python
├── templates/
│   ├── index.html          # Página principal do painel
│   └── module.html         # Template para módulos específicos
└── assets/
    └── imagens_royal/      # Imagens e recursos visuais
        ├── logo-1.png
        ├── fundo-1.jpg
        ├── clima-1.png
        └── ndvi-1.png
```

## 🛠️ Instalação e Execução

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Executar o Sistema

```bash
python app_nspr.py
```

### 3. Acessar o Painel

Abra o navegador em: `http://localhost:8000`

## 🎯 Funcionalidades Principais

### Painel Principal (/)
- **Dashboard Central**: Visão geral do sistema com estatísticas rápidas
- **Navegação Intuitiva**: Máximo de 5 cliques para qualquer função
- **Status em Tempo Real**: Monitoramento contínuo do sistema

### Módulos Disponíveis

1. **📈 Ver NDVI** (`/ndvi`)
   - Análise de índice de vegetação
   - Mapas de cobertura vegetal
   - Dados de produtividade

2. **🌤️ Ver Clima** (`/clima`)
   - Monitoramento meteorológico
   - Previsões em tempo real
   - Alertas climáticos

3. **💱 Ver Câmbio** (`/cambio`)
   - Cotações de moedas
   - Preços de commodities
   - Análise de mercado

4. **📊 Gerar Relatório da Soja** (`/relatorio`)
   - Relatórios de produção
   - Análises históricas
   - Projeções de safra

5. **⚙️ Status do Sistema** (`/status`)
   - Diagnóstico do sistema
   - Monitoramento de módulos
   - Alertas e notificações

## 🎨 Design e UX

### Paleta de Cores
- **Verde Agrícola**: `#2d5016` (cor principal)
- **Verde Claro**: `#4a7c59` (secundária)
- **Fundo**: `#f8fffe` (neutro claro)
- **Destaque**: `#8bc34a` (accent)

### Características Visuais
- Interface limpa e moderna
- Ícones intuitivos (FontAwesome)
- Animações suaves
- Feedback visual imediato
- Design inspirado em FieldView, Agrihub e Climate

## 📱 Responsividade

- **Mobile**: Layout adaptado para smartphones
- **Tablet**: Otimizado para tablets em campo
- **Desktop**: Interface completa para escritório

## 🔧 APIs Disponíveis

### Endpoints REST

- `GET /api/status` - Status do sistema
- `GET /api/stats` - Estatísticas rápidas

### Atualização Automática

- Status atualizado a cada 30 segundos
- Dados dos módulos atualizados a cada minuto
- Refresh manual disponível

## 🔒 Segurança e Performance

- Código otimizado para uso local
- Sem dependências externas pesadas
- Fallbacks para imagens não encontradas
- Tratamento de erros robusto

## 🚀 Deploy e Produção

### Preparação para Deploy
1. Configurar variáveis de ambiente
2. Ajustar caminhos de assets
3. Configurar proxy reverso (nginx/apache)
4. Ativar HTTPS em produção

### Configuração Recomendada
```bash
# Para produção
uvicorn app_nspr:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📋 Requisitos do Sistema

- **Python**: 3.8+
- **RAM**: 512MB mínimo
- **Disco**: 100MB para aplicação
- **Rede**: Conectividade para APIs externas (opcional)

## 🤝 Uso em Campo

### Otimizações para Produtores
- Interface touch-friendly
- Contraste otimizado para luz solar
- Textos grandes e legíveis
- Navegação simples e intuitiva
- Carregamento rápido mesmo com conexão lenta

### Compatibilidade
- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Dispositivos móveis (Android, iOS)
- Tablets robustos para campo

## 🔄 Atualizações e Manutenção

### Logs do Sistema
- Logs automáticos de acesso
- Monitoramento de performance
- Alertas de erro em tempo real

### Versionamento
- Versão atual: 1.1.0
- Sistema de versionamento semântico
- Atualizações incrementais

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema SPR 1.1:

- **Documentação**: Consulte este README
- **Logs**: Verifique os logs do sistema
- **Performance**: Monitor integrado no painel

## 🎯 Próximos Passos

1. Integração com APIs reais de NDVI e clima
2. Sistema de autenticação
3. Notificações push
4. Modo offline
5. Relatórios avançados
6. Integração com equipamentos de campo

---

**SPR 1.1** - Desenvolvido para a agricultura moderna  
*Interface NSPR - Módulo 1*