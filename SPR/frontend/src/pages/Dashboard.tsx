import React, { useState } from 'react';
import DashboardMetrics from '../components/Dashboard/DashboardMetrics';
import CommodityChart from '../components/Dashboard/CommodityChart';
import CommodityIcon from '../components/Common/CommodityIcons';
import { useDashboardData } from '../hooks/useDashboardData';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

// Dados reais das commodities coletados de noticiasagricolas.com.br e outras fontes
const realCommodityData = {
  // Preços em reais por saca/arroba conforme especificado nas fontes
  soja: {
    price: 130.00, // R$/60kg - Fob Abelardo Luz/SC (Safras & Mercado)
    variation: 0.04, // % - B3
    unit: 'R$/60kg',
    source: 'Safras & Mercado'
  },
  milho: {
    price: 63.19, // R$/60kg - Indicador CEPEA/ESALQ
    variation: -0.25, // %
    unit: 'R$/60kg',
    source: 'CEPEA/ESALQ'
  },
  algodao: {
    price: 66.11, // centavos/libra - NYBOT
    variation: -0.38, // %
    unit: '¢/lb',
    source: 'NYBOT'
  },
  boi: {
    price: 305.00, // R$/arroba - CEPEA
    variation: -0.20, // %
    unit: 'R$/@',
    source: 'CEPEA'
  },
  dolar: {
    price: 5.56, // R$/USD - Banco Central
    variation: 0.95, // %
    unit: 'R$/USD',
    source: 'Banco Central'
  }
};

