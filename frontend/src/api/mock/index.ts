import type {
  ApiClient,
  CallFilterParams,
  LeadFilterParams,
  PaginatedResult,
  AnalyticsOverview,
} from '../client';
import type {
  Call,
  Agent,
  Campaign,
  Lead,
  ComplianceRule,
  PhoneNumber,
  CallAnalysis,
  Organization,
} from '../../contracts/entities';
import {
  MOCK_ORG,
  MOCK_AGENTS,
  MOCK_CAMPAIGNS,
  MOCK_LEADS,
  MOCK_CALLS,
  MOCK_ANALYSES,
  MOCK_COMPLIANCE_RULES,
  MOCK_PHONE_NUMBERS,
} from './data';

export class MockApiClient implements ApiClient {
  private org: Organization = { ...MOCK_ORG };
  private agents: Agent[] = [...MOCK_AGENTS];
  private campaigns: Campaign[] = [...MOCK_CAMPAIGNS];
  private leads: Lead[] = [...MOCK_LEADS];
  private calls: Call[] = [...MOCK_CALLS];
  private analyses: Record<string, CallAnalysis> = { ...MOCK_ANALYSES };
  private complianceRules: ComplianceRule[] = [...MOCK_COMPLIANCE_RULES];
  private phoneNumbers: PhoneNumber[] = [...MOCK_PHONE_NUMBERS];

