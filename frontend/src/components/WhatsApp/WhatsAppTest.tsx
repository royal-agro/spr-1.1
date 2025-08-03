import React, { useState, useEffect } from 'react';

const WhatsAppTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Carregando...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🧪 Testando conexão com backend...');
        const response = await fetch('http://localhost:3003/api/status');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Backend respondendo:', data);
        setStatus('Backend conectado!');
      } catch (err) {
        console.error('❌ Erro na conexão:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setStatus('Erro de conexão');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Teste WhatsApp</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded">
          <p className="text-sm font-medium">Status:</p>
          <p className="text-lg">{status}</p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-medium text-red-800">Erro:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Recarregar
        </button>
      </div>
    </div>
  );
};

export default WhatsAppTest; 