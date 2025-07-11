import React, { useState, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  FaceSmileIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { useWhatsAppStore } from '../../store/useWhatsAppStore';

const WhatsAppInterface: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  
  const { 
    chats, 
    contacts, 
    connectionStatus, 
    isConnecting,
    sendMessage,
    connectWhatsApp,
    disconnectWhatsApp 
  } = useWhatsAppStore();

  // Filtrar chats baseado no termo de busca
  const filteredChats = chats.filter(chat => 
    chat.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chat.contact.phoneNumber && chat.contact.phoneNumber.includes(searchTerm))
  );

  const handleSendMessage = () => {
    if (message.trim() && currentChat) {
      sendMessage(currentChat, message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Função para formatar timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Função para formatar última visualização
  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return 'nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  // Obter chat atual
  const selectedChat = currentChat ? chats.find(chat => chat.id === currentChat) : null;

  return (
    <div className="flex h-full bg-gray-100">
      {/* Sidebar - Lista de Chats */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header da Sidebar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">WhatsApp</h2>
            <div className="flex space-x-2">
              {connectionStatus === 'connected' ? (
                <button
                  onClick={disconnectWhatsApp}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition-colors"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={connectWhatsApp}
                  disabled={isConnecting}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </button>
              )}
            </div>
          </div>
          
          {/* Barra de Busca */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de Chats */}
        <div className="flex-1 overflow-y-auto">
          {connectionStatus !== 'connected' ? (
            <div className="p-4 text-center text-gray-500">
              <div className="mb-3">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                  <PhoneIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <p className="text-sm">WhatsApp desconectado</p>
              <p className="text-xs text-gray-400 mt-1">
                Conecte-se para ver suas conversas
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Nenhuma conversa encontrada</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? 'Tente um termo diferente' : 'Inicie uma nova conversa'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setCurrentChat(chat.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentChat === chat.id
                      ? 'bg-whatsapp-100 border-l-4 border-whatsapp-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-600">
                          {chat.contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {chat.contact.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {chat.contact.name}
                        </h3>
                        {chat.lastMessage && (
                          <p className="text-xs text-gray-500">
                            {formatTime(chat.lastMessage.timestamp)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage ? (
                            <>
                              {chat.lastMessage.isFromMe && '✓ '}
                              {chat.lastMessage.content}
                            </>
                          ) : (
                            'Nenhuma mensagem'
                          )}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-whatsapp-500 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {!selectedChat ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <PhoneIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500">
                Escolha uma conversa da lista para começar a enviar mensagens
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Chat */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {selectedChat.contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {selectedChat.contact.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat.contact.isOnline
                        ? 'online'
                        : `visto por último ${formatLastSeen(selectedChat.contact.lastSeen)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <VideoCameraIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <PhoneIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedChat.messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Envie a primeira mensagem para começar a conversa
                  </p>
                </div>
              ) : (
                selectedChat.messages.map((msg) => (
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
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs ${msg.isFromMe ? 'text-whatsapp-100' : 'text-gray-500'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                        {msg.isFromMe && (
                          <div className="flex items-center space-x-1">
                            {msg.status === 'sent' && (
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 16 15">
                                <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                              </svg>
                            )}
                            {msg.status === 'delivered' && (
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 16 15">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-2.143a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                                <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                              </svg>
                            )}
                            {msg.status === 'read' && (
                              <svg className="w-3 h-3 fill-current text-blue-500" viewBox="0 0 16 15">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-2.143a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                                <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Área de Input */}
            <div className="p-4 bg-white border-t border-gray-200">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-whatsapp-500 focus:border-transparent"
                  />
                  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <FaceSmileIcon className="h-5 w-5" />
                  </button>
                </div>
                {message.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-whatsapp-500 text-white rounded-full hover:bg-whatsapp-600 transition-colors"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <MicrophoneIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInterface; 