// Notícias/chamadas específicas para cada commodity com conteúdo completo
const commodityNews = {
  soja: {
    title: "Soja: Safra 2024/25 pode bater recorde",
    summary: "Conab projeta produção de 166 milhões de toneladas com clima favorável no Centro-Oeste",
    fullContent: `
      <h3>Safra de Soja 2024/25 Pode Atingir Recorde Histórico</h3>
      
      <p>A Companhia Nacional de Abastecimento (Conab) divulgou hoje suas projeções para a safra 2024/25 de soja, indicando a possibilidade de um novo recorde na produção brasileira.</p>
      
      <h4>Principais Destaques:</h4>
      <ul>
        <li><strong>Produção Estimada:</strong> 166 milhões de toneladas</li>
        <li><strong>Crescimento:</strong> 12% em relação à safra anterior</li>
        <li><strong>Área Plantada:</strong> 45,2 milhões de hectares</li>
        <li><strong>Produtividade:</strong> 3.670 kg/ha</li>
      </ul>
      
      <h4>Fatores Favoráveis:</h4>
      <p>O clima favorável no Centro-Oeste, principal região produtora, tem contribuído para o desenvolvimento das culturas. As chuvas regulares e temperaturas adequadas criaram condições ideais para o crescimento da soja.</p>
      
      <h4>Impacto no Mercado:</h4>
      <p>A expectativa de safra recorde pode pressionar os preços no curto prazo, mas a forte demanda internacional, especialmente da China, deve sustentar as cotações em patamares atrativos para os produtores.</p>
      
      <h4>Regiões em Destaque:</h4>
      <ul>
        <li>Mato Grosso: 38,5 milhões de toneladas</li>
        <li>Paraná: 22,1 milhões de toneladas</li>
        <li>Rio Grande do Sul: 21,8 milhões de toneladas</li>
      </ul>
    `,
    impact: "positive",
    priority: "high",
    source: "Conab",
    date: new Date('2025-07-10'),
    price: realCommodityData.soja.price,
    variation: realCommodityData.soja.variation,
    unit: realCommodityData.soja.unit
  },
  milho: {
    title: "Milho: Demanda forte impulsiona preços",
    summary: "Exportações brasileiras crescem 15% e sustentam cotações em alta no mercado interno",
    fullContent: `
      <h3>Demanda Forte Impulsiona Preços do Milho</h3>
      
      <p>O mercado de milho brasileiro registra forte alta nas cotações, impulsionado pelo crescimento das exportações e demanda interna aquecida.</p>
      
      <h4>Dados de Exportação:</h4>
      <ul>
        <li><strong>Crescimento:</strong> 15% em relação ao mesmo período do ano anterior</li>
        <li><strong>Volume:</strong> 2,8 milhões de toneladas no mês</li>
        <li><strong>Principais Destinos:</strong> Irã, Vietnã e Coreia do Sul</li>
      </ul>
      
      <h4>Cenário Interno:</h4>
      <p>A demanda interna permanece robusta, especialmente do setor de proteína animal. A avicultura e suinocultura mantêm consumo elevado, sustentando os preços domésticos.</p>
      
      <h4>Perspectivas:</h4>
      <p>Analistas projetam manutenção dos preços em patamares elevados nos próximos meses, com a segunda safra (safrinha) apresentando condições favoráveis de desenvolvimento.</p>
      
      <h4>Fatores de Atenção:</h4>
      <ul>
        <li>Competição com soja por área de plantio</li>
        <li>Custos logísticos elevados</li>
        <li>Variações cambiais</li>
      </ul>
    `,
    impact: "positive", 
    priority: "medium",
    source: "CEPEA/ESALQ",
    date: new Date('2025-07-09'),
    price: realCommodityData.milho.price,
    variation: realCommodityData.milho.variation,
    unit: realCommodityData.milho.unit
  },
  algodao: {
    title: "Algodão: Pressão da safra americana",
    summary: "USDA eleva estimativa de produção dos EUA, pressionando preços globais da pluma",
    fullContent: `
      <h3>Algodão Sob Pressão da Safra Americana</h3>
      
      <p>O Departamento de Agricultura dos Estados Unidos (USDA) revisou para cima suas estimativas de produção de algodão, criando pressão sobre os preços globais da fibra.</p>
      
      <h4>Revisões do USDA:</h4>
      <ul>
        <li><strong>Produção EUA:</strong> 14,2 milhões de fardos (alta de 300 mil fardos)</li>
        <li><strong>Produção Mundial:</strong> 118,5 milhões de fardos</li>
        <li><strong>Exportações EUA:</strong> 12,5 milhões de fardos</li>
      </ul>
      
      <h4>Impacto nos Preços:</h4>
      <p>A elevação das estimativas americanas pressiona os preços globais, com reflexos diretos nos contratos futuros da NYBOT. A maior oferta esperada reduz as tensões de abastecimento.</p>
      
      <h4>Cenário Brasileiro:</h4>
      <p>O Brasil, segundo maior produtor mundial, deve manter produção estável em torno de 2,8 milhões de toneladas. A competitividade brasileira permanece favorável devido ao câmbio.</p>
      
      <h4>Fatores de Suporte:</h4>
      <ul>
        <li>Demanda têxtil em recuperação</li>
        <li>Estoques ainda em níveis baixos</li>
        <li>Custos de produção elevados</li>
      </ul>
    `,
    impact: "negative",
    priority: "medium",
    source: "NYBOT",
    date: new Date('2025-07-08'),
    price: realCommodityData.algodao.price,
    variation: realCommodityData.algodao.variation,
    unit: realCommodityData.algodao.unit
  },
  boi: {
    title: "Boi Gordo: Frigoríficos elevam ofertas",
    summary: "Demanda aquecida no mercado interno e exportações sustentam valorização da arroba",
    fullContent: `
      <h3>Boi Gordo: Frigoríficos Elevam Ofertas</h3>
      
      <p>O mercado de boi gordo registra forte valorização, com frigoríficos elevando suas ofertas em resposta à demanda aquecida tanto no mercado interno quanto externo.</p>
      
      <h4>Movimento de Preços:</h4>
      <ul>
        <li><strong>São Paulo:</strong> R$ 305,00/@</li>
        <li><strong>Mato Grosso:</strong> R$ 298,00/@</li>
        <li><strong>Goiás:</strong> R$ 302,00/@</li>
        <li><strong>Minas Gerais:</strong> R$ 307,00/@</li>
      </ul>
      
      <h4>Fatores de Alta:</h4>
      <p>A demanda interna permanece robusta, impulsionada pela melhora no poder de compra e preferência do consumidor por proteína bovina. Simultaneamente, as exportações mantêm ritmo acelerado.</p>
      
      <h4>Exportações:</h4>
      <ul>
        <li>China: principal destino (35% do total)</li>
        <li>Estados Unidos: mercado em expansão</li>
        <li>União Europeia: demanda estável</li>
      </ul>
      
      <h4>Perspectivas:</h4>
      <p>Analistas projetam manutenção dos preços em patamares elevados, com a oferta de animais terminados ainda limitada e demanda sustentada.</p>
      
      <h4>Desafios:</h4>
      <ul>
        <li>Custos de produção elevados</li>
        <li>Questões sanitárias</li>
        <li>Pressões ambientais</li>
      </ul>
    `,
    impact: "positive",
    priority: "medium", 
    source: "CEPEA",
    date: new Date('2025-07-07'),
    price: realCommodityData.boi.price,
    variation: realCommodityData.boi.variation,
    unit: realCommodityData.boi.unit
  },
  dolar: {
    title: "Dólar: Cenário externo favorece alta",
    summary: "Fed mantém juros altos e tensões geopolíticas pressionam moeda americana para cima",
    fullContent: `
      <h3>Dólar: Cenário Externo Favorece Alta</h3>
      
      <p>O dólar americano mantém trajetória de alta frente ao real, sustentado por fatores externos que fortalecem a moeda americana no cenário global.</p>
      
      <h4>Fatores de Alta:</h4>
      <ul>
        <li><strong>Fed:</strong> Manutenção de juros em patamares elevados</li>
        <li><strong>Geopolítica:</strong> Tensões internacionais favorecem ativos seguros</li>
        <li><strong>Economia:</strong> Dados robustos dos EUA</li>
      </ul>
      
      <h4>Impacto no Agronegócio:</h4>
      <p>A alta do dólar beneficia diretamente os exportadores de commodities agrícolas, melhorando a competitividade dos produtos brasileiros no mercado internacional.</p>
      
      <h4>Cenário Doméstico:</h4>
      <ul>
        <li>Política fiscal em discussão</li>
        <li>Selic em patamar elevado</li>
        <li>Inflação controlada</li>
      </ul>
      
      <h4>Perspectivas:</h4>
      <p>Analistas projetam manutenção do dólar em patamares elevados no curto prazo, com possível volatilidade em função de decisões de política monetária.</p>
      
      <h4>Impactos Setoriais:</h4>
      <ul>
        <li><strong>Exportadores:</strong> Beneficiados pela alta</li>
        <li><strong>Importadores:</strong> Custos elevados</li>
        <li><strong>Insumos:</strong> Pressão sobre fertilizantes</li>
      </ul>
    `,
    impact: "positive",
    priority: "high",
    source: "Banco Central",
    date: new Date('2025-07-10'),
    price: realCommodityData.dolar.price,
    variation: realCommodityData.dolar.variation,
    unit: realCommodityData.dolar.unit
  }
};

