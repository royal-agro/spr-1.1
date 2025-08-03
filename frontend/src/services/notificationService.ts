// Interface para eventos do calendário
interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  date: Date;
  type: 'meeting' | 'webinar' | 'report';
  attendees: string[];
  location: string;
  whatsappNotification: boolean;
  emailNotification: boolean;
}

// Interface para botões do WhatsApp
interface WhatsAppButton {
  type: 'quick_reply' | 'url' | 'phone';
  text: string;
  url?: string;
  phone?: string;
}

// Templates de email
const emailTemplates = {
  meeting: (event: CalendarEvent) => ({
    subject: `📅 Lembrete: ${event.title}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🌾 Royal Negócios Agrícolas</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema Preditivo Royal</p>
      </div>
      
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">📅 Lembrete de Reunião</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #374151; margin-top: 0;">${event.title}</h3>
          <p style="color: #6b7280; margin-bottom: 15px;">${event.description}</p>
          
          <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1e40af;"><strong>📅 Data:</strong> ${event.date.toLocaleDateString('pt-BR')}</p>
            <p style="margin: 5px 0 0 0; color: #1e40af;"><strong>🕐 Horário:</strong> ${event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p style="margin: 5px 0 0 0; color: #1e40af;"><strong>📍 Local:</strong> ${event.location}</p>
          </div>
          
          <p style="color: #374151; margin-bottom: 0;">
            📈 <strong>SPR:</strong> Sistema Preditivo Royal - Dados atualizados em tempo real.
          </p>
        </div>
      </div>
      
      <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 14px;">
        <p style="margin: 0;">Royal Negócios Agrícolas © 2025 - Todos os direitos reservados</p>
        <p style="margin: 5px 0 0 0; opacity: 0.8;">Sistema Preditivo Royal - Previsão inteligente para o agronegócio</p>
      </div>
    </div>
    `,
    text: `Lembrete de Reunião: ${event.title} em ${event.date.toLocaleDateString('pt-BR')} às ${event.date.toLocaleTimeString('pt-BR')} no local ${event.location}. Descrição: ${event.description}`
  }),

  webinar: (event: CalendarEvent) => ({
    subject: `🎥 Lembrete: ${event.title}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎥 Webinar SPR</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema Preditivo Royal</p>
      </div>
      
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #7c3aed; margin-bottom: 20px;">📡 Webinar Começando em Breve</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #374151; margin-top: 0;">${event.title}</h3>
          <p style="color: #6b7280; margin-bottom: 15px;">${event.description}</p>
          
          <div style="background: #faf5ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #7c3aed;"><strong>📅 Data:</strong> ${event.date.toLocaleDateString('pt-BR')}</p>
            <p style="margin: 5px 0 0 0; color: #7c3aed;"><strong>🕐 Horário:</strong> ${event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p style="margin: 5px 0 0 0; color: #7c3aed;"><strong>🌐 Acesso:</strong> ${event.location}</p>
          </div>
          
          <p style="color: #374151; margin-bottom: 0;">
            📈 Dados atualizados em tempo real pelo Sistema Preditivo Royal.
          </p>
        </div>
      </div>
      
      <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 14px;">
        <p style="margin: 0;">Royal Negócios Agrícolas © 2025 - Todos os direitos reservados</p>
        <p style="margin: 5px 0 0 0; opacity: 0.8;">Sistema Preditivo Royal - Previsão inteligente para o agronegócio</p>
      </div>
    </div>
    `,
    text: `Lembrete de Webinar: ${event.title} em ${event.date.toLocaleDateString('pt-BR')} às ${event.date.toLocaleTimeString('pt-BR')}. Acesso: ${event.location}. Descrição: ${event.description}`
  }),

  report: (event: CalendarEvent) => ({
    subject: `📊 Relatório SPR: ${event.title}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📊 Relatório SPR</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema Preditivo Royal</p>
      </div>
      
      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #059669; margin-bottom: 20px;">📈 Novo Relatório Disponível</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="color: #374151; margin-top: 0;">${event.title}</h3>
          <p style="color: #6b7280; margin-bottom: 15px;">${event.description}</p>
          
          <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #059669;"><strong>📅 Gerado em:</strong> ${event.date.toLocaleDateString('pt-BR')}</p>
            <p style="margin: 5px 0 0 0; color: #059669;"><strong>📱 Enviado via:</strong> ${event.location}</p>
          </div>
          
          <p style="color: #374151; margin-bottom: 0;">
            📈 Dados atualizados em tempo real pelo Sistema Preditivo Royal.
          </p>
        </div>
      </div>
      
      <div style="background: #374151; color: white; padding: 20px; text-align: center; font-size: 14px;">
        <p style="margin: 0;">Royal Negócios Agrícolas © 2025 - Todos os direitos reservados</p>
        <p style="margin: 5px 0 0 0; opacity: 0.8;">Sistema Preditivo Royal - Previsão inteligente para o agronegócio</p>
      </div>
    </div>
    `,
    text: `Relatório SPR: ${event.title}. Gerado em ${event.date.toLocaleDateString('pt-BR')}. ${event.description}`
  })
};

