import React, { useState, useRef } from 'react';
import { 
  MicrophoneIcon, 
  StopIcon, 
  SparklesIcon, 
  PaperAirplaneIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
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

interface APIResponse {
  success: boolean;
  message: string;
  tone: string;
  timestamp: string;
  metadata?: {
    generationId: string;
    length: number;
    wordsCount: number;
  };
}

interface VariationsResponse {
  success: boolean;
  variations: string[];
  originalMessage: string;
  tone: string;
  count: number;
  timestamp: string;
}

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
  const [showVariations, setShowVariations] = useState(false);
  const [messageTone, setMessageTone] = useState<MessageTone>('normal');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [variations, setVariations] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // URL base da API
  const API_BASE_URL = 'http://localhost:3002';

  // Função para limpar mensagens de status
  const clearStatusMessages = () => {
    setTimeout(() => {
      setApiError(null);
      setApiSuccess(null);
    }, 5000);
  };

  // Função para gerar mensagem com IA
  const generateMessage = async () => {
    if (!aiPrompt.trim()) {
      setApiError('Por favor, descreva o que você quer dizer');
      clearStatusMessages();
      return;
    }
    
    setIsGenerating(true);
    setApiError(null);
    setApiSuccess(null);
    
    try {
      console.log('🤖 Enviando prompt para IA:', {
        prompt: aiPrompt,
        tone: messageTone,
        contactName,
        isGroup
      });

      const response = await fetch(`${API_BASE_URL}/api/generate-message`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          tone: messageTone,
          contactName: contactName,
          isGroup: isGroup,
          context: 'whatsapp'
        }),
      });

      const data: APIResponse | { error: string; code: string } = await response.json();

      if (!response.ok) {
        const errorData = data as { error: string; code: string };
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const successData = data as APIResponse;
      
      if (successData.success && successData.message) {
        setMessage(successData.message);
        setAiPrompt('');
        setShowAIHelper(false);
        setApiSuccess('✅ Mensagem gerada com sucesso!');
        console.log('✅ Mensagem gerada:', successData);
      } else {
        throw new Error('Resposta inválida da API');
      }

    } catch (error) {
      console.error('❌ Erro ao gerar mensagem:', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Verificar se é erro de conectividade
      if (errorMessage.includes('fetch')) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3002.';
      }
      
      setApiError(`❌ ${errorMessage}`);
      
      // Fallback para mensagem simples
      const fallbackMessage = generateFallbackMessage();
      setMessage(fallbackMessage);
      setAiPrompt('');
      setShowAIHelper(false);
      setApiError(null);
      setApiSuccess('⚠️ Usando modo offline - mensagem gerada localmente');
      
    } finally {
      setIsGenerating(false);
      clearStatusMessages();
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
    if (promptWords.includes('preço') || promptWords.includes('cotação')) {
      return baseMessage + 'Posso te ajudar com informações sobre preços de commodities.';
    }
    
    return baseMessage + aiPrompt;
  };

  // Função para obter nome do contato baseado no tom
  const getContactName = () => {
    if (!contactName) return 'cliente';
    
    if (messageTone === 'formal') {
      return contactName.includes(' ') 
        ? `Sr./Sra. ${contactName.split(' ')[0]}`
        : `Sr./Sra. ${contactName}`;
    }
    
    return contactName.split(' ')[0]; // Apenas primeiro nome
  };

  // Função para gerar variações da mensagem
  const generateVariations = async () => {
    if (!message.trim()) {
      setApiError('Primeiro gere ou digite uma mensagem');
      clearStatusMessages();
      return;
    }
    
    setIsGenerating(true);
    setApiError(null);
    setApiSuccess(null);
    
    try {
      console.log('🔄 Gerando variações:', {
        originalMessage: message,
        tone: messageTone
      });

      const response = await fetch(`${API_BASE_URL}/api/generate-variations`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          originalMessage: message,
          tone: messageTone,
          count: 3
        }),
      });

      const data: VariationsResponse | { error: string; code: string } = await response.json();

      if (!response.ok) {
        const errorData = data as { error: string; code: string };
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const successData = data as VariationsResponse;
      
      if (successData.success && successData.variations) {
        setVariations(successData.variations);
        setShowVariations(true);
        setApiSuccess('✅ Variações geradas com sucesso!');
        console.log('✅ Variações geradas:', successData);
      } else {
        throw new Error('Resposta inválida da API');
      }

    } catch (error) {
      console.error('❌ Erro ao gerar variações:', error);
      setApiError('❌ Erro ao gerar variações. Tente novamente.');
    } finally {
      setIsGenerating(false);
      clearStatusMessages();
    }
  };

  // Função para testar conectividade da API
  const testAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        setApiSuccess('✅ Backend conectado e funcionando!');
      } else {
        setApiError('❌ Backend não está respondendo corretamente');
      }
    } catch (error) {
      console.error('Erro de conectividade:', error);
      setApiError('❌ Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3002.');
    }
    clearStatusMessages();
  };

  // Função para selecionar variação
  const selectVariation = (variation: string) => {
    setMessage(variation);
    setShowVariations(false);
    setVariations([]);
  };

  // Função para agendar mensagem
  const handleScheduleMessage = () => {
    if (!message.trim()) {
      setApiError('Digite uma mensagem antes de agendar');
      clearStatusMessages();
      return;
    }

    const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduleDateTime <= new Date()) {
      setApiError('Data/hora deve ser futura');
      clearStatusMessages();
      return;
    }

    onScheduleMessage(message, scheduleDateTime);
    setMessage('');
    setScheduleDate('');
    setScheduleTime('');
    setShowScheduler(false);
    setApiSuccess('✅ Mensagem agendada com sucesso!');
    clearStatusMessages();
  };

  // Função para gravar áudio
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
        // Aqui você pode implementar conversão de áudio para texto
        setApiSuccess('✅ Áudio gravado! (Conversão para texto em desenvolvimento)');
        clearStatusMessages();
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      setApiError('❌ Erro ao acessar microfone');
      clearStatusMessages();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Função para enviar mensagem
  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Status Messages */}
      {apiError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {apiError}
        </div>
      )}
      {apiSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {apiSuccess}
        </div>
      )}

      {/* AI Helper Modal */}
      {showAIHelper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🤖 Assistente de IA</h3>
              <button
                onClick={() => setShowAIHelper(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Tom da mensagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tom da mensagem:
                </label>
                <select
                  value={messageTone}
                  onChange={(e) => setMessageTone(e.target.value as MessageTone)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="formal">Formal (Sr./Sra.)</option>
                  <option value="normal">Normal (Olá)</option>
                  <option value="informal">Informal (Oi)</option>
                  <option value="alegre">Alegre (Oi! 😊)</option>
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  O que você quer dizer?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: quero agendar reunião sobre soja"
                  className="w-full p-2 border border-gray-300 rounded-md h-20"
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {aiPrompt.length}/500 caracteres
                </div>
              </div>

              {/* Exemplos */}
              <div className="text-sm text-gray-600">
                <strong>Exemplos:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• "agendar reunião sobre soja"</li>
                  <li>• "cotação do milho hoje"</li>
                  <li>• "agradecer pelo contato"</li>
                  <li>• "proposta comercial"</li>
                </ul>
              </div>

              {/* Botões */}
              <div className="flex space-x-2">
                <button
                  onClick={testAPI}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Testar API
                </button>
                <button
                  onClick={generateMessage}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {isGenerating ? 'Gerando...' : 'Gerar Mensagem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variations Modal */}
      {showVariations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🔄 Variações da Mensagem</h3>
              <button
                onClick={() => setShowVariations(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {variations.map((variation, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => selectVariation(variation)}
                >
                  <div className="text-sm text-gray-600 mb-1">
                    Variação {index + 1}
                  </div>
                  <div className="text-gray-800">{variation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">⏰ Agendar Mensagem</h3>
              <button
                onClick={() => setShowScheduler(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data:
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora:
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <button
                onClick={handleScheduleMessage}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Agendar Mensagem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="text-xs text-gray-500 mt-1">
            {message.length}/1000 caracteres
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          {/* AI Helper Button */}
          <button
            onClick={() => setShowAIHelper(true)}
            className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            title="Assistente de IA"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>

          {/* Variations Button */}
          {message.trim() && (
            <button
              onClick={generateVariations}
              disabled={isGenerating}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              title="Gerar variações"
            >
              🔄
            </button>
          )}

          {/* Record Audio Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded ${
              isRecording 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
          >
            {isRecording ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <MicrophoneIcon className="w-5 h-5" />
            )}
          </button>

          {/* Schedule Button */}
          <button
            onClick={() => setShowScheduler(true)}
            className="p-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            title="Agendar mensagem"
          >
            <ClockIcon className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            title="Enviar mensagem"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageComposer; 