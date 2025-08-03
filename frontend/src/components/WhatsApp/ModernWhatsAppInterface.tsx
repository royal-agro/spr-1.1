import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  PaperClipIcon,
  FaceSmileIcon,
  UserCircleIcon,
  CheckIcon,
  CheckIcon as CheckCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useWhatsAppStore } from '../../store/useWhatsAppStore';
import { WhatsAppChat, WhatsAppMessage, ConnectionStatus } from '../../types';

interface ModernWhatsAppInterfaceProps {
  className?: string;
}

const ModernWhatsAppInterface: React.FC<ModernWhatsAppInterfaceProps> = ({ className = '' }) => {
  const {
    connectionStatus,
    isConnected,
    contacts,
    chats,
    sendMessage,
    connectWhatsApp: connect,
    disconnectWhatsApp: disconnect
  } = useWhatsAppStore();

  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  
  const setSelectedChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };
  const filteredChats = chats.filter(chat => 
    chat.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return;
    
    try {
      await sendMessage(selectedChatId, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckIcon className="w-4 h-4 text-gray-500" />;
      case 'delivered':
        return <CheckCheckIcon className="w-4 h-4 text-gray-500" />;
      case 'read':
        return <CheckCheckIcon className="w-4 h-4 text-blue-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white rounded-royal-lg shadow-royal-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-royal-gradient-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">WhatsApp Business</h2>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className="text-sm opacity-90">
                  {connectionStatus === 'connected' ? 'Conectado' :
                   connectionStatus === 'connecting' ? 'Conectando...' :
                   connectionStatus === 'error' ? 'Erro de conexão' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
          
          {!isConnected && (
            <button
              onClick={connect}
              className="bg-white text-royal-primary px-4 py-2 rounded-royal-md font-medium hover:bg-royal-gray-100 transition-colors"
            >
              Conectar
            </button>
          )}
        </div>
      </div>

      <div className="flex h-96">
        {/* Chats List */}
        <div className="w-1/3 border-r border-royal-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-royal-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-royal-gray-400" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-royal-gray-300 rounded-royal-md focus:outline-none focus:ring-2 focus:ring-royal-primary"
              />
            </div>
          </div>

          {/* Chats */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-royal-gray-500">
                <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`p-4 border-b border-royal-gray-100 cursor-pointer hover:bg-royal-gray-50 transition-colors ${
                    selectedChatId === chat.id ? 'bg-royal-primary-light bg-opacity-10 border-l-4 border-l-royal-primary' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      {chat.contact.avatar ? (
                        <img 
                          src={chat.contact.avatar} 
                          alt={chat.contact.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-royal-gradient-secondary rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {chat.contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {chat.contact.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-royal-gray-900 truncate">
                          {chat.contact.name}
                        </h4>
                        <span className="text-xs text-royal-gray-500">
                          {chat.lastMessage && formatTime(chat.lastMessage.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-royal-gray-600 truncate">
                          {chat.lastMessage?.content || 'Nenhuma mensagem'}
                        </p>
                        
                        {chat.unreadCount > 0 && (
                          <span className="bg-royal-primary text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-royal-gray-200 bg-royal-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {selectedChat.contact.avatar ? (
                        <img 
                          src={selectedChat.contact.avatar} 
                          alt={selectedChat.contact.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-royal-gradient-secondary rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {selectedChat.contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {selectedChat.contact.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-royal-gray-900">
                        {selectedChat.contact.name}
                      </h3>
                      <p className="text-sm text-royal-gray-500">
                        {selectedChat.contact.isOnline ? 'Online' : 
                         selectedChat.contact.lastSeen ? 
                         `Visto por último ${formatTime(selectedChat.contact.lastSeen)}` : 
                         'Offline'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-royal-gray-600 hover:text-royal-primary rounded-royal-md hover:bg-royal-gray-100 transition-colors">
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-royal-gray-600 hover:text-royal-primary rounded-royal-md hover:bg-royal-gray-100 transition-colors">
                      <VideoCameraIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-royal-gray-600 hover:text-royal-primary rounded-royal-md hover:bg-royal-gray-100 transition-colors">
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-royal-lg ${
                        message.isFromMe
                          ? 'bg-royal-gradient-primary text-white'
                          : 'bg-royal-gray-100 text-royal-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        message.isFromMe ? 'text-white opacity-70' : 'text-royal-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(message.timestamp)}</span>
                        {message.isFromMe && getStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-royal-gray-200 bg-royal-gray-50">
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-royal-gray-600 hover:text-royal-primary rounded-royal-md hover:bg-royal-gray-100 transition-colors">
                    <PaperClipIcon className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="w-full px-4 py-2 pr-12 border border-royal-gray-300 rounded-royal-lg focus:outline-none focus:ring-2 focus:ring-royal-primary"
                      disabled={!isConnected}
                    />
                    <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-royal-gray-600 hover:text-royal-primary transition-colors">
                      <FaceSmileIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                    className="bg-royal-primary text-white p-2 rounded-royal-lg hover:bg-royal-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-royal-gray-50">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="w-16 h-16 text-royal-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-royal-gray-700 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-royal-gray-500">
                  Escolha uma conversa para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernWhatsAppInterface;