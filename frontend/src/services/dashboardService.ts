import { mockDashboardStats, mockCampaignPerformance } from "../mock";

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export const dashboardService = {
  async getStats() {
    await delay(500);
    return { ...mockDashboardStats };
  },
  async getCampaignPerformance() {
    await delay(400);
    return [...mockCampaignPerformance];
  },
};
