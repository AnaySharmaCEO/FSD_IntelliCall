import { mockCalls, mockTranscripts } from "../mock";
import type { Call, TranscriptLine } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const callsService = {
  async list(): Promise<Call[]> {
    await delay();
    return [...mockCalls];
  },
  async get(id: string): Promise<Call | null> {
    await delay(400);
    return mockCalls.find((c) => c.id === id) ?? null;
  },
  async getTranscript(callId: string): Promise<TranscriptLine[]> {
    await delay(500);
    return mockTranscripts[callId] ?? [];
  },
  async create(data: { lead_id: string; campaign_id: string; agent_id: string; mode: "now" | "schedule"; scheduled_for?: string }): Promise<Call> {
    await delay(700);
    const call: Call = {
      id: `call_${Date.now()}`,
      lead_id: data.lead_id,
      campaign_id: data.campaign_id,
      agent_id: data.agent_id,
      status: data.mode === "schedule" ? "scheduled" : "calling",
      duration_seconds: null,
      decision_id: null,
      scheduled_for: data.scheduled_for ?? null,
      started_at: new Date().toISOString(),
      ended_at: null,
    };
    mockCalls.push(call);
    return call;
  },
  async cancelScheduled(callId: string): Promise<Call | null> {
    await delay(400);
    const idx = mockCalls.findIndex((c) => c.id === callId);
    if (idx === -1) return null;
    mockCalls[idx] = { ...mockCalls[idx], status: "failed", ended_at: new Date().toISOString() };
    return mockCalls[idx];
  },
  async reschedule(callId: string, scheduledFor: string): Promise<Call | null> {
    await delay(400);
    const idx = mockCalls.findIndex((c) => c.id === callId);
    if (idx === -1) return null;
    mockCalls[idx] = { ...mockCalls[idx], scheduled_for: scheduledFor };
    return mockCalls[idx];
  },
  async progressLiveState(callId: string, status: Call["status"]): Promise<Call | null> {
    const idx = mockCalls.findIndex((c) => c.id === callId);
    if (idx === -1) return null;
    mockCalls[idx] = {
      ...mockCalls[idx],
      status,
      ...(status === "completed" ? { ended_at: new Date().toISOString() } : {}),
    };
    return mockCalls[idx];
  },
};
