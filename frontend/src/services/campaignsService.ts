import { mockCampaigns } from "../mock";
import type { Campaign } from "../types";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const campaignsService = {
  async list(): Promise<Campaign[]> {
    await delay();
    return [...mockCampaigns];
  },
  async get(id: string): Promise<Campaign | null> {
    await delay(400);
    return mockCampaigns.find((c) => c.id === id) ?? null;
  },
  async create(data: Partial<Campaign>): Promise<Campaign> {
    await delay(800);
    const campaign: Campaign = {
      id: `camp_${Date.now()}`,
      name: data.name ?? "New Campaign",
      status: "draft",
      agent_id: data.agent_id ?? "",
      confidence_threshold: data.confidence_threshold ?? 80,
      leads_targeted: 0,
      qualification_rate: null,
      meetings_booked: 0,
      strategy: data.strategy ?? "direct_qualification",
      created_at: new Date().toISOString(),
    };
    mockCampaigns.push(campaign);
    return campaign;
  },
  async update(id: string, data: Partial<Campaign>): Promise<Campaign | null> {
    await delay(400);
    const idx = mockCampaigns.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    mockCampaigns[idx] = { ...mockCampaigns[idx], ...data };
    return mockCampaigns[idx];
  },
};