// Notícias importantes simuladas
const importantNews = [
  {
    id: 1,
    title: "Safra de soja 2024/25 pode atingir recorde de 166 milhões de toneladas",
    summary: "Conab projeta aumento de 12% na produção de soja para a próxima safra devido às condições climáticas favoráveis.",
    source: "Conab",
    date: new Date('2025-07-10'),
    priority: 'high',
    category: 'soja'
  },
  {
    id: 2,
    title: "Preço do milho sobe 3% após redução nas estimativas de produção dos EUA",
    summary: "USDA reduziu projeção de safra americana, impactando preços globais da commodity.",
    source: "Reuters",
    date: new Date('2025-07-09'),
    priority: 'medium',
    category: 'milho'
  },
  {
    id: 3,
    title: "Dólar atinge maior patamar em 6 meses afetando exportações",
    summary: "Alta do dólar beneficia exportadores de commodities, mas preocupa importadores de insumos.",
    source: "Valor Econômico",
    date: new Date('2025-07-08'),
    priority: 'high',
    category: 'dolar'
  },
  {
    id: 4,
    title: "Boi gordo: frigoríficos aumentam oferta de preços em São Paulo",
    summary: "Arroba do boi gordo registra alta de 2% na semana em SP com demanda aquecida.",
    source: "Scot Consultoria",
    date: new Date('2025-07-07'),
    priority: 'medium',
    category: 'boi'
  }
];

