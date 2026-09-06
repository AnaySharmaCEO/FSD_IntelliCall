import { mockAgents } from "../mock";
import type { Agent } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const agentsService = {
  async list(): Promise<Agent[]> {
    await delay();
    return [...mockAgents];
  },
  async get(id: string): Promise<Agent | null> {
    await delay(400);
    return mockAgents.find((a) => a.id === id) ?? null;
  },
};
