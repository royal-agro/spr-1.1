import React, { useState, useEffect } from 'react';
import WhatsAppInterface from '../components/WhatsApp/WhatsAppInterface';
import { toast } from 'react-hot-toast';

// Definir tipos locais para compatibilidade
interface ChatContact {
  id: string;
  name: string;
  phone: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  type: 'text';
}

interface Chat {
  id: string;
  contact: ChatContact;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage: ChatMessage;
}

// Dados mockados para demonstração
const mockChats: Chat[] = [
  {
    id: '1',
    contact: {
      id: '1',
      name: 'João Silva',
      phone: '+55 11 99999-1234',
      isOnline: true,
      lastSeen: new Date(),
    },
    messages: [
      {
        id: '1',
        content: 'Olá! Gostaria de saber o preço da soja hoje.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        isFromMe: false,
        status: 'read',
        type: 'text',
      },
      {
        id: '2',
        content: 'Olá João! O preço da soja hoje está R$ 127,50/saca. Subiu 2,3% nas últimas 24h.',
        timestamp: new Date(Date.now() - 1000 * 60 * 3),
        isFromMe: true,
        status: 'read',
        type: 'text',
      },
      {
        id: '3',
        content: 'Obrigado! E o milho?',
        timestamp: new Date(Date.now() - 1000 * 60 * 1),
        isFromMe: false,
        status: 'delivered',
        type: 'text',
      },
    ],
    unreadCount: 1,
    lastMessage: {
      id: '3',
      content: 'Obrigado! E o milho?',
      timestamp: new Date(Date.now() - 1000 * 60 * 1),
      isFromMe: false,
      status: 'delivered',
      type: 'text',
    },
  },
  {
    id: '2',
    contact: {
      id: '2',
      name: 'Maria Santos',
      phone: '+55 11 98888-5678',
      isOnline: false,
      lastSeen: new Date(Date.now() - 1000 * 60 * 30),
    },
    messages: [
      {
        id: '4',
        content: 'Bom dia! Preciso de informações sobre o preço do café.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        isFromMe: false,
        status: 'read',
        type: 'text',
      },
      {
        id: '5',
        content: 'Bom dia Maria! O café está cotado a R$ 890,00/saca, com alta de 4,7%.',
        timestamp: new Date(Date.now() - 1000 * 60 * 40),
        isFromMe: true,
        status: 'read',
        type: 'text',
      },
    ],
    unreadCount: 0,
    lastMessage: {
      id: '5',
      content: 'Bom dia Maria! O café está cotado a R$ 890,00/saca, com alta de 4,7%.',
      timestamp: new Date(Date.now() - 1000 * 60 * 40),
      isFromMe: true,
      status: 'read',
      type: 'text',
    },
  },
  {
    id: '3',
    contact: {
      id: '3',
      name: 'Carlos Pereira',
      phone: '+55 11 97777-9012',
      isOnline: true,
      lastSeen: new Date(),
    },
    messages: [
      {
        id: '6',
        content: 'Oi! Vocês têm previsão para o algodão na próxima semana?',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        isFromMe: false,
        status: 'read',
        type: 'text',
      },
    ],
    unreadCount: 1,
    lastMessage: {
      id: '6',
      content: 'Oi! Vocês têm previsão para o algodão na próxima semana?',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      isFromMe: false,
      status: 'read',
      type: 'text',
    },
  },
];

const WhatsAppPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  useEffect(() => {
    // Simular conexão com WhatsApp
    setConnectionStatus('connecting');
    
    const timer = setTimeout(() => {
      setConnectionStatus('connected');
      toast.success('Conectado ao WhatsApp Business!');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    
    // Marcar mensagens como lidas
    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? { ...chat, unreadCount: 0 }
          : chat
      )
    );
  };

  const handleSendMessage = (chatId: string, message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      timestamp: new Date(),
      isFromMe: true,
      status: 'sent',
      type: 'text',
    };

    setChats(prevChats =>
      prevChats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: newMessage,
            }
          : chat
      )
    );

    // Simular entrega da mensagem
    setTimeout(() => {
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === newMessage.id
                    ? { ...msg, status: 'delivered' }
                    : msg
                ),
              }
            : chat
        )
      );
    }, 1000);

    // Simular leitura da mensagem
    setTimeout(() => {
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === newMessage.id
                    ? { ...msg, status: 'read' }
                    : msg
                ),
              }
            : chat
        )
      );
    }, 3000);

    toast.success('Mensagem enviada!');
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Conectando ao WhatsApp...
          </h3>
          <p className="text-gray-500">
            Aguarde enquanto estabelecemos a conexão
          </p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Conexão Perdida
          </h3>
          <p className="text-gray-500 mb-4">
            Não foi possível conectar ao WhatsApp Business
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-whatsapp-500 text-white rounded-md hover:bg-whatsapp-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <WhatsAppInterface
        chats={chats}
        activeChat={activeChat}
        onChatSelect={handleChatSelect}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default WhatsAppPage; 