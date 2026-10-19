import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import LandingPage from '../features/landing/LandingPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import CallsPage from '../features/calls/CallsPage';
import CallDetailPage from '../features/calls/CallDetailPage';
import AgentsPage from '../features/agents/AgentsPage';
import CampaignsPage from '../features/campaigns/CampaignsPage';
import LeadsPage from '../features/leads/LeadsPage';
import CompliancePage from '../features/compliance/CompliancePage';
import AnalyticsPage from '../features/analytics/AnalyticsPage';
import KitPage from '../features/kit/KitPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page at root (Preserved) */}
      <Route path="/" element={<LandingPage />} />

      {/* Main Authenticated / App Shell */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calls" element={<CallsPage />} />
        <Route path="/calls/:id" element={<CallDetailPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Design System Verification Kitchen Sink */}
        <Route path="/__kit" element={<KitPage />} />

        {/* Fallback redirect */}
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
