import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import AppLayout from './AppLayout';
import LandingPage from '../features/landing/LandingPage';
import KitPage from '../features/kit/KitPage';
import { Button } from '../components/ui';

// Quick Phase Placeholder Component
const FeaturePlaceholder: React.FC<{
  title: string;
  phase: string;
  description: string;
}> = ({ title, phase, description }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)]">
      <div className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-[var(--color-action-secondary-bg)] text-[var(--color-action-primary)] mb-4">
        {phase}
      </div>
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">{description}</p>
      <Link to="/__kit">
        <Button variant="outline" size="sm">
          Inspect Design System & Seams (/__kit)
        </Button>
      </Link>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page at root */}
      <Route path="/" element={<LandingPage />} />

      {/* Main Authenticated / App Shell */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<FeaturePlaceholder title="Intelligence Dashboard" phase="Phase F2 Checkpoint" description="Real-time KPI overview, active call status tracker, sentiment distribution, and quick actions." />} />
        <Route path="/calls" element={<FeaturePlaceholder title="Calls & Transcript Auditing" phase="Phase F3 Checkpoint" description="Complete call log table, search filters, audio player with evidence citations and Gemini analysis." />} />
        <Route path="/calls/:id" element={<FeaturePlaceholder title="Call Detail View" phase="Phase F3 Checkpoint" description="Deep dive into call transcript, structured sentiment, action items, and risk flags." />} />
        <Route path="/agents" element={<FeaturePlaceholder title="AI Agent Studio" phase="Phase F4 Checkpoint" description="Voice persona editor, prompt configuration, temperature tuning, and real-time simulator." />} />
        <Route path="/campaigns" element={<FeaturePlaceholder title="Outbound Campaigns" phase="Phase F5 Checkpoint" description="Campaign runner, pacing controls, concurrency limits, and scheduled calling windows." />} />
        <Route path="/leads" element={<FeaturePlaceholder title="Leads & Pipeline" phase="Phase F6 Checkpoint" description="Lead list, status transitions, custom fields, and CSV bulk import." />} />
        <Route path="/compliance" element={<FeaturePlaceholder title="Compliance Engine" phase="Phase F7 Checkpoint" description="Automated audit rules, required disclosures, prohibited phrases, and violation flagging." />} />
        <Route path="/analytics" element={<FeaturePlaceholder title="Analytics & Funnel" phase="Phase F8 Checkpoint" description="Full conversion funnels, agent performance benchmarks, and turnaround latency metrics." />} />

        {/* Design System & Architecture Verification Kitchen Sink */}
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
