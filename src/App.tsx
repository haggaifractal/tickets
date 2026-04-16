import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverview } from './pages/DashboardOverview';

export const App: React.FC = () => {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
};

export default App;
