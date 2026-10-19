import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Play,
  Volume2,
  Sliders,
  Sparkles,
  Trash2,
  Edit,
  Mic,
  MessageSquare,
} from 'lucide-react';
import {
  useAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
} from '../../api/hooks';
import { StatusChip } from '../../components/patterns';
import {
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Drawer,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui';
import { createVoiceSession } from '../../voice';
import type { Agent } from '../../contracts/entities';

export const AgentsPage: React.FC = () => {
  const { data: agents = [], isLoading } = useAgents();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const { toast } = useToast();

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [voice, setVoice] = useState('Puck');
  const [language, setLanguage] = useState('en-IN');
  const [temperature, setTemperature] = useState(0.3);
  const [speed, setSpeed] = useState(1.0);
  const [greeting, setGreeting] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Voice Test Simulator Drawer State
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);
  const [voiceSession] = useState(() => createVoiceSession('mock'));
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [agentState, setAgentState] = useState('idle');
  const [transcriptLog, setTranscriptLog] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [latencyMetrics, setLatencyMetrics] = useState<{ ttfb: number; roundtrip: number } | null>(null);

  const openCreateModal = () => {
    setEditingAgent(null);
    setName('');
    setVoice('Puck');
    setLanguage('en-IN');
    setTemperature(0.3);
    setSpeed(1.0);
    setGreeting('Hello, this is {{agent_name}} calling from Apex Financial.');
    setSystemPrompt('You are a professional financial specialist.');
    setModalOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setVoice(agent.voice);
    setLanguage(agent.language);
    setTemperature(agent.voice_temperature);
    setSpeed(agent.voice_speed);
    setGreeting(agent.greeting);
    setSystemPrompt(agent.system_prompt);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingAgent) {
        await updateAgent.mutateAsync({
          id: editingAgent.id,
          updates: {
            name,
            voice,
            language,
            voice_temperature: temperature,
            voice_speed: speed,
            greeting,
            system_prompt: systemPrompt,
          },
        });
        toast('Agent updated successfully', 'success');
      } else {
        await createAgent.mutateAsync({
          name,
          voice,
          language,
          voice_temperature: temperature,
          voice_speed: speed,
          greeting,
          system_prompt: systemPrompt,
          status: 'active',
        });
        toast('New AI agent created', 'success');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save agent', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await deleteAgent.mutateAsync(id);
      toast('Agent removed', 'info');
    }
  };

  const openSimulator = async (agent: Agent) => {
    setTestingAgent(agent);
    setTranscriptLog([]);
    setTestDrawerOpen(true);

    voiceSession.onEvent((event) => {
      if (event.type === 'agent_state_changed') {
        setAgentState(event.state);
      } else if (event.type === 'transcript_delta') {
        setTranscriptLog((prev) => [...prev, `${event.chunk.role}: ${event.chunk.text}`]);
      } else if (event.type === 'metrics') {
        setLatencyMetrics({
          ttfb: event.metrics.ttfb_ms,
          roundtrip: event.metrics.roundtrip_ms,
        });
      }
    });

    await voiceSession.connect({
      agent_id: agent.id,
      voice_id: agent.voice,
      language: agent.language,
      temperature: agent.voice_temperature,
    });
    setVoiceConnected(true);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    voiceSession.sendTextMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Resonology Voice Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            AI Agent Studio
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Configure conversational personas, voice acoustics, system prompts, and test real-time speech.
          </p>
        </div>

        <Button size="sm" onClick={openCreateModal}>
          <Plus size={14} className="mr-1.5" />
          Create New Agent
        </Button>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
              <Skeleton width="40%" height={20} />
              <Skeleton width="100%" height={60} />
              <Skeleton width="60%" height={16} />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={<Bot size={36} />}
          title="No AI agents configured"
          description="Create your first conversational agent with customized voice and qualification prompts."
          action={{
            label: 'Create Agent',
            onClick: openCreateModal,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4 shadow-2xs hover:border-[var(--color-border-default)] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-action-secondary-bg)] text-[var(--color-action-primary)] flex items-center justify-center font-bold">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[14px] text-[var(--color-text-primary)]">
                        {agent.name}
                      </h3>
                      <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                        {agent.language} &bull; {agent.voice}
                      </span>
                    </div>
                  </div>
                  <StatusChip status={agent.status} type="agent" />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-[var(--color-bg-sunken)]">
                    <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase block mb-1">
                      System Directive
                    </span>
                    <p className="text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                      {agent.system_prompt || 'Standard qualification prompt.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[var(--color-text-muted)] pt-1">
                    <div>Temp: <strong className="text-[var(--color-text-primary)]">{agent.voice_temperature}</strong></div>
                    <div>Speed: <strong className="text-[var(--color-text-primary)]">{agent.voice_speed}x</strong></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => openSimulator(agent)}>
                  <Play size={13} className="mr-1 text-[var(--color-action-primary)]" />
                  Test Voice
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(agent)}
                    className="p-1.5 rounded hover:bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
                    title="Edit agent"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="p-1.5 rounded hover:bg-[var(--color-error-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] cursor-pointer transition-colors"
                    title="Delete agent"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Agent */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAgent ? 'Edit AI Voice Agent' : 'Create AI Voice Agent'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Agent Name"
            placeholder="e.g. Aria - Auto Loan Specialist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Voice Persona"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              options={[
                { value: 'Puck', label: 'Puck (Versatile / Natural)' },
                { value: 'Charon', label: 'Charon (Empathetic Support)' },
                { value: 'Fenrir', label: 'Fenrir (Authoritative Financial)' },
                { value: 'Aoede', label: 'Aoede (Warm / Engaging)' },
              ]}
            />
            <Select
              label="Primary Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'en-IN', label: 'English (India)' },
                { value: 'hi-IN', label: 'Hindi (India)' },
                { value: 'en-US', label: 'English (US)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
                Temperature ({temperature})
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-brand-blue)]"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
                Voice Speed ({speed}x)
              </label>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-brand-blue)]"
              />
            </div>
          </div>

          <Input
            label="Initial Greeting Phrase"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Hello, this is Aria from Apex Financial..."
          />

          <div>
            <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
              System Instruction & Qualification Prompt
            </label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define behavioral rules, tone, qualification criteria, and objections..."
              className="w-full p-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-action-primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={createAgent.isPending || updateAgent.isPending}>
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Drawer: Live Voice Simulator */}
      <Drawer
        open={testDrawerOpen}
        onClose={async () => {
          await voiceSession.disconnect();
          setTestDrawerOpen(false);
          setVoiceConnected(false);
        }}
        title={`Testing ${testingAgent?.name || 'Agent'}`}
        width="max-w-[560px]"
        footer={
          <form onSubmit={handleSendChat} className="flex gap-2 w-full">
            <Input
              placeholder="Type message to agent..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button type="submit" size="md">
              Send
            </Button>
          </form>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              <span>Status: <strong>{agentState}</strong></span>
            </div>
            {latencyMetrics && (
              <span className="text-[var(--color-action-primary)]">
                TTFB: {latencyMetrics.ttfb}ms &bull; Turn: {latencyMetrics.roundtrip}ms
              </span>
            )}
          </div>

          <div className="h-[420px] overflow-y-auto p-4 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] space-y-3 text-xs">
            {transcriptLog.length === 0 ? (
              <p className="text-[var(--color-text-muted)] italic text-center py-10">
                Connected to voice session. Send a text or speak to initiate audio turns.
              </p>
            ) : (
              transcriptLog.map((line, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded ${
                    line.startsWith('agent')
                      ? 'bg-[var(--color-action-secondary-bg)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default AgentsPage;
