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
import { supabase } from '../../lib/supabase';

export class SupabaseApiClient implements ApiClient {
  async listCalls(params?: CallFilterParams): Promise<PaginatedResult<Call>> {
    let query = supabase.from('calls').select('*', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.sentiment) {
      query = query.eq('sentiment', params.sentiment);
    }
    if (params?.campaignId) {
      query = query.eq('campaign_id', params.campaignId);
    }
    if (params?.agentId) {
      query = query.eq('agent_id', params.agentId);
    }
    if (params?.search) {
      query = query.ilike('transcript', `%${params.search}%`);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as Call[],
      count: count || 0,
      page,
      pageSize,
    };
  }

  async getCall(id: string): Promise<Call | null> {
    const { data, error } = await supabase.from('calls').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Call) || null;
  }

  async getCallAnalysis(callId: string): Promise<CallAnalysis | null> {
    const { data, error } = await supabase.from('call_analyses').select('*').eq('call_id', callId).maybeSingle();
    if (error) throw error;
    return (data as CallAnalysis) || null;
  }

  async triggerAnalysis(callId: string): Promise<{ success: boolean; analysisId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('analysis-run', {
        body: { call_id: callId },
      });
      if (error) throw error;
      return { success: true, analysisId: data?.analysis_id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async listAgents(): Promise<Agent[]> {
    const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Agent[];
  }

  async getAgent(id: string): Promise<Agent | null> {
    const { data, error } = await supabase.from('agents').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Agent) || null;
  }

  async createAgent(agent: Partial<Agent>): Promise<Agent> {
    const { data, error } = await supabase.from('agents').insert(agent).select().single();
    if (error) throw error;
    return data as Agent;
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    const { data, error } = await supabase.from('agents').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Agent;
  }

  async deleteAgent(id: string): Promise<void> {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw error;
  }

  async listCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Campaign[];
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Campaign) || null;
  }

  async createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase.from('campaigns').insert(campaign).select().single();
    if (error) throw error;
    return data as Campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase.from('campaigns').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Campaign;
  }

  async listLeads(params?: LeadFilterParams): Promise<PaginatedResult<Lead>> {
    let query = supabase.from('leads').select('*', { count: 'exact' });

    if (params?.campaignId) {
      query = query.eq('campaign_id', params.campaignId);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.search) {
      query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []) as Lead[],
      count: count || 0,
      page,
      pageSize,
    };
  }

  async getLead(id: string): Promise<Lead | null> {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Lead) || null;
  }

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase.from('leads').insert(lead).select().single();
    if (error) throw error;
    return data as Lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Lead;
  }

  async listComplianceRules(): Promise<ComplianceRule[]> {
    const { data, error } = await supabase.from('compliance_rules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ComplianceRule[];
  }

  async createComplianceRule(rule: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const { data, error } = await supabase.from('compliance_rules').insert(rule).select().single();
    if (error) throw error;
    return data as ComplianceRule;
  }

  async updateComplianceRule(id: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule> {
    const { data, error } = await supabase.from('compliance_rules').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as ComplianceRule;
  }

  async deleteComplianceRule(id: string): Promise<void> {
    const { error } = await supabase.from('compliance_rules').delete().eq('id', id);
    if (error) throw error;
  }

  async listPhoneNumbers(): Promise<PhoneNumber[]> {
    const { data, error } = await supabase.from('phone_numbers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as PhoneNumber[];
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const { data: calls } = await supabase.from('calls').select('id, duration_seconds, sentiment');
    const { count: leadConversions } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converted');

    const callList = calls || [];
    const totalCalls = callList.length;
    const totalDurationSeconds = callList.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
    const avgDurationSeconds = totalCalls ? Math.round(totalDurationSeconds / totalCalls) : 0;

    return {
      totalCalls,
      totalDurationSeconds,
      avgDurationSeconds,
      sentimentBreakdown: {
        positive: callList.filter((c) => c.sentiment === 'positive').length,
        neutral: callList.filter((c) => c.sentiment === 'neutral').length,
        negative: callList.filter((c) => c.sentiment === 'negative').length,
        mixed: callList.filter((c) => c.sentiment === 'mixed').length,
      },
      funnelMetrics: {
        connected: totalCalls,
        engaged: callList.filter((c) => (c.duration_seconds || 0) > 30).length,
        converted: leadConversions || 0,
        dropped: callList.filter((c) => (c.duration_seconds || 0) < 30).length,
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
    const { data, error } = await supabase.from('organizations').select('*').limit(1).maybeSingle();
    if (error) throw error;
    return (data as Organization) || null;
  }

  async updateOrganization(updates: Partial<Organization>): Promise<Organization> {
    const current = await this.getOrganization();
    if (!current) throw new Error('No active organization found');
    const { data, error } = await supabase.from('organizations').update(updates).eq('id', current.id).select().single();
    if (error) throw error;
    return data as Organization;
  }
}
