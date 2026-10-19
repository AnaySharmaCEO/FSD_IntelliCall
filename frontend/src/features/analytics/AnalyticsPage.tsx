import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import { useAnalyticsOverview } from '../../api/hooks';
import { KPICard, FunnelChart } from '../../components/patterns';
import { Badge, Skeleton } from '../../components/ui';
import { formatDuration } from '../../lib/format';

export const AnalyticsPage: React.FC = () => {
  const { data: analytics, isLoading } = useAnalyticsOverview();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            Operational Telemetry
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Analytics & Performance
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
          Longitudinal metrics on voice turnaround latency, funnel conversion velocity, and sentiment dynamics.
        </p>
      </div>

      {/* Latency & Speech Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-3">
              <Skeleton width="40%" height={12} />
              <Skeleton width="60%" height={28} />
            </div>
          ))
        ) : (
          <>
            <KPICard
              label="Turnaround Latency (TTFB)"
              value="280 ms"
              delta={{ value: -14.0, period: 'last week' }}
              icon={<Zap size={18} className="text-amber-500" />}
              hint="Target <500ms achieved"
            />
            <KPICard
              label="Audio Roundtrip"
              value="410 ms"
              delta={{ value: -9.5, period: 'yesterday' }}
              icon={<Activity size={18} className="text-sky-500" />}
              hint="Gemini Live stream"
            />
            <KPICard
              label="Call Disconnect Rate"
              value="3.2%"
              delta={{ value: -1.1, period: 'last month' }}
              icon={<TrendingUp size={18} className="text-emerald-500" />}
              hint="Industry benchmark 8%"
            />
            <KPICard
              label="Average Sentiment Score"
              value="88%"
              delta={{ value: 5.2, period: 'last week' }}
              icon={<ShieldCheck size={18} className="text-indigo-500" />}
              hint="High satisfaction"
            />
          </>
        )}
      </div>

      {/* Conversion Funnel & Daily Trend Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              End-to-End Pipeline Funnel
            </h2>
            <Badge variant="success">92% Qualification Rate</Badge>
          </div>

          <FunnelChart
            steps={[
              { label: 'Outbound Leads Dialed', count: 1200 },
              { label: 'Live Connection Established', count: 840 },
              { label: 'Engaged Turns (>3 turns)', count: 520 },
              { label: 'Structured Agreement Sanctioned', count: 195 },
            ]}
          />
        </div>

        {/* Recent Daily Trend Breakdown */}
        <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Daily Velocity Trend
            </h2>
            <Badge variant="info">Rolling 5 Days</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] text-[11px]">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Calls</th>
                  <th className="py-2.5">Conversions</th>
                  <th className="py-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {(analytics?.recentTrends || []).map((row) => (
                  <tr key={row.date} className="hover:bg-[var(--color-bg-sunken)]/50">
                    <td className="py-2.5 font-sans font-semibold text-[var(--color-text-primary)]">
                      {row.date}
                    </td>
                    <td className="py-2.5 text-[var(--color-text-secondary)]">{row.calls}</td>
                    <td className="py-2.5 text-[var(--color-success)] font-bold">{row.conversions}</td>
                    <td className="py-2.5 text-right font-bold text-[var(--color-action-primary)]">
                      {row.avgSentimentScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