// Templates de WhatsApp
const whatsappTemplates = {
  meeting: (event: CalendarEvent) => `📅 *Lembrete de Reunião*

🏢 *${event.title}*
${event.description}

📅 Data: ${event.date.toLocaleDateString('pt-BR')}
🕐 Horário: ${event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
📍 Local: ${event.location}

🌾 *SPR - Sistema Preditivo Royal*
📊 Dados atualizados em tempo real

_Royal Negócios Agrícolas_`,

  webinar: (event: CalendarEvent) => `🎥 *Webinar Começando em Breve*

📡 *${event.title}*
${event.description}

📅 Data: ${event.date.toLocaleDateString('pt-BR')}
🕐 Horário: ${event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
🌐 Acesso: ${event.location}

🌾 *SPR - Sistema Preditivo Royal*
📈 Previsão inteligente para o agronegócio

_Royal Negócios Agrícolas_`,

  report: (event: CalendarEvent) => `📊 *Novo Relatório Disponível*

📈 *${event.title}*
${event.description}

📅 Gerado em: ${event.date.toLocaleDateString('pt-BR')}
📱 Enviado via: ${event.location}

🌾 *SPR - Sistema Preditivo Royal*
📊 Dados atualizados em tempo real

_Royal Negócios Agrícolas_`
};

// Classe principal do serviço de notificações
class NotificationService {
  private static instance: NotificationService;
  private whatsappEndpoint = 'http://localhost:3003/api/whatsapp/send';
  private emailEndpoint = 'http://localhost:8000/api/send-email';

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Enviar notificação por email
  async sendEmailNotification(
    type: 'meeting' | 'webinar' | 'report', 
    data: CalendarEvent,
    recipients: string[]
  ): Promise<boolean> {
    try {
      const template = emailTemplates[type](data);
      
      const response = await fetch(this.emailEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipients,
          subject: template.subject,
          html: template.html,
          text: template.text
        })
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  // Enviar notificação via WhatsApp
  async sendWhatsAppNotification(
    type: 'meeting' | 'webinar' | 'report',
    data: CalendarEvent,
    recipients: string[]
  ): Promise<boolean> {
    try {
      const message = whatsappTemplates[type](data);
      
      const promises = recipients.map(recipient => 
        fetch(this.whatsappEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: recipient,
            message: message,
            buttons: this.generateWhatsAppButtons(type, data)
          })
        })
      );

      const responses = await Promise.all(promises);
      return responses.every(response => response.ok);
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      return false;
    }
  }

  // Gerar botões para WhatsApp baseado no tipo de evento
  private generateWhatsAppButtons(type: 'meeting' | 'webinar' | 'report', data: CalendarEvent): WhatsAppButton[] {
    const baseButtons: WhatsAppButton[] = [
      { type: 'quick_reply', text: '✅ Confirmado' },
      { type: 'quick_reply', text: '❌ Não posso ir' },
      { type: 'quick_reply', text: '📞 Ligar' }
    ];

    if (type === 'webinar' && data.location.startsWith('http')) {
      baseButtons.push({ type: 'url', text: '🚀 Participar', url: data.location });
    }

    return baseButtons;
  }

  // Agendar notificação
  async scheduleNotification(
    event: CalendarEvent,
    when: 'now' | '1hour' | '1day'
  ): Promise<void> {
    const delays = {
      'now': 0,
      '1hour': 60 * 60 * 1000, // 1 hora em ms
      '1day': 24 * 60 * 60 * 1000 // 1 dia em ms
    };

    const delay = delays[when];
    const notificationTime = new Date(event.date.getTime() - delay);

    if (notificationTime > new Date()) {
      setTimeout(async () => {
        if (event.emailNotification) {
          await this.sendEmailNotification(event.type, event, event.attendees);
        }
        
        if (event.whatsappNotification) {
          await this.sendWhatsAppNotification(event.type, event, event.attendees);
        }
      }, notificationTime.getTime() - Date.now());
    }
  }

  // Cancelar notificação agendada
  async cancelScheduledNotification(eventId: number): Promise<void> {
    // Implementar lógica para cancelar notificações agendadas
    console.log(`Cancelando notificação para evento ${eventId}`);
  }

  // Testar conectividade dos serviços
  async testConnectivity(): Promise<{ email: boolean; whatsapp: boolean }> {
    try {
      // Backend SPR (port 8000) - use /health (not /api/health)
      const emailTest = await fetch('http://localhost:8000/health');
      // WhatsApp server (port 3003) - use /api/status (not /api/health)
      const whatsappTest = await fetch('http://localhost:3003/api/status');
      
      return {
        email: emailTest.ok,
        whatsapp: whatsappTest.ok
      };
    } catch (error) {
      console.error('Erro ao testar conectividade:', error);
      return { email: false, whatsapp: false };
    }
  }
}

export default NotificationService.getInstance();
export type { CalendarEvent, WhatsAppButton }; 