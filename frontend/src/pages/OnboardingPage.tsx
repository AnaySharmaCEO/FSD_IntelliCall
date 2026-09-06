// OnboardingPage — First-time workspace configuration.
// Reached after:
// 1. Email Sign up -> 6-digit OTP verification
// 2. First-time Google or Microsoft SSO account creation

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("RevOps / Sales Operations");
  const [teamSize, setTeamSize] = useState("10-50 reps");
  const [primaryGoal, setPrimaryGoal] = useState("Autonomous lead qualification with audit trails");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("intellicall_has_onboarded", "true");
      localStorage.setItem("intellicall_company_name", companyName);
      toast("Workspace initialized successfully.");
      navigate("/dashboard");
    }, 700);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "var(--color-bg-primary)" }}
    >
      <div className="w-full max-w-[520px] mb-6 text-center">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[var(--radius-pill)]"
          style={{
            background: "var(--color-action-secondary-bg)",
            color: "var(--color-action-secondary-text)",
          }}
        >
          Step 2 of 2 · First-time Setup
        </span>
        <h1
          className="text-[24px] font-semibold mt-3 mb-1.5"
          style={{ color: "var(--color-text-primary)" }}
        >
          Welcome to IntelliCall
        </h1>
        <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          Configure your team workspace so the AI agent knows your qualification objectives.
        </p>
      </div>

      <div
        className="w-full max-w-[520px] rounded-[var(--radius-lg)] p-8"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Company / Organization name"
            required
            placeholder="e.g. Acme Corp"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-secondary)]">
              Your role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[13px] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-action-primary)]"
            >
              <option value="RevOps / Sales Operations">RevOps / Sales Operations</option>
              <option value="VP / Director of Sales">VP / Director of Sales</option>
              <option value="SDR Manager / Team Lead">SDR Manager / Team Lead</option>
              <option value="Founder / Executive">Founder / Executive</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-secondary)]">
              Sales team size
            </label>
            <select
              value={teamSize}
              onChange={e => setTeamSize(e.target.value)}
              className="h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[13px] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-action-primary)]"
            >
              <option value="1-5 reps">1 - 5 outbound reps</option>
              <option value="6-20 reps">6 - 20 outbound reps</option>
              <option value="21-50 reps">21 - 50 outbound reps</option>
              <option value="50+ reps">50+ outbound reps</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--color-text-secondary)]">
              Primary outbound goal
            </label>
            <select
              value={primaryGoal}
              onChange={e => setPrimaryGoal(e.target.value)}
              className="h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[13px] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-action-primary)]"
            >
              <option value="Autonomous lead qualification with audit trails">
                Autonomous lead qualification with audit trails
              </option>
              <option value="Review queue assisted qualification">
                Review queue assisted qualification
              </option>
              <option value="High-volume cold outbound meeting booking">
                High-volume cold outbound meeting booking
              </option>
              <option value="Inbound follow-up speed-to-lead">
                Inbound follow-up speed-to-lead
              </option>
            </select>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full justify-center"
            >
              Complete setup & enter workspace →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
