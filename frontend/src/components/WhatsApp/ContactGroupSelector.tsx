import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  UserIcon, 
  TagIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { WhatsAppContact } from '../../types';

interface ContactGroup {
  id: string;
  name: string;
  contacts: string[]; // IDs dos contatos
  color: string;
  description?: string;
}

interface ContactGroupSelectorProps {
  contacts: WhatsAppContact[];
  selectedContacts: string[];
  onSelectionChange: (contactIds: string[]) => void;
  onClose: () => void;
  maxSelections?: number;
  maxContacts?: number; // Nova prop para compatibilidade
}

const ContactGroupSelector: React.FC<ContactGroupSelectorProps> = ({
  contacts,
  selectedContacts,
  onSelectionChange,
  onClose,
  maxSelections = 50 // Limite para evitar spam
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');

  // Grupos predefinidos baseados em marcadores do Google Contacts
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([
    {
      id: 'clientes-premium',
      name: 'Clientes Premium',
      contacts: [],
      color: '#F59E0B',
      description: 'Clientes com contratos premium'
    },
    {
      id: 'produtores-soja',
      name: 'Produtores de Soja',
      contacts: [],
      color: '#10B981',
      description: 'Produtores especializados em soja'
    },
    {
      id: 'produtores-milho',
      name: 'Produtores de Milho',
      contacts: [],
      color: '#F59E0B',
      description: 'Produtores especializados em milho'
    },
    {
      id: 'cooperativas',
      name: 'Cooperativas',
      contacts: [],
      color: '#8B5CF6',
      description: 'Cooperativas agrícolas'
    },
    {
      id: 'corretores',
      name: 'Corretores',
      contacts: [],
      color: '#EF4444',
      description: 'Corretores e intermediários'
    },
    {
      id: 'fornecedores',
      name: 'Fornecedores',
      contacts: [],
      color: '#6B7280',
      description: 'Fornecedores de insumos e equipamentos'
    }
  ]);

  // Filtrar contatos baseado na busca
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

  // Filtrar grupos baseado na busca
  const filteredGroups = contactGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para alternar seleção de contato individual
  const toggleContact = (contactId: string) => {
    const newSelection = selectedContacts.includes(contactId)
      ? selectedContacts.filter(id => id !== contactId)
      : [...selectedContacts, contactId];

    if (newSelection.length <= maxSelections) {
      onSelectionChange(newSelection);
    }
  };

  // Função para selecionar todos os contatos de um grupo
  const toggleGroup = (groupId: string) => {
    const group = contactGroups.find(g => g.id === groupId);
    if (!group) return;

    const isGroupSelected = selectedGroups.includes(groupId);
    
    if (isGroupSelected) {
      // Remover grupo e seus contatos
      setSelectedGroups(prev => prev.filter(id => id !== groupId));
      const newSelection = selectedContacts.filter(id => !group.contacts.includes(id));
      onSelectionChange(newSelection);
    } else {
      // Adicionar grupo e seus contatos
      setSelectedGroups(prev => [...prev, groupId]);
      const newContacts = group.contacts.filter(id => !selectedContacts.includes(id));
      const newSelection = [...selectedContacts, ...newContacts];
      
      if (newSelection.length <= maxSelections) {
        onSelectionChange(newSelection);
      }
    }
  };

  // Função para criar novo grupo
  const createGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup: ContactGroup = {
      id: `custom-${Date.now()}`,
      name: newGroupName,
      contacts: selectedContacts,
      color: newGroupColor,
      description: `Grupo personalizado criado em ${new Date().toLocaleDateString()}`
    };

    setContactGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setShowGroupManager(false);
  };

  // Função para adicionar contatos a um grupo existente
  const addContactsToGroup = (groupId: string) => {
    setContactGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, contacts: Array.from(new Set([...group.contacts, ...selectedContacts])) }
        : group
    ));
  };

  // Calcular estatísticas
  const totalSelected = selectedContacts.length;
  const selectedGroupsCount = selectedGroups.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Selecionar Contatos e Grupos</h2>
            <p className="text-blue-100 text-sm">
              {totalSelected} contatos selecionados • {selectedGroupsCount} grupos ativos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Barra de busca */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contatos ou grupos..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex h-96">
          {/* Lista de Grupos */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Grupos de Contatos
                </h3>
                <button
                  onClick={() => setShowGroupManager(!showGroupManager)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Gerenciar
                </button>
              </div>

              {/* Criar novo grupo */}
              {showGroupManager && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                  <h4 className="text-sm font-medium mb-2">Criar Novo Grupo</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Nome do grupo"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={newGroupColor}
                        onChange={(e) => setNewGroupColor(e.target.value)}
                        className="w-8 h-8 border border-gray-300 rounded"
                      />
                      <button
                        onClick={createGroup}
                        disabled={!newGroupName.trim()}
                        className="flex-1 bg-blue-600 text-white text-sm px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Criar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de grupos */}
              <div className="space-y-2">
                {filteredGroups.map(group => (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroups.includes(group.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          <p className="text-xs text-gray-500">
                            {group.contacts.length} contatos
                          </p>
                        </div>
                      </div>
                      {selectedGroups.includes(group.id) && (
                        <CheckIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    {group.description && (
                      <p className="text-xs text-gray-400 mt-1">{group.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de Contatos */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <UserIcon className="h-5 w-5 mr-2" />
                Contatos Individuais
              </h3>

              <div className="space-y-2">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContacts.includes(contact.id)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                        </div>
                      </div>
                      {selectedContacts.includes(contact.id) && (
                        <CheckIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {totalSelected > 0 && (
              <span>
                {totalSelected} de {maxSelections} contatos selecionados
              </span>
            )}
            {totalSelected >= maxSelections && (
              <span className="text-red-600 ml-2">
                (Limite atingido)
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => onSelectionChange([])}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Limpar Seleção
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Confirmar Seleção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactGroupSelector; 