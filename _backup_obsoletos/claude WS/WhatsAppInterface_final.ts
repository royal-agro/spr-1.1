import React, { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  PhoneIcon, 
  VideoCameraIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useWhatsAppStore } from '../../store/useWhatsAppStore';
import { useWhatsAppSync } from '../../hooks/useWhatsAppSync';
import { config } from '../../config';
import type { WhatsAppMessage } from '../../types';

const WhatsAppInterface: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    connectionStatus,
    qrCode,
    chats,
    contacts,
    connectWhatsApp,
    disconnectWhatsApp,
    markAsRead
  } = useWhatsAppStore();

  const {
    isConnected,
    syncError,
    lastSync,
    isRetrying,
    syncChatMessages,
    sendMessage: hookSendMessage,
    checkStatus,
    retry: retrySync
  } = useWhatsAppSync();

  // Verificar status na montagem do componente
  useEffect(() => {
    console.log('🚀 Inicializando WhatsApp Interface...');
    try {
      checkStatus();
    } catch (err) {
      console.error('Erro ao verificar status inicial:', err);
      setError('Erro ao verificar status do WhatsApp');
    }
  }, [checkStatus]);

  // Filtrar chats baseado na busca
  const filteredChats = chats.filter(chat =>
    chat.contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
    chat.contact.phone.includes(searchText)
  );

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

  // Scroll automático para o final das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChatData?.messages]);

  // Função para enviar mensagem com feedback visual
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || isSendingMessage) return;

    const messageToSend = messageText.trim();
    setMessageText(''); // Limpar campo imediatamente
    setIsSendingMessage(true);

    try {
      await hookSendMessage(selectedChat, messageToSend);
      console.log('✅ Mensagem enviada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      // A mensagem de erro já é tratada no hook
      setMessageText(messageToSend); // Restaurar texto se falhou
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Função para selecionar chat e carregar mensagens
  const handleSelectChat = async (chatId: string) => {
    if (selectedChat === chatId) return; // Já selecionado
    
    setSelectedChat(chatId);
    setIsLoadingMessages(true);
    markAsRead(chatId);
    
    try {
      // Carregar mensagens do servidor se o chat estiver vazio ou com poucas mensagens
      const chat = chats.find(c => c.id === chatId);
      if (chat && chat.messages.length < 5) {
        console.log(`🔄 Carregando mensagens para ${chat.contact.name}...`);
        await syncChatMessages(chatId);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Função para lidar com tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Funções para controle de resposta automática
  const toggleAutoReply = async () => {
    try {
      const endpoint = autoReplyEnabled ? '/api/whatsapp/auto-reply/disable' : '/api/whatsapp/auto-reply/enable';
      const response = await fetch(`${config.whatsapp.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutoReplyEnabled(data.autoReplyEnabled);
        console.log(`🤖 ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao alterar resposta automática:', error);
    }
  };

  // Verificar status da resposta automática
  useEffect(() => {
    const checkAutoReplyStatus = async () => {
      try {
        const response = await fetch(`${config.whatsapp.apiUrl}/api/whatsapp/auto-reply/status`);
        if (response.ok) {
          const data = await response.json();
          setAutoReplyEnabled(data.autoReplyEnabled);
        }
      } catch (error) {
        console.error('Erro ao verificar status da resposta automática:', error);
      }
    };

    if (isConnected) {
      checkAutoReplyStatus();
    }
  }, [isConnected]);

  // Componente para mostrar QR Code
  const QRCodeDisplay = () => {
    if (!qrCode) return null;

    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Conectar WhatsApp</h3>
        <p className="text-gray-600 mb-4 text-center">
          Escaneie o código QR com seu WhatsApp para conectar
        </p>
        <img 
          src={qrCode} 
          alt="QR Code para conectar WhatsApp" 
          className="max-w-xs max-h-xs border rounded"
        />
        <p className="text-sm text-gray-500 mt-4 text-center">
          1. Abra o WhatsApp no seu celular<br/>
          2. Toque em Menu → Dispositivos conectados<br/>
          3. Toque em "Conectar um dispositivo"<br/>
          4. Escaneie este código QR
        </p>
        <button
          onClick={checkStatus}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2"
          disabled={isRetrying}
        >
          <ArrowPathIcon className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Verificando...' : 'Verificar Conexão'}</span>
        </button>
      </div>
    );
  };

  // Componente para mensagem de status
  const StatusMessage = ({ message, type }: { message: string; type: 'info' | 'error' | 'success' }) => {
    const bgColor = type === 'error' ? 'bg-red-100 text-red-700' : 
                    type === 'success' ? 'bg-green-100 text-green-700' : 
                    'bg-blue-100 text-blue-700';
    
    return (
      <div className={`px-4 py-2 text-sm text-center ${bgColor}`}>
        {message}
        {type === 'error' && (
          <button 
            onClick={retrySync}
            className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            disabled={isRetrying}
          >
            {isRetrying ? 'Tentando...' : 'Tentar Novamente'}
          </button>
        )}
      </div>
    );
  };

  // Se houver erro crítico, mostrar mensagem de erro
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[600px] flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Erro no WhatsApp</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              checkStatus();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            disabled={isRetrying}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Tentando...' : 'Tentar Novamente'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[600px] flex">
      {/* Sidebar com lista de chats */}
      <div className="w-1/3 border-r border-gray-300 flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">WhatsApp</h2>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <button
                onClick={disconnectWhatsApp}
                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                disabled={isRetrying}
              >
                Desconectar
              </button>
            ) : (
              <button
                onClick={connectWhatsApp}
                className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                disabled={isRetrying}
              >
                Conectar
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div>
          {connectionStatus === 'connected' && (
            <StatusMessage 
              message={`✅ WhatsApp conectado${lastSync ? ` - Última sync: ${lastSync.toLocaleTimeString()}` : ''}`}
              type="success"
            />
          )}
          {connectionStatus === 'connecting' && (
            <StatusMessage message="🔄 Conectando..." type="info" />
          )}
          {connectionStatus === 'error' && (
            <StatusMessage message={`❌ Erro de conexão${syncError ? `: ${syncError}` : ''}`} type="error" />
          )}
          {connectionStatus === 'disconnected' && (
            <StatusMessage message="⚠️ WhatsApp desconectado" type="info" />
          )}
          
          {/* Controle de Resposta Automática */}
          {connectionStatus === 'connected' && (
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <span>Resposta Automática:</span>
                <button
                  onClick={toggleAutoReply}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    autoReplyEnabled 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                >
                  {autoReplyEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Campo de busca */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {!isConnected && qrCode ? (
            <div className="p-4">
              <QRCodeDisplay />
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-sm mb-2">WhatsApp desconectado</p>
              <button
                onClick={connectWhatsApp}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2"
                disabled={isRetrying}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Conectando...' : 'Conectar WhatsApp'}</span>
              </button>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-sm">
                {searchText ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
              </p>
              {!searchText && (
                <button
                  onClick={retrySync}
                  className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Carregando...' : 'Recarregar'}
                </button>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedChat === chat.id
                    ? 'bg-green-100 border-l-4 border-green-500'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                    <span className="text-lg font-bold">
                      {chat.contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {chat.contact.name}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-xs text-gray-500">
                          {chat.lastMessage.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {typeof chat.lastMessage?.content === 'string' 
                          ? chat.lastMessage.content 
                          : 'Nenhuma mensagem'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-green-500 rounded-full min-w-[20px]">
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

      {/* Área principal de chat */}
      <div className="flex-1 flex flex-col">
        {selectedChatData ? (
          <>
            {/* Header do chat */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <span className="text-sm font-bold">
                    {selectedChatData.contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedChatData.contact.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedChatData.contact.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Ligar"
                >
                  <PhoneIcon className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Videochamada"
                >
                  <VideoCameraIcon className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Informações do contato"
                >
                  <InformationCircleIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => syncChatMessages(selectedChatData.id)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Recarregar mensagens"
                  disabled={isLoadingMessages}
                >
                  <ArrowPathIcon className={`h-5 w-5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {isLoadingMessages && (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500 mr-2" />
                  <span className="text-sm text-gray-500">Carregando mensagens...</span>
                </div>
              )}
              
              {selectedChatData.messages.length === 0 && !isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-sm mb-2">Nenhuma mensagem nesta conversa</p>
                    <button
                      onClick={() => syncChatMessages(selectedChatData.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      disabled={isLoadingMessages}
                    >
                      Carregar mensagens
                    </button>
                  </div>
                </div>
              ) : (
                selectedChatData.messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isFromMe
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        message.isFromMe ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        <p className="text-xs">
                          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </p>
                        {message.isFromMe && (
                          <span className="text-xs">
                            {message.status === 'pending' && '⏳'}
                            {message.status === 'sent' && '✓'}
                            {message.status === 'delivered' && '✓✓'}
                            {message.status === 'read' && '✓✓'}
                            {message.status === 'error' && '❌'}
                            {message.status === 'failed' && '❌'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
               
              {/* Indicador de digitação */}
              {isSendingMessage && (
                <div className="flex justify-end">
                  <div className="bg-green-500 text-white px-4 py-2 rounded-lg max-w-xs">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">Enviando...</div>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem sobre commodities..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!isConnected || isSendingMessage}
                  />
                </div>
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <FaceSmileIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || !isConnected || isSendingMessage}
                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Enviar mensagem"
                >
                  {isSendingMessage ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Status de conexão no input */}
              {!isConnected && (
                <div className="text-xs text-red-500 mt-2 text-center">
                  WhatsApp desconectado - não é possível enviar mensagens
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <PhoneIcon className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sistema Preditivo Royal - WhatsApp
              </h3>
              <p className="text-gray-500 mb-2">
                Selecione uma conversa para começar a interagir
              </p>
              <p className="text-sm text-gray-400">
                🌾 Especializado em commodities agrícolas
              </p>
              
              {/* Status da conexão */}
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm">
                    {isConnected ? 
                      `${filteredChats.length} conversas disponíveis` : 
                      'WhatsApp desconectado'
                    }
                  </span>
                </div>
                
                {syncError && (
                  <div className="mt-2 text-xs text-red-600">
                    {syncError}
                  </div>
                )}
                
                {lastSync && isConnected && (
                  <div className="mt-1 text-xs text-gray-500">
                    Última sync: {lastSync.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInterface;