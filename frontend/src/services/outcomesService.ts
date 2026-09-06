import { mockOutcomes, mockOutcomeFunnel } from "../mock";
import type { Outcome } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const outcomesService = {
  async list(): Promise<Outcome[]> {
    await delay();
    return [...mockOutcomes];
  },
  async get(id: string): Promise<Outcome | null> {
    await delay(400);
    return mockOutcomes.find((o) => o.id === id) ?? null;
  },
  async getFunnel() {
    await delay(400);
    return mockOutcomeFunnel;
  },
};
