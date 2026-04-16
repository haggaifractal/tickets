import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverview } from './pages/DashboardOverview';
import { TicketsList } from './pages/TicketsList';
import { AssetsList } from './pages/AssetsList';
import { ClientsList } from './pages/ClientsList';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';

/* ... omitted imports for brevity ... */

import { Toaster } from 'sonner';

export const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Area */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<DashboardOverview />} />
                <Route path="/tickets" element={<TicketsList />} />
                <Route path="/assets" element={<AssetsList />} />
                <Route path="/clients" element={<ClientsList />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </Router>
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
