import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LayoutSidebar from './components/Common/LayoutSidebar';
import Dashboard from './pages/Dashboard';
import WhatsAppPage from './pages/WhatsAppPage';
import WhatsAppReportsPage from './pages/WhatsAppReportsPage';
import Settings from './pages/Settings';
import AgendaPage from './pages/AgendaPage';
import OfferBookPage from './pages/OfferBookPage';
import { Toaster } from 'react-hot-toast';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <LayoutSidebar>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/whatsapp/reports" element={<WhatsAppReportsPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/ofertas" element={<OfferBookPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </LayoutSidebar>
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