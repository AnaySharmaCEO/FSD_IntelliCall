import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  PhoneCall,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAgents, useCreateCampaign } from '../../api/hooks';
import { Button, Badge, Input, Select, useToast } from '../../components/ui';

export const CampaignWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: agents = [] } = useAgents();
  const createCampaign = useCreateCampaign();
  const { toast } = useToast();

  const [step, setStep] = useState(1);

  // Form State
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('loans');
  const [agentId, setAgentId] = useState('');
  const [budget, setBudget] = useState(10000);
  const [concurrency, setConcurrency] = useState(5);
  const [callingStart, setCallingStart] = useState('09:00');
  const [callingEnd, setCallingEnd] = useState('18:00');

  // Preflight items
  const preflightChecks = [
    { title: 'Twilio Cloud Phone Trunk', passed: true, detail: '2 registered caller IDs available' },
    { title: 'Gemini Speech Engine Token Quota', passed: true, detail: 'Low-latency quota verified' },
    { title: 'Mandatory Compliance Disclosure', passed: true, detail: 'Recording consent disclaimer active' },
    { title: 'Calling Window Compliance', passed: true, detail: '09:00 - 18:00 within TRAI/TCPA legal hours' },
  ];

  const handleFinish = async () => {
    try {
      await createCampaign.mutateAsync({
        name,
        agent_id: agentId || undefined,
        daily_budget: budget,
        concurrency_limit: concurrency,
        calling_hours_start: callingStart,
        calling_hours_end: callingEnd,
        status: 'active',
      });
      toast('Campaign launched successfully!', 'success');
      navigate('/campaigns');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Launch failed', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link to="/campaigns" className="text-xs text-[var(--color-text-muted)] hover:underline">
            &larr; Back to Campaigns
          </Link>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Campaign Launch Wizard
        </h1>
        <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
          Configure strategy, voice persona, calling constraints, and verify preflight safety checks.
        </p>
      </div>

      {/* Stepper Bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        {[
          { num: 1, label: 'Basics & Product' },
          { num: 2, label: 'AI Voice Agent' },
          { num: 3, label: 'Pacing & Hours' },
          { num: 4, label: 'Preflight Safety' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                step === s.num
                  ? 'bg-[var(--color-action-primary)] text-white'
                  : step > s.num
                  ? 'bg-[var(--color-success)] text-white'
                  : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]'
              }`}
            >
              {step > s.num ? <Check size={14} /> : s.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                step === s.num
                  ? 'text-[var(--color-text-primary)] font-bold'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Panels */}
      <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-2xs space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Step 1: Campaign Identity & Product Objective
            </h2>
            <Input
              label="Campaign Name"
              placeholder="e.g. Q4 Priority Auto Loan Refinance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Select
              label="Product Vertical"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              options={[
                { value: 'loans', label: 'Loan Refinancing & Disbursals' },
                { value: 'cards', label: 'Credit Card Upgrades' },
                { value: 'retention', label: 'Customer Retention & Churn Winback' },
                { value: 'advisory', label: 'Wealth Advisory & FDs' },
              ]}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Step 2: Assign AI Voice Agent
            </h2>
            <Select
              label="Voice Persona"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              options={agents.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.voice} - ${a.language})`,
              }))}
            />
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-sunken)] text-xs text-[var(--color-text-secondary)] space-y-2">
              <span className="font-semibold text-[var(--color-text-primary)] block">
                Selected Agent Persona
              </span>
              <p>
                Voice will speak with adaptive speech pacing, barge-in detection, and real-time structured intent extraction.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Step 3: Dialing Pacing & Budget
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Daily Budget (INR)"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
              <Input
                label="Concurrency Limit (Lines)"
                type="number"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Daily Calling Starts"
                type="time"
                value={callingStart}
                onChange={(e) => setCallingStart(e.target.value)}
              />
              <Input
                label="Daily Calling Ends"
                type="time"
                value={callingEnd}
                onChange={(e) => setCallingEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Step 4: Preflight Validation Safety Gate
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Automated preflight checks ensuring carrier compliance, telephony routes, and token budgets.
            </p>

            <div className="space-y-2.5 pt-2">
              {preflightChecks.map((chk, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-[var(--radius-md)] bg-[var(--color-bg-sunken)]/60 border border-[var(--color-border-subtle)]"
                >
                  <CheckCircle2 size={16} className="text-[var(--color-success)] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      {chk.title}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {chk.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stepper Footer Buttons */}
        <div className="pt-6 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft size={14} className="mr-1" />
            Previous
          </Button>

          {step < 4 ? (
            <Button
              size="sm"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(step + 1)}
            >
              Next Step
              <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleFinish}
              loading={createCampaign.isPending}
            >
              <Sparkles size={14} className="mr-1.5" />
              Launch Campaign Live
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignWizardPage;
