# Sistema de Licenciamento SPR

## Visão Geral

O SPR (Sistema Preditivo Royal) possui um sistema de licenciamento robusto que permite controlar o acesso às funcionalidades baseado em diferentes tipos de licença. Este sistema é ideal para:

- **Controle de Acesso**: Liberar funcionalidades apenas para clientes autorizados
- **Monetização**: Diferentes planos com funcionalidades específicas
- **Gestão de Clientes**: Rastreamento de uso e sessões ativas
- **Flexibilidade**: Ativação/desativação de recursos específicos

## Como Funciona

### 1. ID da Sessão e Nome do Cliente

Para ativar o sistema, você precisa fornecer:

- **ID da Sessão**: Um identificador único para o cliente/licença
- **Nome do Cliente**: Nome da pessoa ou empresa que está usando o sistema

### 2. Tipos de Licença

O sistema suporta 4 tipos de licença:

#### 🆓 **Trial (Teste)**
- Duração: 7 dias
- Funcionalidades básicas
- Ideal para avaliação

#### 🔵 **Basic (Básica)**
- Funcionalidades essenciais
- Automação de campanhas
- Grupos de contatos
- Mensagens agendadas

#### 🟣 **Premium**
- Todas as funcionalidades Basic +
- Múltiplas instâncias WhatsApp
- Assistente IA integrado
- Google Calendar
- Análises avançadas
- Mensagens de voz

#### 🟢 **Enterprise (Empresarial)**
- Todas as funcionalidades Premium +
- Até 10 sessões simultâneas
- Suporte prioritário
- Recursos personalizados

## Como Preencher as Credenciais

### Método 1: Interface Gráfica

1. **Acesse o Sistema**: Abra o SPR no navegador
2. **Tela de Ativação**: Se não estiver ativado, verá a tela de ativação automaticamente
3. **Preencha os Dados**:
   - **ID da Sessão**: Insira o código fornecido
   - **Nome do Cliente**: Seu nome ou da empresa
   - **Dados Opcionais**: Empresa, email, telefone (opcional)
4. **Clique em "Ativar Licença"**

### Método 2: Configurações

1. **Acesse**: Menu → Configurações → Aba "Licença"
2. **Clique em "Alterar Licença"**
3. **Preencha os novos dados**
4. **Salve as alterações**

## Exemplos de IDs de Sessão

### Por Tipo de Licença

```
# Premium
spr-premium-2024-abc123
minha-empresa-premium-2024
cliente-premium-xyz789

# Basic
spr-basic-cliente-def456
empresa-basic-2024
cliente-standard-abc123

# Enterprise
spr-enterprise-corp-ghi789
empresa-corp-2024
cliente-enterprise-xyz456

# Trial (qualquer ID não específico)
spr-teste-2024
cliente-trial-abc
teste-empresa-123
```

### Por Cliente

```
# Empresa específica
fazenda-santa-maria-premium-2024
cooperativa-abc-enterprise-2024
agroindustria-xyz-basic-2024

# Cliente individual
joao-silva-premium-2024
maria-santos-basic-2024
pedro-costa-enterprise-2024
```

## Funcionalidades por Licença

| Funcionalidade | Trial | Basic | Premium | Enterprise |
|---|---|---|---|---|
| Integração WhatsApp | ✅ | ✅ | ✅ | ✅ |
| Geração de Relatórios | ✅ | ✅ | ✅ | ✅ |
| Automação de Campanhas | ❌ | ✅ | ✅ | ✅ |
| Grupos de Contatos | ❌ | ✅ | ✅ | ✅ |
| Mensagens Agendadas | ❌ | ✅ | ✅ | ✅ |
| Múltiplas Instâncias | ❌ | ❌ | ✅ | ✅ |
| Assistente IA | ❌ | ❌ | ✅ | ✅ |
| Google Calendar | ❌ | ❌ | ✅ | ✅ |
| Análises Avançadas | ❌ | ❌ | ✅ | ✅ |
| Mensagens de Voz | ❌ | ❌ | ✅ | ✅ |
| Sessões Simultâneas | 1 | 3 | 5 | 10 |

## Implementação Técnica

### Para Desenvolvedores

#### 1. Verificar Acesso a Funcionalidade

```typescript
import { useFeatureAccess } from '../store/useLicenseStore';

// Em um componente
const hasAIAccess = useFeatureAccess('aiAssistant');

if (hasAIAccess) {
  // Mostrar funcionalidade
} else {
  // Mostrar mensagem de upgrade
}
```

#### 2. Proteger Componentes

```typescript
import FeatureGuard from '../components/License/FeatureGuard';

<FeatureGuard feature="campaignAutomation">
  <CampaignComponent />
</FeatureGuard>
```

#### 3. Verificar Status da Licença

```typescript
import { useLicenseInfo } from '../store/useLicenseStore';

const { isActivated, remainingDays, licenseType } = useLicenseInfo();
```

## Configuração de Servidor

### Validação Personalizada

Para implementar validação personalizada de licenças:

1. **Modifique**: `src/store/useLicenseStore.ts`
2. **Função**: `validateLicenseOnServer`
3. **Implemente**: Sua lógica de validação

```typescript
const validateLicenseOnServer = async (sessionId: string, clientName: string) => {
  // Sua lógica de validação aqui
  const response = await fetch('/api/validate-license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, clientName })
  });
  
  return await response.json();
};
```

## Ambiente de Desenvolvimento

### Bypass de Licenciamento

Em desenvolvimento, o sistema automaticamente:
- Libera todas as funcionalidades
- Cria licença Premium fictícia
- Permite testes sem restrições

Para desabilitar:
```typescript
// config/index.ts
development: {
  bypassLicensing: false // Força validação em desenvolvimento
}
```

## Troubleshooting

### Problemas Comuns

#### 1. "ID de sessão inválido"
- **Causa**: ID muito curto (< 8 caracteres)
- **Solução**: Use IDs mais longos e descritivos

#### 2. "Licença expirada"
- **Causa**: Data de expiração passou
- **Solução**: Renovar licença ou gerar nova

#### 3. "Funcionalidade bloqueada"
- **Causa**: Licença não permite o recurso
- **Solução**: Upgrade para licença superior

#### 4. "Erro ao validar licença"
- **Causa**: Problema de conexão ou servidor
- **Solução**: Verificar conectividade e configuração

### Logs de Debug

Para debug, habilite logs:
```typescript
// config/index.ts
development: {
  enableDebugLogs: true
}
```

## Suporte

Para dúvidas ou problemas:
1. Verifique este guia
2. Consulte os logs do sistema
3. Entre em contato com o suporte técnico

---

**Nota**: Este sistema é flexível e pode ser adaptado para suas necessidades específicas. Todos os IDs de sessão e validações podem ser personalizados conforme sua arquitetura. 