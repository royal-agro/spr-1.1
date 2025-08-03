import React, { useState, useEffect, useRef } from 'react';
import { 
  MagnifyingGlassIcon, 
  PhoneIcon, 
  VideoCameraIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  ArrowPathIcon,
  UserIcon,
  DocumentIcon,
  ChartBarIcon,
  PhotoIcon,
  MicrophoneIcon,
  MapPinIcon,
  XMarkIcon
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
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

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

  // Fechar menu de anexos quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrar chats baseado na busca
  const filteredChats = chats.filter(chat =>
    chat.contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
    chat.contact.phone.includes(searchText)
  );

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

  // Carregar mensagens automaticamente quando uma conversa for selecionada
  useEffect(() => {
    if (selectedChat && selectedChatData && selectedChatData.messages.length === 0 && !isLoadingMessages) {
      console.log(`🔄 Carregamento automático de mensagens para ${selectedChatData.contact.name}`);
      handleSelectChat(selectedChat);
    }
  }, [selectedChat, selectedChatData?.messages.length]);

  // Marcar mensagens como lidas quando visualizar a conversa
  useEffect(() => {
    if (selectedChatData && selectedChatData.messages.length > 0) {
      // Marcar mensagens como lidas após um pequeno delay
      const timer = setTimeout(() => {
        markAsRead(selectedChatData.id);
        console.log(`👁️ Marcando ${selectedChatData.messages.length} mensagens como visualizadas`);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [selectedChatData?.messages.length, selectedChatData?.id]);

  // Scroll automático para o final das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChatData?.messages]);

  // Monitorar mudanças nas mensagens para debug
  useEffect(() => {
    if (selectedChatData) {
      console.log(`📊 Chat ${selectedChatData.contact.name}: ${selectedChatData.messages.length} mensagens`);
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
      
      // Recarregar mensagens após envio para garantir sincronização
      setTimeout(async () => {
        try {
          console.log('🔄 Recarregando mensagens após envio...');
          await syncChatMessages(selectedChat);
        } catch (error) {
          console.error('⚠️ Erro ao recarregar mensagens:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      // A mensagem de erro já é tratada no hook
      setMessageText(messageToSend); // Restaurar texto se falhou
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Função para selecionar chat e carregar mensagens automaticamente
  const handleSelectChat = async (chatId: string) => {
    if (selectedChat === chatId) return; // Já selecionado
    
    setSelectedChat(chatId);
    setIsLoadingMessages(true);
    
    try {
      // Marcar como lido ANTES de carregar mensagens
      markAsRead(chatId);
      console.log(`📖 Marcando chat ${chatId} como lido`);
      
      // SEMPRE carregar mensagens do servidor automaticamente
      const chat = chats.find(c => c.id === chatId);
      console.log(`🔄 Carregando mensagens automaticamente para ${chat?.contact.name || chatId}...`);
      
      // Tentar carregar mensagens com retry
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await syncChatMessages(chatId);
          console.log(`✅ Mensagens carregadas automaticamente para ${chatId} (tentativa ${retryCount + 1})`);
          break;
        } catch (error) {
          retryCount++;
          console.error(`❌ Erro ao carregar mensagens automaticamente (tentativa ${retryCount}):`, error);
          
          if (retryCount >= maxRetries) {
            console.error(`❌ Falha ao carregar mensagens após ${maxRetries} tentativas`);
            throw error;
          }
          
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      // Marcar mensagens como lidas após carregar
      setTimeout(() => {
        markAsRead(chatId);
        console.log(`✅ Mensagens marcadas como lidas para ${chatId}`);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao carregar mensagens automaticamente:', error);
      setError('Erro ao carregar mensagens automaticamente. Tente novamente.');
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

  // Funções para ações de anexo
  const handleAttachmentAction = (action: string) => {
    console.log(`📎 Ação de anexo: ${action}`);
    setShowAttachmentMenu(false);
    
    // Implementar ações específicas
    switch (action) {
      case 'contact':
        handleSendContact();
        break;
      case 'document':
        handleSendDocument();
        break;
      case 'poll':
        handleSendPoll();
        break;
      case 'ai-image':
        handleSendAIImage();
        break;
      case 'audio':
        handleSendAudio();
        break;
      case 'location':
        handleSendLocation();
        break;
    }
  };

  const handleSendContact = () => {
    if (!selectedChat) return;
    console.log('👤 Enviando contato...');
    // Implementar envio de contato
    alert('Funcionalidade de envio de contato será implementada');
  };

  const handleSendDocument = () => {
    if (!selectedChat) return;
    console.log('📄 Enviando documento...');
    // Implementar envio de documento
    alert('Funcionalidade de envio de documento será implementada');
  };

  const handleSendPoll = () => {
    if (!selectedChat) return;
    console.log('📊 Enviando enquete...');
    // Implementar envio de enquete
    alert('Funcionalidade de enquete será implementada');
  };

  const handleSendAIImage = () => {
    if (!selectedChat) return;
    console.log('🤖 Enviando imagem de IA...');
    // Implementar envio de imagem de IA
    alert('Funcionalidade de imagem de IA será implementada');
  };

  const handleSendAudio = () => {
    if (!selectedChat) return;
    console.log('🎤 Enviando áudio...');
    // Implementar envio de áudio
    alert('Funcionalidade de áudio será implementada');
  };

  const handleSendLocation = () => {
    if (!selectedChat) return;
    console.log('📍 Enviando localização...');
    // Implementar envio de localização
    alert('Funcionalidade de localização será implementada');
  };

  // Funções para ações de contato
  const handleCallContact = () => {
    if (!selectedChatData) return;
    console.log(`📞 Ligando para ${selectedChatData.contact.name}...`);
    // Implementar chamada
    alert(`Ligando para ${selectedChatData.contact.name} (${selectedChatData.contact.phone})`);
  };

  const handleVideoCall = () => {
    if (!selectedChatData) return;
    console.log(`📹 Videochamada para ${selectedChatData.contact.name}...`);
    // Implementar videochamada
    alert(`Iniciando videochamada com ${selectedChatData.contact.name}`);
  };

  const handleShowContactInfo = () => {
    setShowContactInfo(!showContactInfo);
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
      </div>
    );
  };

  // Componente para mensagens de status
  const StatusMessage = ({ message, type }: { message: string; type: 'info' | 'error' | 'success' }) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      success: 'bg-green-100 text-green-800 border-green-200'
    };

    return (
      <div className={`p-3 rounded-lg border ${colors[type]} mb-4`}>
        <p className="text-sm">{message}</p>
      </div>
    );
  };

  // Componente para menu de anexos
  const AttachmentMenu = () => {
    if (!showAttachmentMenu) return null;

    const attachmentOptions = [
      { id: 'contact', label: 'Enviar Contato', icon: UserIcon, color: 'text-blue-600' },
      { id: 'document', label: 'Documento', icon: DocumentIcon, color: 'text-gray-600' },
      { id: 'poll', label: 'Enquete', icon: ChartBarIcon, color: 'text-purple-600' },
      { id: 'ai-image', label: 'Imagens de I.A.', icon: PhotoIcon, color: 'text-green-600' },
      { id: 'audio', label: 'Áudio', icon: MicrophoneIcon, color: 'text-orange-600' },
      { id: 'location', label: 'Localização', icon: MapPinIcon, color: 'text-red-600' }
    ];

    return (
      <div 
        ref={attachmentMenuRef}
        className="absolute bottom-16 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[200px]"
      >
        {attachmentOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleAttachmentAction(option.id)}
            className="w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors"
          >
            <option.icon className={`h-5 w-5 ${option.color}`} />
            <span className="text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Componente para informações do contato
  const ContactInfoModal = () => {
    if (!showContactInfo || !selectedChatData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Informações do Contato</h3>
            <button
              onClick={() => setShowContactInfo(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                <span className="text-lg font-bold">
                  {selectedChatData.contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-semibold">{selectedChatData.contact.name}</h4>
                <p className="text-sm text-gray-500">{selectedChatData.contact.phone}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleCallContact}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <PhoneIcon className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Ligar</span>
                </button>
                <button
                  onClick={handleVideoCall}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <VideoCameraIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Videochamada</span>
                </button>
              </div>
            </div>
            
            {selectedChatData.contact.tags && selectedChatData.contact.tags.length > 0 && (
              <div className="border-t pt-4">
                <h5 className="text-sm font-medium mb-2">Tags</h5>
                <div className="flex flex-wrap gap-1">
                  {selectedChatData.contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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
                  onClick={handleCallContact}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Ligar"
                >
                  <PhoneIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleVideoCall}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Videochamada"
                >
                  <VideoCameraIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleShowContactInfo}
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
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Carregando mensagens automaticamente...</p>
                    <p className="text-xs text-gray-400 mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              )}
              
              {selectedChatData.messages.length === 0 && !isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-sm mb-2">Nenhuma mensagem nesta conversa</p>
                    <p className="text-xs text-gray-400">
                      As mensagens serão carregadas automaticamente
                    </p>
                    {syncError && (
                      <button
                        onClick={() => syncChatMessages(selectedChatData.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                        disabled={isLoadingMessages}
                      >
                        Tentar carregar novamente
                      </button>
                    )}
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
                            {message.status === 'sent' && '✓'}
                            {message.status === 'delivered' && '✓✓'}
                            {message.status === 'read' && (
                              <span className="text-blue-400">✓✓</span>
                            )}
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
            <div className="border-t border-gray-200 p-4 relative">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  title="Anexar arquivo"
                >
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
      <AttachmentMenu />
      <ContactInfoModal />
    </div>
  );
};

export default WhatsAppInterface;