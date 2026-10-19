import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Clock,
  PhoneCall,
  Settings,
  DollarSign,
  Users,
} from 'lucide-react';
import {
  useCampaigns,
  useAgents,
  useCreateCampaign,
  useUpdateCampaign,
} from '../../api/hooks';
import { StatusChip } from '../../components/patterns';
import {
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Skeleton,
  EmptyState,
  useToast,
} from '../../components/ui';
import { formatCurrency } from '../../lib/format';
import type { Campaign } from '../../contracts/entities';

export const CampaignsPage: React.FC = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: agents = [] } = useAgents();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [dailyBudget, setDailyBudget] = useState(5000);
  const [concurrencyLimit, setConcurrencyLimit] = useState(10);
  const [callingStart, setCallingStart] = useState('09:00');
  const [callingEnd, setCallingEnd] = useState('19:00');

  const openCreateModal = () => {
    setEditingCampaign(null);
    setName('');
    setAgentId(agents[0]?.id || '');
    setDailyBudget(5000);
    setConcurrencyLimit(10);
    setCallingStart('09:00');
    setCallingEnd('19:00');
    setModalOpen(true);
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        updates: { status: nextStatus },
      });
      toast(`Campaign ${nextStatus === 'active' ? 'resumed' : 'paused'}`, 'info');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCampaign) {
        await updateCampaign.mutateAsync({
          id: editingCampaign.id,
          updates: {
            name,
            agent_id: agentId || undefined,
            daily_budget: dailyBudget,
            concurrency_limit: concurrencyLimit,
            calling_hours_start: callingStart,
            calling_hours_end: callingEnd,
          },
        });
        toast('Campaign updated', 'success');
      } else {
        await createCampaign.mutateAsync({
          name,
          agent_id: agentId || undefined,
          daily_budget: dailyBudget,
          concurrency_limit: concurrencyLimit,
          calling_hours_start: callingStart,
          calling_hours_end: callingEnd,
          status: 'active',
        });
        toast('New campaign launched', 'success');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Outbound Engine
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Outbound Campaigns
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Orchestrate automated outreach, calling schedules, concurrency limits, and agent assignments.
          </p>
        </div>

        <Button size="sm" onClick={openCreateModal}>
          <Plus size={14} className="mr-1.5" />
          Create Campaign
        </Button>
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4">
              <Skeleton width="50%" height={24} />
              <Skeleton width="100%" height={48} />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={36} />}
          title="No campaigns active"
          description="Create your first campaign to begin automated calling to leads in your CRM."
          action={{
            label: 'Create Campaign',
            onClick: openCreateModal,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {campaigns.map((camp) => {
            const assignedAgent = agents.find((a) => a.id === camp.agent_id);
            return (
              <div
                key={camp.id}
                className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4 shadow-2xs hover:border-[var(--color-border-default)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[15px] text-[var(--color-text-primary)]">
                      {camp.name}
                    </h3>
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      ID: {camp.id}
                    </span>
                  </div>
                  <StatusChip status={camp.status} type="campaign" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-[var(--color-bg-sunken)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">
                      Assigned Agent
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {assignedAgent?.name || 'Unassigned'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--color-bg-sunken)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">
                      Daily Budget
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)] font-mono">
                      {camp.daily_budget ? formatCurrency(camp.daily_budget) : 'Unlimited'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--color-bg-sunken)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">
                      Calling Window
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)] font-mono">
                      {camp.calling_hours_start} - {camp.calling_hours_end}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--color-bg-sunken)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block">
                      Max Concurrency
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)] font-mono">
                      {camp.concurrency_limit} lines
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                  <Button
                    variant={camp.status === 'active' ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleStatus(camp)}
                  >
                    {camp.status === 'active' ? (
                      <>
                        <Pause size={13} className="mr-1.5" /> Pause Campaign
                      </>
                    ) : (
                      <>
                        <Play size={13} className="mr-1.5" /> Launch Campaign
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Campaign */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Outbound Campaign"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Campaign Title"
            placeholder="e.g. Q4 Auto Loan Refinancing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Assign AI Voice Agent"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            options={agents.map((a) => ({ value: a.id, label: `${a.name} (${a.language})` }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Daily Budget (INR)"
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
            />
            <Input
              label="Max Concurrency Limit"
              type="number"
              value={concurrencyLimit}
              onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Calling Hours Start (24h)"
              type="time"
              value={callingStart}
              onChange={(e) => setCallingStart(e.target.value)}
            />
            <Input
              label="Calling Hours End (24h)"
              type="time"
              value={callingEnd}
              onChange={(e) => setCallingEnd(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={createCampaign.isPending}>
              Launch Campaign
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CampaignsPage;
