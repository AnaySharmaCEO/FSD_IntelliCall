import { mockLeads } from "../mock";
import type { Lead } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const leadsService = {
  async list(): Promise<Lead[]> {
    await delay();
    return [...mockLeads];
  },
  async get(id: string): Promise<Lead | null> {
    await delay(400);
    return mockLeads.find((l) => l.id === id) ?? null;
  },
  async create(data: Partial<Lead>): Promise<Lead> {
    await delay(800);
    const lead: Lead = {
      id: `lead_${Date.now()}`,
      name: data.name ?? "New Lead",
      company: data.company ?? "",
      title: data.title ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      status: "new",
      campaign_id: data.campaign_id ?? null,
      owner_id: data.owner_id ?? null,
      confidence_score: null,
      confidence_tier: null,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      notes: data.notes ?? null,
    };
    mockLeads.push(lead);
    return lead;
  },
  async update(id: string, data: Partial<Lead>): Promise<Lead | null> {
    await delay(400);
    const idx = mockLeads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    mockLeads[idx] = { ...mockLeads[idx], ...data };
    return mockLeads[idx];
  },
};
