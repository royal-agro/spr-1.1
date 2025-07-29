import React, { useState } from 'react';
import { 
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: string[];
  type: 'meeting' | 'webinar' | 'reminder';
}

const AgendaPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      title: 'Reunião com Cliente Soja',
      description: 'Discussão sobre preços e cotações de soja para safra 2024/25',
      date: new Date('2025-07-28T10:00:00'),
      location: 'Escritório Royal',
      attendees: ['João Silva', 'Maria Santos'],
      type: 'meeting'
    },
    {
      id: '2',
      title: 'Webinar Mercado Milho',
      description: 'Análise técnica e fundamentalista do mercado de milho',
      date: new Date('2025-07-29T14:00:00'),
      location: 'Online',
      attendees: ['Equipe Técnica'],
      type: 'webinar'
    },
    {
      id: '3',
      title: 'Lembrete: Relatório Semanal',
      description: 'Preparar relatório semanal de commodities',
      date: new Date('2025-07-30T09:00:00'),
      location: 'Escritório',
      attendees: ['Analistas'],
      type: 'reminder'
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    attendees: '',
    type: 'meeting' as Event['type']
  });

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;

    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: new Date(`${newEvent.date}T${newEvent.time}`),
      location: newEvent.location,
      attendees: newEvent.attendees.split(',').map(a => a.trim()).filter(Boolean),
      type: newEvent.type
    };

    setEvents([...events, event]);
    setShowCreateModal(false);
    setNewEvent({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      attendees: '',
      type: 'meeting'
    });
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return <UserGroupIcon className="w-5 h-5 text-blue-600" />;
      case 'webinar':
        return <CalendarIcon className="w-5 h-5 text-purple-600" />;
      case 'reminder':
        return <ClockIcon className="w-5 h-5 text-orange-600" />;
      default:
        return <CalendarIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-50 border-blue-200';
      case 'webinar':
        return 'bg-purple-50 border-purple-200';
      case 'reminder':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📅 Agenda</h1>
            <p className="text-gray-600 mt-1">
              Gerencie seus eventos e compromissos
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Eventos */}
      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum evento agendado</h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro evento para começar a organizar sua agenda
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Criar Evento
            </button>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <div
              key={event.id}
              className={`border rounded-lg p-6 ${getEventColor(event.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getEventIcon(event.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {event.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatDate(event.date)} às {formatTime(event.date)}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.attendees.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <UserGroupIcon className="w-4 h-4" />
                        <span>{event.attendees.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-4 flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Editar
                  </button>
                  <button 
                    onClick={() => deleteEvent(event.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Novo Evento</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título do evento"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição do evento"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Local
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Local do evento"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participantes (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({...newEvent, attendees: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="João Silva, Maria Santos"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value as Event['type']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="meeting">Reunião</option>
                  <option value="webinar">Webinar</option>
                  <option value="reminder">Lembrete</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Criar Evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaPage; 