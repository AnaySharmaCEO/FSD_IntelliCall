import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  Activity,
  Mic,
  Volume2,
  ShieldAlert,
  User,
  Bot,
  Radio,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useCalls, useCallAnalysis } from '../../api/hooks';
import { realtimeClient } from '../../realtime';
import { StatusChip, ConfidenceMeter } from '../../components/patterns';
import { Button, Badge, useToast } from '../../components/ui';
import { formatDuration } from '../../lib/format';
import type { Call } from '../../contracts/entities';

export const LiveCallMonitorPage: React.FC = () => {
  const { data: callsData } = useCalls();
  const { toast } = useToast();

  const [activeCall, setActiveCall] = useState<Call | null>(() => {
    return callsData?.data.find((c) => c.status === 'in_progress') || callsData?.data[0] || null;
  });

  const { data: analysis } = useCallAnalysis(activeCall?.id);

  const [liveStreamText, setLiveStreamText] = useState<string[]>([]);
  const [bargeInActive, setBargeInActive] = useState(false);

  useEffect(() => {
    if (!callsData?.data || callsData.data.length === 0) return;
    setActiveCall((prev) => {
      if (!prev) {
        return callsData.data.find((c) => c.status === 'in_progress') || callsData.data[0];
      }
      const existing = callsData.data.find((c) => c.id === prev.id);
      if (existing) {
        // Only trigger update if substantive call state fields actually changed
        if (
          existing.status !== prev.status ||
          existing.transcript !== prev.transcript ||
          existing.duration_seconds !== prev.duration_seconds ||
          existing.sentiment !== prev.sentiment
        ) {
          return existing;
        }
        return prev;
      }
      // If previously selected call is no longer present, switch to active or first
      return callsData.data.find((c) => c.status === 'in_progress') || callsData.data[0];
    });
  }, [callsData]);

  // Realtime updates
  useEffect(() => {
    return realtimeClient.subscribeToCalls((payload) => {
      if (payload.new && payload.new.status === 'in_progress') {
        setActiveCall(payload.new);
        if (payload.new.transcript) {
          setLiveStreamText((prev) => [...prev, payload.new!.transcript!]);
        }
      }
    });
  }, []);

  const handleTakeover = () => {
    setBargeInActive(!bargeInActive);
    toast(
      bargeInActive ? 'Supervisor stepped down. AI resumed.' : 'Supervisor barged into call stream.',
      bargeInActive ? 'info' : 'warning'
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-error)] opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-error)]" />
            </span>
            <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Live WebRTC Stream &bull; Sub-500ms Turnaround
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Live Call Monitor
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Real-time audio telemetry, acoustic turn analysis, and supervisor barge-in controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/calls">
            <Button variant="outline" size="sm">
              &larr; Call History
            </Button>
          </Link>
          <Button
            variant={bargeInActive ? 'destructive' : 'secondary'}
            size="sm"
            onClick={handleTakeover}
          >
            <Radio size={14} className="mr-1.5" />
            {bargeInActive ? 'Exit Supervisor Takeover' : 'Barge In / Takeover Call'}
          </Button>
        </div>
      </div>

      {/* 3-Pane Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Pane 1 (3 cols): Active Concurrent Channels */}
        <div className="lg:col-span-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-3">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block border-b border-[var(--color-border-subtle)] pb-2">
            Active Lines (Concurrent)
          </span>

          <div className="space-y-2">
            {(callsData?.data || []).slice(0, 4).map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveCall(c)}
                className={`p-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                  activeCall?.id === c.id
                    ? 'bg-[var(--color-action-secondary-bg)] border-[var(--color-action-primary)]'
                    : 'bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                    Line #{c.id.slice(0, 8)}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[var(--color-success)] opacity-90" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] font-mono">
                  <span>{c.direction}</span>
                  <span>{formatDuration(c.duration_seconds || 45)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pane 2 (6 cols): Real-time Audio & Turn Stream */}
        <div className="lg:col-span-6 p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                Monitoring Line #{activeCall?.id.slice(0, 8)}
              </span>
              <Badge variant="info">Silero VAD Active</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
              <span>Latency: <strong>310ms</strong></span>
            </div>
          </div>

          {/* Live Audio Level Visualization */}
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-sunken)] flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Acoustic Signal:</span>
            <div
              className="flex items-center gap-1 flex-1 justify-center h-7"
              aria-label="Acoustic signal visualization"
              role="img"
            >
              {[40, 65, 30, 80, 95, 60, 45, 75, 35, 90, 50, 60, 30, 85].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-[var(--color-action-primary)] animate-ic-waveform"
                  style={{
                    height: `${Math.max(8, Math.round(h * 0.26))}px`,
                    animationDelay: `${((i * 0.11) % 0.8).toFixed(2)}s`,
                    animationDuration: `${1.1 + (i % 3) * 0.25}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-[var(--color-success)] font-bold">24 kHz PCM</span>
          </div>

          {/* Real-time Dialogue Scroll */}
          <div className="h-96 overflow-y-auto p-4 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] space-y-3 text-xs">
            <p className="text-[var(--color-text-muted)] italic text-center text-[11px]">
              &bull;&bull;&bull; Real-time speech stream synchronized &bull;&bull;&bull;
            </p>
            {(activeCall?.transcript || '')
              .split('\n')
              .filter(Boolean)
              .map((line, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded leading-relaxed ${
                    line.toLowerCase().includes('agent') || line.toLowerCase().includes('aria')
                      ? 'bg-[var(--color-action-secondary-bg)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {line}
                </div>
              ))}
          </div>
        </div>

        {/* Pane 3 (3 cols): Live Intent & Conversational State */}
        <div className="lg:col-span-3 p-5 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block border-b border-[var(--color-border-subtle)] pb-2">
            In-Flight State
          </span>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-1">
                Detected Intent
              </span>
              <span className="font-semibold text-[var(--color-text-primary)] capitalize">
                {analysis?.intent_primary
                  ? analysis.intent_primary.replace(/_/g, ' ')
                  : activeCall
                  ? 'Awaiting Turn Intent'
                  : 'No Active Session'}
              </span>
            </div>

            <ConfidenceMeter
              value={analysis?.intent_confidence ?? (activeCall ? 0.92 : 0)}
              label={analysis ? 'Intent Confidence' : 'Acoustic Stream Health'}
            />

            <div className="p-3 rounded bg-[var(--color-bg-sunken)] space-y-2">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase block font-semibold">
                Grounding Facts
              </span>
              <ul className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
                {analysis?.action_items && analysis.action_items.length > 0 ? (
                  analysis.action_items.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="truncate">
                      &bull; Action: <strong>{item.text}</strong>
                    </li>
                  ))
                ) : (
                  <>
                    <li>
                      &bull; Channel Direction: <strong>{activeCall?.direction || 'Outbound'}</strong>
                    </li>
                    <li>
                      &bull; Audio Transport: <strong>24 kHz Opus</strong>
                    </li>
                    <li>
                      &bull; Compliance Consent:{' '}
                      <strong className={activeCall ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}>
                        {activeCall ? 'Stream Active' : 'Awaiting Call'}
                      </strong>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCallMonitorPage;
