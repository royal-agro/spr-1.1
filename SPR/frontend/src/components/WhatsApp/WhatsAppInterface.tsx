import React, { useState, useEffect } from 'react';
import { 
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document';
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface Chat {
  id: string;
  contact: Contact;
  messages: Message[];
  unreadCount: number;
  lastMessage: Message;
}

interface WhatsAppInterfaceProps {
  chats: Chat[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onSendMessage: (chatId: string, message: string) => void;
}

const WhatsAppInterface: React.FC<WhatsAppInterfaceProps> = ({
  chats,
  activeChat,
  onChatSelect,
  onSendMessage
}) => {
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const currentChat = chats.find(chat => chat.id === activeChat);
  const filteredChats = chats.filter(chat => 
    chat.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.contact.phone.includes(searchTerm)
  );

  const handleSendMessage = () => {
    if (message.trim() && activeChat) {
      onSendMessage(activeChat, message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="flex h-full bg-gray-100">
      {/* Lista de conversas */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header da lista */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Conversas</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Busca */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={`flex items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeChat === chat.id ? 'bg-whatsapp-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  {chat.contact.avatar ? (
                    <img
                      src={chat.contact.avatar}
                      alt={chat.contact.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-medium">
                      {chat.contact.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {chat.contact.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>

              {/* Informações do chat */}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {chat.contact.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(chat.lastMessage.timestamp)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage.isFromMe && '✓ '}
                    {chat.lastMessage.content}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-whatsapp-500 rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de conversa */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Header da conversa */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  {currentChat.contact.avatar ? (
                    <img
                      src={currentChat.contact.avatar}
                      alt={currentChat.contact.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-medium">
                      {currentChat.contact.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {currentChat.contact.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {currentChat.contact.isOnline 
                      ? 'Online' 
                      : `Visto por último ${formatLastSeen(currentChat.contact.lastSeen)}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <PhoneIcon className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <VideoCameraIcon className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.isFromMe
                        ? 'bg-whatsapp-500 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      msg.isFromMe ? 'text-whatsapp-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{formatTime(msg.timestamp)}</span>
                      {msg.isFromMe && (
                        <span className="text-xs">
                          {msg.status === 'sent' && '✓'}
                          {msg.status === 'delivered' && '✓✓'}
                          {msg.status === 'read' && <span className="text-blue-400">✓✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input de mensagem */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite uma mensagem..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                    <FaceSmileIcon className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="p-2 text-whatsapp-500 hover:text-whatsapp-600 rounded-full hover:bg-whatsapp-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <img
                  src="/assets/logos/logo-royal.png"
                  alt="Royal Negócios Agrícolas"
                  className="w-16 h-16 opacity-50"
                />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Bem-vindo ao SPR WhatsApp
              </h3>
              <p className="text-gray-500">
                Selecione uma conversa para começar a enviar mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInterface; 