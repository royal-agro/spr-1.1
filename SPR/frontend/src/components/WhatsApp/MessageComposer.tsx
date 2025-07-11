import React, { useState, useRef } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  SparklesIcon, 
  PaperAirplaneIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { WhatsAppContact } from '../../types';

interface MessageComposerProps {
  contacts?: WhatsAppContact[];
  onSendMessage: (message: string, type: 'text' | 'audio') => void;
  onScheduleMessage: (message: string, scheduleTime: Date) => void;
  contactName?: string;
  isGroup?: boolean;
  selectedContacts?: string[];
}

type MessageTone = 'formal' | 'normal' | 'informal' | 'alegre';

const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onScheduleMessage,
  contactName,
  isGroup = false,
  selectedContacts = []
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [messageTone, setMessageTone] = useState<MessageTone>('normal');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Função para gerar mensagem com ChatGPT
  const generateMessage = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          tone: messageTone,
          contactName: contactName,
          isGroup: isGroup,
          context: 'whatsapp'
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar mensagem');
      }

      const data = await response.json();
      setMessage(data.message);
      setAiPrompt('');
      setShowAIHelper(false);
    } catch (error) {
      console.error('Erro ao gerar mensagem:', error);
      // Fallback para mensagem simples
      setMessage(generateFallbackMessage());
    } finally {
      setIsGenerating(false);
    }
  };

  // Função de fallback para gerar mensagem simples
  const generateFallbackMessage = () => {
    const toneMessages = {
      formal: `Prezado(a) ${getContactName()}, espero que esteja bem. `,
      normal: `Olá ${getContactName()}, `,
      informal: `Oi ${getContactName()}, `,
      alegre: `Oi ${getContactName()}! 😊 `
    };

    const baseMessage = toneMessages[messageTone];
    const promptWords = aiPrompt.toLowerCase().split(' ');
    
    if (promptWords.includes('reunião') || promptWords.includes('meeting')) {
      return baseMessage + 'Gostaria de agendar uma reunião para conversarmos melhor.';
    }
    if (promptWords.includes('obrigado') || promptWords.includes('agradec')) {
      return baseMessage + 'Muito obrigado pela atenção!';
    }
    if (promptWords.includes('desculp')) {
      return baseMessage + 'Peço desculpas pelo inconveniente.';
    }
    
    return baseMessage + aiPrompt;
  };

  // Função para obter nome do contato baseado no tom
  const getContactName = () => {
    if (!contactName) return '';
    
    if (messageTone === 'formal') {
      return contactName.includes(' ') 
        ? `Sr./Sra. ${contactName.split(' ')[0]}`
        : `Sr./Sra. ${contactName}`;
    }
    
    return contactName.split(' ')[0]; // Apenas primeiro nome
  };

  // Função para gerar variações da mensagem
  const generateVariations = async () => {
    if (!message.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalMessage: message,
          tone: messageTone,
          count: 3
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar variações');
      }

      const data = await response.json();
      // Mostrar variações em um modal ou dropdown
      console.log('Variações geradas:', data.variations);
    } catch (error) {
      console.error('Erro ao gerar variações:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para iniciar gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        // Converter áudio para texto usando Speech-to-Text
        convertAudioToText(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
    }
  };

  // Função para parar gravação
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Função para converter áudio para texto
  const convertAudioToText = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao converter áudio');
      }

      const data = await response.json();
      setMessage(data.text);
    } catch (error) {
      console.error('Erro ao converter áudio:', error);
      // Fallback: enviar áudio diretamente
      onSendMessage('Mensagem de áudio', 'audio');
    }
  };

  // Função para agendar mensagem
  const handleScheduleMessage = () => {
    if (!message.trim() || !scheduleDate || !scheduleTime) return;
    
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    onScheduleMessage(message, scheduledDateTime);
    setMessage('');
    setScheduleDate('');
    setScheduleTime('');
    setShowScheduler(false);
  };

  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    onSendMessage(message, 'text');
    setMessage('');
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Assistente de IA */}
      {showAIHelper && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-blue-900 flex items-center">
              <SparklesIcon className="h-4 w-4 mr-2" />
              Assistente de IA
            </h3>
            <button
              onClick={() => setShowAIHelper(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tom da mensagem
              </label>
              <select
                value={messageTone}
                onChange={(e) => setMessageTone(e.target.value as MessageTone)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="formal">Formal</option>
                <option value="normal">Normal</option>
                <option value="informal">Informal</option>
                <option value="alegre">Alegre</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Descreva o que você quer dizer
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Quero agendar uma reunião para discutir preços de commodities..."
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 resize-none"
                rows={2}
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={generateMessage}
                disabled={isGenerating || !aiPrompt.trim()}
                className="flex-1 bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? 'Gerando...' : 'Gerar Mensagem'}
              </button>
              {message && (
                <button
                  onClick={generateVariations}
                  disabled={isGenerating}
                  className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded hover:bg-blue-200"
                >
                  Variações
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agendador de mensagens */}
      {showScheduler && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-green-900 flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" />
              Agendar Mensagem
            </h3>
            <button
              onClick={() => setShowScheduler(false)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Hora
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>
          
          <button
            onClick={handleScheduleMessage}
            disabled={!message.trim() || !scheduleDate || !scheduleTime}
            className="w-full mt-3 bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Agendar Mensagem
          </button>
        </div>
      )}

      {/* Área de composição */}
      <div className="flex items-end space-x-3">
        {/* Botões de ação */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAIHelper(!showAIHelper)}
            className={`p-2 rounded-full transition-colors ${
              showAIHelper ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-600'
            }`}
            title="Assistente de IA"
          >
            <SparklesIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className={`p-2 rounded-full transition-colors ${
              showScheduler ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'
            }`}
            title="Agendar mensagem"
          >
            <ClockIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full transition-colors ${
              isRecording ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'
            }`}
            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
          >
            {isRecording ? <StopIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
          </button>
        </div>

        {/* Campo de texto */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          
          {/* Indicador de gravação */}
          {isRecording && (
            <div className="absolute inset-0 bg-red-50 border-2 border-red-300 rounded-lg flex items-center justify-center">
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Gravando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Botão de envio */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Enviar mensagem"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Informações sobre disparos automáticos */}
      {isGroup && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <UserGroupIcon className="h-4 w-4 mr-1" />
          Máximo de 3 disparos por minuto para grupos
        </div>
      )}
    </div>
  );
};

export default MessageComposer; 