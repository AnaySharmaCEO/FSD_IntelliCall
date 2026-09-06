import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDashboard, useDecisions, useOutcomeFunnel } from "../hooks";
import { SkeletonTable } from "../components/ui/Skeleton";
import ErrorInline from "../components/ui/ErrorInline";
import AIStateBanner from "../components/shared/AIStateBanner";
import Button from "../components/ui/Button";
import type { Decision } from "../types";
import { mockLeads, mockCampaigns } from "../mock";

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  delta,
  deltaUp,
}: {
  label: string;
  value: string;
  delta: string;
  deltaUp: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-md)] p-4"
      style={{
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p
        className="font-semibold leading-none mb-1.5"
        style={{
          fontFamily: "var(--font-data)",
          fontSize: 28,
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </p>
      <p
        className="text-[12px] font-medium"
        style={{ color: deltaUp ? "var(--color-success)" : "var(--color-error)" }}
      >
        {delta}
      </p>
    </div>
  );
}

// ── Funnel stage ──────────────────────────────────────────────────────────────

function FunnelStage({
  label,
  count,
  prevCount,
  isLast,
}: {
  label: string;
  count: number;
  prevCount?: number;
  isLast?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center relative">
      {!isLast && (
        <span
          className="absolute right-0 top-5 text-lg leading-none z-10"
          style={{ color: "var(--color-border-default)" }}
          aria-hidden
        >
          ›
        </span>
      )}
      <span
        className="text-[22px] font-semibold leading-none mb-1"
        style={{ fontFamily: "var(--font-data)", color: "var(--color-action-primary)" }}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      {prevCount !== undefined && (
        <span
          className="text-[10px] mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {Math.round((count / prevCount) * 100)}%
        </span>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, performance } = useDashboard();
  const {
    data: decisions,
    loading: decisionsLoading,
    error: decisionsError,
    reload: reloadDecisions,
  } = useDecisions();
  const { data: funnel, loading: funnelLoading } = useOutcomeFunnel();

  const [localDecisions, setLocalDecisions] = useState<Decision[] | null>(null);
  const source = localDecisions ?? decisions ?? [];

  const reviewFirst = [...source].sort((a, b) => {
    const aReview = a.outcome === "review_required" && a.action_status === "pending" ? 0 : 1;
    const bReview = b.outcome === "review_required" && b.action_status === "pending" ? 0 : 1;
    return aReview - bReview;
  });
  const recentDecisions = reviewFirst.slice(0, 3);
  const reviewCount = source.filter(
    d => d.outcome === "review_required" && d.action_status === "pending"
  ).length;

  const handleDecisionUpdate = (updated: Decision) => {
    const base = localDecisions ?? decisions ?? [];
    setLocalDecisions(base.map(d => (d.id === updated.id ? updated : d)));
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-semibold mb-1"
            style={{ fontSize: 22, color: "var(--color-text-primary)" }}
          >
            Dashboard
          </h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Operational and decision-intelligence overview for Acme Outbound.
          </p>
        </div>
        <Link to="/campaigns/new">
          <Button>Create campaign</Button>
        </Link>
      </div>

      {/* KPI grid */}
      {stats.loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-md)] animate-[ic-shimmer_1.5s_infinite]"
              style={{
                height: 96,
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-subtle)",
              }}
            />
          ))}
        </div>
      ) : stats.error ? (
        <div className="mb-6">
          <ErrorInline message="Couldn't load metrics." onRetry={stats.reload} />
        </div>
      ) : stats.data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Calls made"
            value={stats.data.calls_made.toLocaleString()}
            delta={stats.data.calls_made_delta}
            deltaUp={stats.data.calls_made_delta_up}
          />
          <KPICard
            label="Qualification rate"
            value={`${stats.data.qualification_rate}%`}
            delta={stats.data.qualification_rate_delta}
            deltaUp={stats.data.qualification_rate_delta_up}
          />
          <KPICard
            label="Meetings booked"
            value={String(stats.data.meetings_booked)}
            delta={stats.data.meetings_booked_delta}
            deltaUp={stats.data.meetings_booked_delta_up}
          />
          <KPICard
            label="Decision accuracy"
            value={`${stats.data.decision_accuracy}%`}
            delta={stats.data.decision_accuracy_delta}
            deltaUp={true}
          />
        </div>
      ) : null}

      {/* Panel row: decisions + campaign performance */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4 mb-6">
        {/* Recent decisions */}
        <div
          className="rounded-[var(--radius-md)]"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <h2 className="text-[15px] font-semibold">Recent decisions</h2>
            <Link
              to="/decisions"
              className="text-[12px] font-semibold hover:underline"
              style={{ color: "var(--color-action-primary)" }}
            >
              View all →
            </Link>
          </div>
          {/* Compact decision rows — one row per decision, no inline actions */}
          {decisionsLoading ? (
            <SkeletonTable rows={3} />
          ) : decisionsError ? (
            <div className="p-4">
              <ErrorInline message="Couldn't load decisions." onRetry={reloadDecisions} />
            </div>
          ) : recentDecisions.length === 0 ? (
            <p
              className="text-[13px] text-center py-8"
              style={{ color: "var(--color-text-muted)" }}
            >
              No decisions yet.
            </p>
          ) : (
            <div>
              {reviewCount > 0 && (
                <div className="px-4 pt-4">
                  <AIStateBanner
                    state="REVIEW_REQUIRED"
                    detail={`${reviewCount} decision${reviewCount !== 1 ? "s" : ""} need review`}
                  />
                </div>
              )}
              {recentDecisions.map(d => {
                const lead = mockLeads.find(l => l.id === d.lead_id);
                const isReview = d.outcome === "review_required" && d.action_status === "pending";
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 px-4 py-3 text-[13px]"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                  >
                    {/* Status dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: isReview
                          ? "var(--color-warning)"
                          : d.outcome === "qualified"
                          ? "var(--color-success)"
                          : "var(--color-error)",
                      }}
                    />
                    {/* Lead name */}
                    <span
                      className="font-medium flex-1 truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {lead?.name ?? "—"}
                    </span>
                    {/* Confidence */}
                    <span
                      className="flex-shrink-0 text-[12px]"
                      style={{ fontFamily: "var(--font-data)", color: "var(--color-text-muted)" }}
                    >
                      {d.confidence_score}%
                    </span>
                    {/* Reason — single line */}
                    <span
                      className="hidden lg:block flex-1 truncate text-[12px]"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {d.reason}
                    </span>
                    {/* Review link */}
                    <Link
                      to={`/decisions/${d.id}`}
                      className="flex-shrink-0 text-[12px] font-semibold hover:underline"
                      style={{ color: "var(--color-action-primary)" }}
                    >
                      {isReview ? "Review" : "View"} →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campaign performance — horizontal ranked-bar list */}
        <div
          className="rounded-[var(--radius-md)]"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <h2 className="text-[15px] font-semibold">Campaign performance</h2>
            <Link
              to="/campaigns"
              className="text-[12px] font-semibold hover:underline"
              style={{ color: "var(--color-action-primary)" }}
            >
              View all →
            </Link>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {performance.loading ? (
              <>
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className="rounded animate-[ic-shimmer_1.5s_infinite]"
                    style={{ height: 32, background: "var(--color-bg-sunken)" }}
                  />
                ))}
              </>
            ) : performance.data ? (
              [...performance.data]
                .sort((a, b) => b.rate - a.rate)
                .map(row => (
                  <div key={row.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[12px] font-medium truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {row.name}
                      </span>
                      <span
                        className="text-[12px] flex-shrink-0 ml-3"
                        style={{ fontFamily: "var(--font-data)", color: "var(--color-text-secondary)" }}
                      >
                        {row.rate}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-[var(--radius-pill)]"
                      style={{ background: "var(--color-bg-sunken)" }}
                    >
                      <div
                        className="h-full rounded-[var(--radius-pill)]"
                        style={{
                          width: `${row.rate}%`,
                          background: "var(--color-action-primary-solid)",
                          transition: "width var(--duration-base) var(--easing-standard)",
                        }}
                      />
                    </div>
                  </div>
                ))
            ) : null}
          </div>
        </div>
      </div>

      {/* Outcome funnel */}
      <div
        className="rounded-[var(--radius-md)] mb-6"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3.5"
          style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
        >
          <h2 className="text-[15px] font-semibold">Decision → Outcome funnel</h2>
          <Link
            to="/outcomes"
            className="text-[12px] font-semibold hover:underline"
            style={{ color: "var(--color-action-primary)" }}
          >
            View outcomes →
          </Link>
        </div>
        <div className="px-4 py-5">
          {funnelLoading ? (
            <div
              className="rounded animate-[ic-shimmer_1.5s_infinite]"
              style={{ height: 56, background: "var(--color-bg-sunken)" }}
            />
          ) : funnel ? (
            <div className="flex items-start gap-0">
              {funnel.map((stage, i) => (
                <FunnelStage
                  key={stage.stage}
                  label={stage.stage}
                  count={stage.count}
                  prevCount={i > 0 ? funnel[i - 1].count : undefined}
                  isLast={i === funnel.length - 1}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
