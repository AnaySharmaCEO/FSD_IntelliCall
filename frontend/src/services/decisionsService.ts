import { mockDecisions } from "../mock";
import type { Decision } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const decisionsService = {
  async list(): Promise<Decision[]> {
    await delay();
    return [...mockDecisions];
  },
  async get(id: string): Promise<Decision | null> {
    await delay(400);
    return mockDecisions.find((d) => d.id === id) ?? null;
  },
  async approve(id: string, userId: string): Promise<Decision | null> {
    await delay(600);
    const idx = mockDecisions.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    mockDecisions[idx] = {
      ...mockDecisions[idx],
      action_status: "executed",
      actual_action: mockDecisions[idx].recommended_action,
      reviewed_at: new Date().toISOString(),
    };
    return mockDecisions[idx];
  },
  async override(id: string, userId: string): Promise<Decision | null> {
    await delay(600);
    const idx = mockDecisions.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    mockDecisions[idx] = {
      ...mockDecisions[idx],
      action_status: "dismissed",
      outcome: "not_qualified",
      overridden_by: userId,
      reviewed_at: new Date().toISOString(),
    };
    return mockDecisions[idx];
  },
};