// Eventos da agenda simulados
const calendarEvents = [
  {
    id: 1,
    title: "Reunião mensal - Análise de mercado",
    description: "Revisão dos preços e tendências das commodities agrícolas",
    date: new Date('2025-07-15T09:00:00'),
    type: 'meeting',
    attendees: ['equipe@royalnegociosagricolas.com.br'],
    location: 'Sala de reuniões',
    whatsappNotification: true,
    emailNotification: true
  },
  {
    id: 2,
    title: "Webinar: Perspectivas para safra 2024/25",
    description: "Apresentação das projeções para a próxima safra de soja e milho",
    date: new Date('2025-07-18T14:00:00'),
    type: 'webinar',
    attendees: ['clientes@royalnegociosagricolas.com.br'],
    location: 'Online',
    whatsappNotification: true,
    emailNotification: true
  },
  {
    id: 3,
    title: "Relatório semanal de preços",
    description: "Envio automático do relatório de preços das commodities",
    date: new Date('2025-07-11T08:00:00'),
    type: 'report',
    attendees: ['clientes@royalnegociosagricolas.com.br'],
    location: 'Email/WhatsApp',
    whatsappNotification: true,
    emailNotification: true
  }
];

const Dashboard: React.FC = () => {
  const { data: dashboardData } = useDashboardData();
  const { 
    isAuthenticated: isGoogleCalendarAuth, 
    isLoading: isGoogleCalendarLoading,
    events: googleCalendarEvents,
    error: googleCalendarError,
    authenticate: authenticateGoogleCalendar,
    disconnect: disconnectGoogleCalendar,
    syncEvents: syncGoogleCalendarEvents,
    createEvent: createGoogleCalendarEvent
  } = useGoogleCalendar();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'news' | 'calendar'>('dashboard');
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  const handleNewsClick = (newsKey: string) => {
    setSelectedNews(commodityNews[newsKey as keyof typeof commodityNews]);
    setShowNewsModal(true);
  };

  const closeNewsModal = () => {
    setShowNewsModal(false);
    setSelectedNews(null);
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      if (isGoogleCalendarAuth) {
        await createGoogleCalendarEvent(eventData);
      }
      setShowCreateEventModal(false);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    }
  };

  const renderDashboardTab = () => (
    <>
      {/* Notícias das Commodities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Chamadas do Mercado</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Object.entries(commodityNews).map(([key, news]) => (
            <div 
              key={key} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 commodity-card content-over-watermark cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleNewsClick(key)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 capitalize flex items-center">
                  <CommodityIcon commodity={key} size={20} className="mr-2" />
                  <span>
                    {key === 'algodao' ? 'Algodão' : 
                     key === 'dolar' ? 'Dólar' : key}
                  </span>
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  news.impact === 'positive' 
                    ? 'bg-green-100 text-green-800' 
                    : news.impact === 'negative'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {news.impact === 'positive' ? '📈 Alta' : 
                   news.impact === 'negative' ? '📉 Baixa' : '➡️ Neutro'}
                </span>
              </div>
              
              <h4 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2">
                {news.title}
              </h4>
              
              <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                {news.summary}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>📰 {news.source}</span>
                <span>{news.date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}</span>
              </div>
              
              {/* Cotação resumida */}
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {news.price.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    news.variation >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {news.variation >= 0 ? '+' : ''}{news.variation.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">{news.unit}</div>
              </div>
              
              {/* Indicador de clique */}
              <div className="mt-2 text-xs text-blue-600 font-medium text-center">
                Clique para ler mais
              </div>
            </div>
          ))}
        </div>
        
        {/* Gráfico Unificado */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 content-over-watermark">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gráfico de Linhas (Últimos 30 dias)</h3>
          <div className="h-80">
            <CommodityChart data={realCommodityData} />
          </div>
        </div>
      </div>

      {/* Métricas do WhatsApp */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Métricas do WhatsApp</h2>
        <DashboardMetrics 
          metrics={{
            totalMessages: dashboardData.totalMessages,
            totalContacts: dashboardData.totalContacts,
            activeChats: dashboardData.activeChats,
            responseTime: dashboardData.responseTime,
            deliveryRate: dashboardData.deliveryRate,
            readRate: dashboardData.readRate
          }}
        />
      </div>

      {/* Status da Conexão */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status da Conexão</h3>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              dashboardData.connectionStatus === 'connected' ? 'text-green-600' :
              dashboardData.connectionStatus === 'connecting' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                dashboardData.connectionStatus === 'connected' ? 'bg-green-500' :
                dashboardData.connectionStatus === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <span className="font-medium">
                {dashboardData.connectionStatus === 'connected' ? 'Conectado' :
                 dashboardData.connectionStatus === 'connecting' ? 'Conectando...' :
                 'Desconectado'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Última atualização: {dashboardData.lastUpdate.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  const renderNewsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Notícias Importantes</h2>
      
      {/* Filtros */}
      <div className="flex space-x-4">
        <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">Todas as categorias</option>
          <option value="soja">Soja</option>
          <option value="milho">Milho</option>
          <option value="algodao">Algodão</option>
          <option value="boi">Boi</option>
          <option value="dolar">Dólar</option>
        </select>
        <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">Todas as prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      {/* Lista de notícias */}
      <div className="space-y-4">
        {importantNews.map((news) => (
          <div key={news.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    news.priority === 'high' ? 'bg-red-100 text-red-800' :
                    news.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {news.priority === 'high' ? '🔴 Alta' :
                     news.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {news.category === 'algodao' ? 'Algodão' : news.category}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{news.title}</h3>
                <p className="text-gray-600 mb-3">{news.summary}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📰 {news.source}</span>
                  <span>📅 {news.date.toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <button className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
                Ler mais
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCalendarTab = () => {
    // Combinar eventos locais com eventos do Google Calendar
    const allEvents = [
      ...calendarEvents,
      ...googleCalendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: event.start,
        type: 'google' as const,
        attendees: event.attendees || [],
        location: event.location || '',
        whatsappNotification: false,
        emailNotification: false
      }))
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Agenda</h2>
          <button 
            onClick={() => setShowCreateEventModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Novo Evento
          </button>
        </div>

        {/* Integração Google Calendar */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              <span className="text-blue-800 font-medium">
                Integração Google Calendar
              </span>
              {isGoogleCalendarAuth && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Conectado
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              {!isGoogleCalendarAuth ? (
                <button 
                  onClick={authenticateGoogleCalendar}
                  disabled={isGoogleCalendarLoading}
                  className="text-blue-600 text-sm underline hover:text-blue-800 disabled:opacity-50"
                >
                  {isGoogleCalendarLoading ? 'Conectando...' : 'Conectar'}
                </button>
              ) : (
                <>
                  <button 
                    onClick={syncGoogleCalendarEvents}
                    disabled={isGoogleCalendarLoading}
                    className="text-blue-600 text-sm underline hover:text-blue-800 disabled:opacity-50"
                  >
                    {isGoogleCalendarLoading ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
                  <button 
                    onClick={disconnectGoogleCalendar}
                    className="text-red-600 text-sm underline hover:text-red-800"
                  >
                    Desconectar
                  </button>
                </>
              )}
            </div>
          </div>
          
          {googleCalendarError && (
            <div className="mt-2 text-sm text-red-600">
              {googleCalendarError}
            </div>
          )}
          
          {isGoogleCalendarAuth && (
            <div className="mt-2 text-sm text-blue-700">
              {googleCalendarEvents.length} eventos sincronizados do Google Calendar
            </div>
          )}
        </div>

        {/* Lista de eventos */}
        <div className="space-y-4">
          {allEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                      event.type === 'webinar' ? 'bg-purple-100 text-purple-800' :
                      event.type === 'google' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.type === 'meeting' ? '👥 Reunião' :
                       event.type === 'webinar' ? '🎥 Webinar' :
                       event.type === 'google' ? '📅 Google Calendar' :
                       '📊 Relatório'}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-3">{event.description}</p>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>📅 {event.date.toLocaleDateString('pt-BR')}</span>
                      <span>🕐 {event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>📍 {event.location}</span>
                    </div>
                    {event.type !== 'google' && (
                      <div className="flex items-center space-x-4">
                        {event.emailNotification && (
                          <span className="flex items-center space-x-1">
                            <span>📧</span>
                            <span>Email</span>
                          </span>
                        )}
                        {event.whatsappNotification && (
                          <span className="flex items-center space-x-1">
                            <span>📱</span>
                            <span>WhatsApp</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex space-x-2">
                  {event.type !== 'google' && (
                    <>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Editar
                      </button>
                      <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Configurações de notificação */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Notificação</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Enviar notificações por email</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Enviar notificações via WhatsApp</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Lembrete 1 hora antes do evento</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="ml-2 text-sm text-gray-700">Lembrete 1 dia antes do evento</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              <span className="ml-2 text-sm text-gray-700">Sincronizar automaticamente com Google Calendar</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard SPR</h1>
          <p className="mt-2 text-gray-600">Sistema Preditivo Royal - Monitoramento em tempo real</p>
        </div>

        {/* Navegação por abas */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`${
                activeTab === 'news'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              📰 Notícias
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              📅 Agenda
            </button>
          </nav>
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'news' && renderNewsTab()}
        {activeTab === 'calendar' && renderCalendarTab()}

        {/* Rodapé com informações do SPR */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sistema Preditivo Royal (SPR)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Monitoramento e previsão de preços das principais commodities agrícolas brasileiras
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <span className="flex items-center">
                <CommodityIcon commodity="soja" size={16} className="mr-1" />
                Soja
              </span>
              <span className="flex items-center">
                <CommodityIcon commodity="milho" size={16} className="mr-1" />
                Milho
              </span>
              <span className="flex items-center">
                <CommodityIcon commodity="algodao" size={16} className="mr-1" />
                Algodão
              </span>
              <span className="flex items-center">
                <CommodityIcon commodity="boi" size={16} className="mr-1" />
                Boi
              </span>
              <span className="flex items-center">
                <CommodityIcon commodity="dolar" size={16} className="mr-1" />
                Dólar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Notícias */}
      {showNewsModal && selectedNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedNews.impact === 'positive' 
                    ? 'bg-green-100 text-green-800' 
                    : selectedNews.impact === 'negative'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedNews.impact === 'positive' ? '📈 Alta' : 
                   selectedNews.impact === 'negative' ? '📉 Baixa' : '➡️ Neutro'}
                </span>
                <span className="text-sm text-gray-500">
                  📰 {selectedNews.source} • {selectedNews.date.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button 
                onClick={closeNewsModal}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedNews.fullContent }} />
              </div>
              
              {/* Cotação atual */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Cotação Atual</h4>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {selectedNews.price.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })} {selectedNews.unit}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    selectedNews.variation >= 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedNews.variation >= 0 ? '+' : ''}{selectedNews.variation.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Evento */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Novo Evento</h3>
              <button 
                onClick={() => setShowCreateEventModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const eventData = {
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                start: new Date(formData.get('datetime') as string),
                end: new Date(new Date(formData.get('datetime') as string).getTime() + 60 * 60 * 1000), // 1 hora depois
                location: formData.get('location') as string,
                attendees: (formData.get('attendees') as string).split(',').map(email => email.trim()).filter(Boolean)
              };
              handleCreateEvent(eventData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Título do evento"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descrição do evento"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data e Hora
                  </label>
                  <input
                    type="datetime-local"
                    name="datetime"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Local
                  </label>
                  <input
                    type="text"
                    name="location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Local do evento"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Participantes (emails separados por vírgula)
                  </label>
                  <input
                    type="text"
                    name="attendees"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email1@exemplo.com, email2@exemplo.com"
                  />
                </div>
                
                {isGoogleCalendarAuth && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-sm text-green-800">
                        Evento será criado no Google Calendar
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Criar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 