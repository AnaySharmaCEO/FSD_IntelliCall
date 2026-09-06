import { mockActions } from "../mock";
import type { Action } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const actionsService = {
  async list(): Promise<Action[]> {
    await delay();
    return [...mockActions];
  },
  async execute(id: string): Promise<Action | null> {
    await delay(800);
    const idx = mockActions.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    mockActions[idx] = {
      ...mockActions[idx],
      status: "executed",
      executed_at: new Date().toISOString(),
    };
    return mockActions[idx];
  },
};
