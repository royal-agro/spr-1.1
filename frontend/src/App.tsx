import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GentelellaLayout from './components/Layout/GentelellaLayout';
import DashboardGentelella from './pages/DashboardGentelella';
import Dashboard from './pages/Dashboard';
import WhatsAppPage from './pages/WhatsAppPage';
import WhatsAppReportsPage from './pages/WhatsAppReportsPage';
import Settings from './pages/Settings';
import AgendaPage from './pages/AgendaPage';
import OfferBookPage from './pages/OfferBookPage';
import BroadcastApprovalPage from './pages/BroadcastApprovalPage';
import { Toaster } from 'react-hot-toast';
import './App.css';
import './styles/royal-theme.scss';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Nova rota principal com layout Gentelella */}
          <Route path="/" element={<DashboardGentelella />} />
          <Route path="/dashboard" element={<DashboardGentelella />} />
          
          {/* Rotas com layout Gentelella */}
          <Route path="/whatsapp" element={
            <GentelellaLayout currentPage="whatsapp">
              <WhatsAppPage />
            </GentelellaLayout>
          } />
          <Route path="/whatsapp/reports" element={
            <GentelellaLayout currentPage="analytics">
              <WhatsAppReportsPage />
            </GentelellaLayout>
          } />
          <Route path="/agenda" element={
            <GentelellaLayout currentPage="agenda">
              <AgendaPage />
            </GentelellaLayout>
          } />
          <Route path="/ofertas" element={
            <GentelellaLayout currentPage="customers">
              <OfferBookPage />
            </GentelellaLayout>
          } />
          <Route path="/broadcast" element={
            <GentelellaLayout currentPage="campaigns">
              <BroadcastApprovalPage />
            </GentelellaLayout>
          } />
          <Route path="/settings" element={
            <GentelellaLayout currentPage="settings">
              <Settings />
            </GentelellaLayout>
          } />
          
          {/* Rota de fallback para dashboard antigo (compatibilidade) */}
          <Route path="/dashboard-legacy" element={
            <GentelellaLayout currentPage="dashboard">
              <Dashboard />
            </GentelellaLayout>
          } />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
};

export default App; 