  async listCalls(params?: CallFilterParams): Promise<PaginatedResult<Call>> {
    let result = [...this.calls];
    if (params?.status) {
      result = result.filter((c) => c.status === params.status);
    }
    if (params?.sentiment) {
      result = result.filter((c) => c.sentiment === params.sentiment);
    }
    if (params?.campaignId) {
      result = result.filter((c) => c.campaign_id === params.campaignId);
    }
    if (params?.agentId) {
      result = result.filter((c) => c.agent_id === params.agentId);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter((c) => (c.transcript || '').toLowerCase().includes(q));
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const data = result.slice(start, start + pageSize);

    return {
      data,
      count: result.length,
      page,
      pageSize,
    };
  }

  async getCall(id: string): Promise<Call | null> {
    return this.calls.find((c) => c.id === id) || null;
  }

  async getCallAnalysis(callId: string): Promise<CallAnalysis | null> {
    return this.analyses[callId] || null;
  }

  async triggerAnalysis(callId: string): Promise<{ success: boolean; analysisId?: string; error?: string }> {
    const existing = this.analyses[callId];
    if (existing) {
      return { success: true, analysisId: existing.id };
    }
    const newAnalysis: CallAnalysis = {
      id: `analysis-mock-${Date.now()}`,
      call_id: callId,
      summary: 'Automated post-call analysis completed by inline Gemini engine.',
      sentiment_overall: 'positive',
      intent_primary: 'general_query',
      intent_confidence: 0.88,
      resolution_status: 'resolved',
      satisfaction_score: 4,
      compliance_score: 0.95,
      action_items: [{ text: 'Log disposition in CRM', owner: 'system', status: 'completed' }],
      risk_signals: [],
      created_at: new Date().toISOString(),
    };
    this.analyses[callId] = newAnalysis;
    return { success: true, analysisId: newAnalysis.id };
  }

  async listAgents(): Promise<Agent[]> {
    return [...this.agents];
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agents.find((a) => a.id === id) || null;
  }

  async createAgent(agent: Partial<Agent>): Promise<Agent> {
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      organization_id: this.org.id,
      name: agent.name || 'Untitled Agent',
      voice: agent.voice || 'Puck',
      voice_speed: agent.voice_speed ?? 1.0,
      voice_temperature: agent.voice_temperature ?? 0.3,
      ambient_sound: agent.ambient_sound || 'none',
      system_prompt: agent.system_prompt || '',
      greeting: agent.greeting || 'Hello!',
      language: agent.language || 'en-IN',
      status: agent.status || 'draft',
      metadata: agent.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.agents.push(newAgent);
    return newAgent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    const idx = this.agents.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Agent ${id} not found`);
    this.agents[idx] = {
      ...this.agents[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.agents[idx];
  }

  async deleteAgent(id: string): Promise<void> {
    this.agents = this.agents.filter((a) => a.id !== id);
  }

  async listCampaigns(): Promise<Campaign[]> {
    return [...this.campaigns];
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    return this.campaigns.find((c) => c.id === id) || null;
  }

  async createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      organization_id: this.org.id,
      name: campaign.name || 'New Campaign',
      status: campaign.status || 'draft',
      agent_id: campaign.agent_id,
      daily_budget: campaign.daily_budget,
      concurrency_limit: campaign.concurrency_limit ?? 5,
      calling_hours_start: campaign.calling_hours_start || '09:00',
      calling_hours_end: campaign.calling_hours_end || '18:00',
      timezone: campaign.timezone || 'Asia/Kolkata',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.campaigns.push(newCampaign);
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const idx = this.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Campaign ${id} not found`);
    this.campaigns[idx] = {
      ...this.campaigns[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.campaigns[idx];
  }

  async listLeads(params?: LeadFilterParams): Promise<PaginatedResult<Lead>> {
    let result = [...this.leads];
    if (params?.campaignId) {
      result = result.filter((l) => l.campaign_id === params.campaignId);
    }
    if (params?.status) {
      result = result.filter((l) => l.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.first_name.toLowerCase().includes(q) ||
          (l.last_name || '').toLowerCase().includes(q) ||
          l.phone.includes(q)
      );
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      data: result.slice(start, start + pageSize),
      count: result.length,
      page,
      pageSize,
    };
  }

  async getLead(id: string): Promise<Lead | null> {
    return this.leads.find((l) => l.id === id) || null;
  }

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      organization_id: this.org.id,
      campaign_id: lead.campaign_id,
      first_name: lead.first_name || 'Prospect',
      last_name: lead.last_name,
      phone: lead.phone || '+910000000000',
      email: lead.email,
      status: lead.status || 'pending',
      custom_fields: lead.custom_fields || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.leads.push(newLead);
    return newLead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error(`Lead ${id} not found`);
    this.leads[idx] = {
      ...this.leads[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.leads[idx];
  }

  async listComplianceRules(): Promise<ComplianceRule[]> {
    return [...this.complianceRules];
  }

  async createComplianceRule(rule: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const newRule: ComplianceRule = {
      id: `rule-${Date.now()}`,
      organization_id: this.org.id,
      name: rule.name || 'New Rule',
      rule_type: rule.rule_type || 'required_phrase',
      description: rule.description,
      threshold: rule.threshold ?? 0.85,
      action_on_violation: rule.action_on_violation || 'flag',
      is_active: rule.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.complianceRules.push(newRule);
    return newRule;
  }

  async updateComplianceRule(id: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const idx = this.complianceRules.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Rule ${id} not found`);
    this.complianceRules[idx] = {
      ...this.complianceRules[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.complianceRules[idx];
  }

  async deleteComplianceRule(id: string): Promise<void> {
    this.complianceRules = this.complianceRules.filter((r) => r.id !== id);
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    return [...this.phoneNumbers];
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const totalCalls = this.calls.length;
    const totalDuration = this.calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
    const avgDuration = totalCalls ? Math.round(totalDuration / totalCalls) : 0;

    return {
      totalCalls,
      totalDurationSeconds: totalDuration,
      avgDurationSeconds: avgDuration,
      sentimentBreakdown: {
        positive: this.calls.filter((c) => c.sentiment === 'positive').length,
        neutral: this.calls.filter((c) => c.sentiment === 'neutral').length,
        negative: this.calls.filter((c) => c.sentiment === 'negative').length,
        mixed: this.calls.filter((c) => c.sentiment === 'mixed').length,
      },
      funnelMetrics: {
        connected: totalCalls,
        engaged: this.calls.filter((c) => (c.duration_seconds || 0) > 30).length,
        converted: this.leads.filter((l) => l.status === 'converted').length,
        dropped: this.calls.filter((c) => (c.duration_seconds || 0) < 30).length,
      },
      recentTrends: [
        { date: '2026-10-15', calls: 12, conversions: 3, avgSentimentScore: 78 },
        { date: '2026-10-16', calls: 18, conversions: 5, avgSentimentScore: 82 },
        { date: '2026-10-17', calls: 24, conversions: 7, avgSentimentScore: 85 },
        { date: '2026-10-18', calls: 30, conversions: 9, avgSentimentScore: 88 },
        { date: '2026-10-19', calls: 35, conversions: 11, avgSentimentScore: 89 },
      ],
    };
  }

  async getOrganization(): Promise<Organization | null> {
    return this.org;
  }

  async updateOrganization(updates: Partial<Organization>): Promise<Organization> {
    this.org = {
      ...this.org,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.org;
  }
}
