// IntelliCall — Landing Page
// Follows LANDING_PAGE_COPY.md (verbatim copy) and LANDING_PAGE_BUILD_PROMPT.md.
// Uses existing design tokens, components, and live interactive showcase in Section 3.

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConversationStatePanel from "../components/shared/ConversationStatePanel";
import AIStateBanner from "../components/shared/AIStateBanner";
import EvidenceSnippet from "../components/shared/EvidenceSnippet";
import EvidenceThread from "../components/shared/EvidenceThread";
import ConfidenceIndicator from "../components/shared/ConfidenceIndicator";
import DecisionCard from "../components/shared/DecisionCard";
import DecisionTrace from "../components/shared/DecisionTrace";
import { CalendlyModal, EarlyAccessModal } from "../components/shared/ActionCard";
import Button from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";

import {
  landingMockConversationState,
  landingMockEvidenceSnippet,
  landingMockEvidenceThread,
  landingMockTraceSteps,
  landingMockDecision,
} from "../mock";

export default function LandingPage() {
  const navigate = useNavigate();

  // Theme state synced with documentElement data-theme and ic-theme in localStorage
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("ic-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ic-theme", next);
    setThemeState(next);
  };

  // Ensure root attribute matches initial theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Check if authenticated for header nav link
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("intellicall_auth_token")));
  }, []);

  // Modal dialog states
  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  // FAQ accordion state — single item open at once
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // IntersectionObserver state for Section 3 showcase
  const [showcaseVisible, setShowcaseVisible] = useState(false);
  const [showcaseLoaded, setShowcaseLoaded] = useState(false);
  const showcaseRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setShowcaseVisible(true);
          // Simulate brief natural load using existing skeleton tokens per §5
          const timer = setTimeout(() => {
            setShowcaseLoaded(true);
          }, 320);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.15 }
    );

    if (showcaseRef.current) {
      observer.observe(showcaseRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const faqItems = [
    {
      q: "Does this replace my SDR team?",
      a: "No — it runs the qualification and follow-up conversations your team doesn't have time to make consistently, and hands off to your team (or books directly) once a lead is ready.",
    },
    {
      q: "How do I know the AI's decisions are accurate?",
      a: "Every decision includes the transcript evidence it was based on. You can review any decision — not just the ones flagged for review — and see the exact reasoning.",
    },
    {
      q: "What happens on calls the AI isn't confident about?",
      a: "They route to your review queue instead of executing automatically. You set the confidence threshold per campaign.",
    },
    {
      q: "Is my data used to train a shared model?",
      a: "No. Your call transcripts, CRM leads, and proprietary qualification signals are isolated to your organization's private environment. We do not use customer conversation data to train foundational or shared public models.",
    },
    {
      q: "How long does setup take?",
      a: "Configuring an agent and launching a campaign takes minutes, not a multi-week onboarding.",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col selection:bg-[var(--color-action-secondary-bg)] selection:text-[var(--color-action-primary)]"
      style={{ background: "var(--color-bg-primary)" }}
    >
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 md:px-12 backdrop-blur-md"
        style={{
          background: "var(--color-bg-surface)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-[17px] font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            IntelliCall
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            <a href="#product" className="hover:text-[var(--color-text-primary)] transition-colors">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-[var(--color-text-primary)] transition-colors">
              How it works
            </a>
            <a href="#early-access" className="hover:text-[var(--color-text-primary)] transition-colors">
              Early access
            </a>
            <a href="#faq" className="hover:text-[var(--color-text-primary)] transition-colors">
              FAQ
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="text-[13px] font-medium px-2 py-1 rounded-[var(--radius-sm)] transition-colors"
              style={{ color: "var(--color-action-primary)" }}
            >
              Go to app →
            </Link>
          ) : (
            <Link
              to="/signin"
              className="text-[13px] font-medium px-2 py-1 rounded-[var(--radius-sm)] transition-colors"
              style={{ color: "var(--color-action-primary)" }}
            >
              Sign in
            </Link>
          )}
          <Button
            size="sm"
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/signup")}
          >
            {isAuthenticated ? "Dashboard" : "Get started"}
          </Button>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 px-6 md:px-12 max-w-[960px] mx-auto text-center flex flex-col items-center">
        {/* Eyebrow */}
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.08em] mb-4"
          style={{ color: "var(--color-action-primary)" }}
        >
          Powered by Resonology AI
        </p>

        {/* Headline */}
        <h1
          className="font-semibold tracking-tight mb-5 max-w-[760px] text-[34px] md:text-[46px] leading-[1.18]"
          style={{ color: "var(--color-text-primary)" }}
        >
          Know why the AI made every call it made.
        </h1>

        {/* Subheadline */}
        <p
          className="text-[16px] md:text-[18px] max-w-[680px] mb-8 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          IntelliCall runs your outbound conversations, qualifies leads, and books meetings — and shows you the exact evidence behind every decision, before it acts or after you review it.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-4">
          <Button
            size="lg"
            onClick={() => navigate("/signup")}
            className="min-w-[140px] justify-center shadow-sm"
          >
            Get started
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setCalendlyOpen(true)}
            className="min-w-[140px] justify-center bg-[var(--color-bg-surface)]"
          >
            Book a demo
          </Button>
        </div>

        {/* Supporting line under CTAs */}
        <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
          No credit card to start. See a real decision trace in your first session.
        </p>
      </section>

      {/* ── Section 2 — The problem ───────────────────────────────────────── */}
      <section
        id="product"
        className="py-16 px-6 md:px-12"
        style={{
          background: "var(--color-bg-surface)",
          borderTop: "1px solid var(--color-border-subtle)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="max-w-[960px] mx-auto">
          <div className="max-w-[680px] mb-12">
            <h2
              className="text-[26px] md:text-[32px] font-semibold tracking-tight mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              Most AI dialers give you an outcome. Not a reason.
            </h2>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              "Qualified" or "not interested" isn't enough when you're the one accountable for the pipeline. If you can't see what the AI heard, what it flagged, and why it made the call it made, you can't trust it — and you can't improve it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="p-6 rounded-[var(--radius-md)] flex flex-col gap-2"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                No evidence trail.
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                A label with no transcript reasoning behind it.
              </p>
            </div>

            <div
              className="p-6 rounded-[var(--radius-md)] flex flex-col gap-2"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                No review point.
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Low-confidence calls act the same as high-confidence ones.
              </p>
            </div>

            <div
              className="p-6 rounded-[var(--radius-md)] flex flex-col gap-2"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                No audit path.
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                When a decision is wrong, no way to see where it went wrong.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3 — Product showcase ("How it works") ─────────────────── */}
      <section
        id="how-it-works"
        ref={showcaseRef}
        className="py-20 px-6 md:px-12 max-w-[1040px] mx-auto w-full"
      >
        <div className="mb-14 text-center">
          <h2
            className="text-[28px] md:text-[34px] font-semibold tracking-tight mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Every decision comes with its evidence.
          </h2>
          <p
            className="text-[14px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            This isn't a mockup — it's the actual interface, with sample data.
          </p>
        </div>

        <div className="flex flex-col gap-16">
          {/* Block 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[var(--radius-sm)] mb-3 inline-block"
                style={{ background: "var(--color-action-secondary-bg)", color: "var(--color-action-primary)" }}
              >
                01 · Live Execution
              </span>
              <p className="text-[18px] font-medium leading-snug" style={{ color: "var(--color-text-primary)" }}>
                The agent talks to the lead, following the campaign strategy and script you set.
              </p>
            </div>
            <div className="order-1 md:order-2">
              {!showcaseLoaded ? (
                <div
                  className="rounded-[var(--radius-md)] p-6 flex flex-col gap-3"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <Skeleton width="40%" height={16} />
                  <Skeleton width="100%" height={32} />
                  <Skeleton width="85%" height={80} />
                </div>
              ) : (
                <div className="flex flex-col">
                  <AIStateBanner
                    state="CONNECTED"
                    detail="Mid-Market RevOps Outreach · 02:22 duration"
                  />
                  <ConversationStatePanel state={landingMockConversationState} />
                </div>
              )}
            </div>
          </div>

          {/* Block 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="order-1 md:order-1">
              {!showcaseLoaded ? (
                <div
                  className="rounded-[var(--radius-md)] p-6 flex flex-col gap-3"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <Skeleton width="30%" height={16} />
                  <Skeleton width="100%" height={60} />
                  <Skeleton width="90%" height={70} />
                </div>
              ) : (
                <div
                  className="rounded-[var(--radius-md)] p-5"
                  style={{
                    background: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-subtle)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="mb-4">
                    <p className="text-[10px] uppercase font-semibold tracking-[0.04em] mb-2" style={{ color: "var(--color-text-muted)" }}>
                      Direct Evidence Extraction
                    </p>
                    <EvidenceSnippet
                      quote={landingMockEvidenceSnippet.quote}
                      signal={landingMockEvidenceSnippet.signal}
                      weight={landingMockEvidenceSnippet.weight}
                    />
                  </div>
                  <div className="pt-3 border-t border-[var(--color-border-subtle)]">
                    <p className="text-[10px] uppercase font-semibold tracking-[0.04em] mb-2.5" style={{ color: "var(--color-text-muted)" }}>
                      Reasoning Chain
                    </p>
                    <EvidenceThread steps={landingMockEvidenceThread} />
                  </div>
                </div>
              )}
            </div>
            <div className="order-2 md:order-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[var(--radius-sm)] mb-3 inline-block"
                style={{ background: "var(--color-action-secondary-bg)", color: "var(--color-action-primary)" }}
              >
                02 · Evidence Extraction
              </span>
              <p className="text-[18px] font-medium leading-snug" style={{ color: "var(--color-text-primary)" }}>
                It pulls the specific lines that mattered — not a summary, the actual quotes.
              </p>
            </div>
          </div>

          {/* Block 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[var(--radius-sm)] mb-3 inline-block"
                style={{ background: "var(--color-action-secondary-bg)", color: "var(--color-action-primary)" }}
              >
                03 · Transparent Thresholds
              </span>
              <p className="text-[18px] font-medium leading-snug" style={{ color: "var(--color-text-primary)" }}>
                Confidence is shown plainly. Above your threshold, it acts. Below it, it waits for you.
              </p>
            </div>
            <div className="order-1 md:order-2">
              {!showcaseLoaded ? (
                <div
                  className="rounded-[var(--radius-md)] p-6 flex flex-col gap-3"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <Skeleton width="50%" height={24} />
                  <Skeleton width="100%" height={48} />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div
                    className="p-4 rounded-[var(--radius-md)]"
                    style={{
                      background: "var(--color-bg-surface)",
                      border: "1px solid var(--color-border-subtle)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div className="text-[11px] font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
                      Campaign Autonomous Gate
                    </div>
                    <ConfidenceIndicator score={82} tier="high" variant="detail" threshold={75} />
                  </div>
                  <DecisionCard decision={landingMockDecision} threshold={75} />
                </div>
              )}
            </div>
          </div>

          {/* Block 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="order-1 md:order-1">
              {!showcaseLoaded ? (
                <div
                  className="rounded-[var(--radius-md)] p-6 flex flex-col gap-3"
                  style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <Skeleton width="40%" height={16} />
                  <Skeleton width="100%" height={120} />
                </div>
              ) : (
                <div
                  className="rounded-[var(--radius-md)] p-5"
                  style={{
                    background: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-subtle)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
                    <span className="text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Decision Audit Trace
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: "var(--color-success)" }}>
                      VERIFIED 82% CONFIDENCE
                    </span>
                  </div>
                  <DecisionTrace steps={landingMockTraceSteps} defaultOpen={true} />
                </div>
              )}
            </div>
            <div className="order-2 md:order-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[var(--radius-sm)] mb-3 inline-block"
                style={{ background: "var(--color-action-secondary-bg)", color: "var(--color-action-primary)" }}
              >
                04 · Full Auditability
              </span>
              <p className="text-[18px] font-medium leading-snug" style={{ color: "var(--color-text-primary)" }}>
                Every decision, traceable back to the exact words that produced it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4 — Autonomy, on your terms ────────────────────────────── */}
      <section
        className="py-16 px-6 md:px-12"
        style={{
          background: "var(--color-bg-surface)",
          borderTop: "1px solid var(--color-border-subtle)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="max-w-[960px] mx-auto">
          <div className="max-w-[640px] mb-12">
            <h2
              className="text-[26px] md:text-[32px] font-semibold tracking-tight mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              You decide how much the AI acts on its own.
            </h2>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Set one confidence threshold per campaign. Above it, decisions execute automatically. Below it, they land in your review queue with full context — never a silent guess.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="p-6 rounded-[var(--radius-md)] flex flex-col gap-2"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                One threshold, plain language.
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Not a matrix of settings to maintain.
              </p>
            </div>

            <div
              className="p-6 rounded-[var(--radius-md)] flex flex-col gap-2"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Review queue, not a black box.
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Approve or override, with reasoning visible.
              </p>
            </div>

            <div
              className="p-6 rounded-[var(--radius-md)] flex flex-col gap-2"
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Full outcome tracking.
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                From decision to meeting to conversion, in one funnel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5 — Early access ──────────────────────────────────────── */}
      <section id="early-access" className="py-20 px-6 md:px-12 max-w-[840px] mx-auto w-full text-center">
        <h2
          className="text-[28px] md:text-[34px] font-semibold tracking-tight mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          We're early. Your terms lock in now.
        </h2>
        <p
          className="text-[15px] max-w-[620px] mx-auto mb-10 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          IntelliCall is in early access. Teams who join now help shape the product roadmap directly — and get founding-member pricing locked in for the life of their account, before public pricing is set.
        </p>

        {/* Callout box — uses standard shadow-md / radius-md tokens per prompt §4 */}
        <div
          className="max-w-[460px] mx-auto p-8 rounded-[var(--radius-md)] text-left"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Early Access Program
            </h3>
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-pill)]"
              style={{
                background: "var(--color-action-secondary-bg)",
                color: "var(--color-action-primary)",
              }}
            >
              Founding cohort
            </span>
          </div>

          <div className="flex flex-col gap-3.5 mb-8">
            <div className="flex items-start gap-2.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px]"
                style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
              >
                ✓
              </span>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                20% off annual pricing, locked permanently
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px]"
                style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
              >
                ✓
              </span>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                Direct line to the product team
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px]"
                style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
              >
                ✓
              </span>
              <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                Priority on new campaign strategies as they ship
              </p>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => setEarlyAccessOpen(true)}
            className="w-full justify-center"
          >
            Apply for early access
          </Button>
        </div>
      </section>

      {/* ── Section 6 — FAQ ───────────────────────────────────────────────── */}
      <section
        id="faq"
        className="py-16 px-6 md:px-12"
        style={{
          background: "var(--color-bg-surface)",
          borderTop: "1px solid var(--color-border-subtle)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="max-w-[760px] mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-[26px] md:text-[32px] font-semibold tracking-tight mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="divide-y divide-[var(--color-border-subtle)]">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-primary)] rounded-[var(--radius-sm)]"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="text-[15px] font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {item.q}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="flex-shrink-0 transition-transform duration-[var(--duration-fast)]"
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="pt-2 pb-2 pr-6">
                      <p
                        className="text-[14px] leading-relaxed"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA section ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 max-w-[760px] mx-auto text-center">
        <h2
          className="text-[28px] md:text-[36px] font-semibold tracking-tight mb-3"
          style={{ color: "var(--color-text-primary)" }}
        >
          See the reasoning behind your next 10 calls.
        </h2>
        <p
          className="text-[15px] mb-8"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Start free, or talk to us first if you'd rather see it walked through live.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Button
            size="lg"
            onClick={() => navigate("/signup")}
            className="min-w-[140px] justify-center"
          >
            Get started
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setCalendlyOpen(true)}
            className="min-w-[140px] justify-center bg-[var(--color-bg-surface)]"
          >
            Book a demo
          </Button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className="px-6 md:px-12 py-8 mt-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[13px]"
        style={{
          background: "var(--color-bg-surface)",
          borderTop: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-muted)",
        }}
      >
        <div className="flex flex-wrap items-center gap-6">
          <a href="#product" className="hover:text-[var(--color-text-primary)] transition-colors">
            Product
          </a>
          <a href="#how-it-works" className="hover:text-[var(--color-text-primary)] transition-colors">
            How it works
          </a>
          <a href="#early-access" className="hover:text-[var(--color-text-primary)] transition-colors">
            Early access
          </a>
          <Link to="/signin" className="hover:text-[var(--color-text-primary)] transition-colors">
            Sign in
          </Link>
          <Link to="/signup" className="hover:text-[var(--color-text-primary)] transition-colors font-medium" style={{ color: "var(--color-action-primary)" }}>
            Get started
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-pill)] transition-colors hover:opacity-80"
            style={{
              background: "var(--color-bg-sunken)",
              border: "1px solid var(--color-border-subtle)",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: 12,
              fontWeight: 500,
            }}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
          </button>

          <span>© IntelliCall. Powered by Resonology AI.</span>
        </div>
      </footer>

      {/* Modals */}
      <CalendlyModal open={calendlyOpen} onClose={() => setCalendlyOpen(false)} />
      <EarlyAccessModal open={earlyAccessOpen} onClose={() => setEarlyAccessOpen(false)} />
    </div>
  );
}

