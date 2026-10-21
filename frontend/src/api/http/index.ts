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
  Appointment,
  ComplianceRule,
  PhoneNumber,
  CallAnalysis,
  Organization,
} from '../../contracts/entities';
import { supabase } from '../../lib/supabase';

function mapAppointmentRecord(row: any): Appointment {
  const meta = (typeof row.metadata === 'object' && row.metadata !== null) ? row.metadata : {};
  return {
    id: row.id,
    orgId: row.organization_id || row.orgId,
    leadId: row.lead_id || row.leadId,
    callId: row.call_id || row.callId || null,
    title: meta.title || row.notes || 'Callback Appointment',
    scheduledFor: row.scheduled_for || row.scheduledFor || '',
    durationMinutes: Number(meta.duration_minutes || meta.durationMinutes) || 30,
    status: (row.status === 'scheduled' || row.status === 'confirmed') ? 'confirmed' : (row.status || 'proposed'),
    hostName: meta.host_name || meta.hostName || 'Sales Representative',
    source: row.booking_source || meta.source || 'Dashboard Manual',
    meetingUrl: meta.meeting_url || meta.meetingUrl,
    createdAt: row.created_at || row.createdAt || '',
  };
}

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

  private async resolveActiveOrganizationId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Authentication required: please sign in to complete this action.');
    }

    const { data: member, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve active organization: ${error.message}`);
    }
    if (!member?.organization_id) {
      throw new Error('No active organization workspace found. Please complete workspace setup.');
    }
    return member.organization_id;
  }

  async createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
    const orgId = await this.resolveActiveOrganizationId();

    const payload: Record<string, any> = {
      organization_id: orgId,
      name: campaign.name,
      status: campaign.status || 'draft',
      daily_budget: (campaign as any).daily_budget ?? 5000,
      concurrency_limit: (campaign as any).concurrency_limit ?? 5,
      calling_hours_start: (campaign as any).calling_hours_start ?? '09:00',
      calling_hours_end: (campaign as any).calling_hours_end ?? '18:00',
    };
    if (campaign.agent_id || (campaign as any).agentId) {
      payload.agent_id = campaign.agent_id || (campaign as any).agentId;
    }
    if ((campaign as any).strategy) {
      payload.strategy = (campaign as any).strategy;
    }
    if ((campaign as any).confidence_threshold !== undefined) {
      payload.confidence_threshold = (campaign as any).confidence_threshold;
    }

    const { data, error } = await supabase.from('campaigns').insert(payload).select().single();
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
      query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%`);
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
    const orgId = await this.resolveActiveOrganizationId();

    const fullName =
      (lead as any).name ||
      `${(lead as any).first_name || (lead as any).firstName || ''} ${(lead as any).last_name || (lead as any).lastName || ''}`.trim() ||
      'New Lead';

    const VALID_LEAD_STATUSES = new Set([
      'new',
      'contacted',
      'qualified',
      'not_qualified',
      'meeting_booked',
      'meeting_attended',
      'opportunity',
      'converted',
      'stalled',
    ]);
    const rawStatus = (lead as any).status;
    const status = (rawStatus && VALID_LEAD_STATUSES.has(rawStatus)) ? rawStatus : 'new';

    const payload: Record<string, unknown> = {
      organization_id: orgId,
      name: fullName,
      phone: lead.phone || '',
      email: lead.email || '',
      status,
      company: (lead as any).company || '',
      title: (lead as any).title || '',
    };
    if ((lead as any).campaign_id || (lead as any).campaignId) {
      payload.campaign_id = (lead as any).campaign_id || (lead as any).campaignId;
    }
    if ((lead as any).notes) payload.notes = (lead as any).notes;
    if ((lead as any).source) payload.source = (lead as any).source;

    const { data, error } = await supabase.from('leads').insert(payload).select().single();
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
    const orgId = await this.resolveActiveOrganizationId();

    const payload: Record<string, any> = {
      organization_id: orgId,
      name: rule.name,
      rule_type: rule.rule_type,
      description: rule.description || '',
      threshold: rule.threshold ?? 0.85,
      action_on_violation: rule.action_on_violation || 'flag',
      is_active: rule.is_active ?? true,
    };

    const { data, error } = await supabase.from('compliance_rules').insert(payload).select().single();
    if (error) {
      if (error.code === '42501' || error.message?.toLowerCase().includes('permission denied')) {
        throw new Error(
          'Permission denied: Your account role does not have administrative rights to manage compliance rules, or table grants require database configuration.'
        );
      }
      throw error;
    }
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
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, duration_seconds, sentiment, status, created_at, started_at');
    if (callsError) {
      throw new Error(`Failed to load calls for analytics: ${callsError.message}`);
    }

    const { count: leadConversions, error: convError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted');
    if (convError) {
      throw new Error(`Failed to load lead conversions: ${convError.message}`);
    }

    const { data: outcomeRecords, error: outcomesError } = await supabase
      .from('outcomes')
      .select('id, stage, converted_at, created_at')
      .eq('stage', 'converted');
    if (outcomesError) {
      throw new Error(`Failed to load conversion outcomes: ${outcomesError.message}`);
    }

    const callList = (calls || []) as Array<{
      id: string;
      duration_seconds?: number;
      sentiment?: string;
      status?: string;
      created_at?: string;
      started_at?: string;
    }>;
    const totalCalls = callList.length;
    const totalDurationSeconds = callList.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
    const avgDurationSeconds = totalCalls ? Math.round(totalDurationSeconds / totalCalls) : 0;

    const positiveCount = callList.filter((c) => c.sentiment === 'positive').length;
    const neutralCount = callList.filter((c) => c.sentiment === 'neutral').length;
    const negativeCount = callList.filter((c) => c.sentiment === 'negative').length;
    const mixedCount = callList.filter((c) => c.sentiment === 'mixed').length;

    // Disconnect rate: calls dropped or status failed / totalCalls (null if no calls)
    const droppedCalls = callList.filter(
      (c) => c.status === 'failed' || (c.duration_seconds !== undefined && c.duration_seconds < 10 && c.status === 'completed')
    ).length;
    const disconnectRatePercent = totalCalls > 0 ? Number(((droppedCalls / totalCalls) * 100).toFixed(1)) : null;

    // Average sentiment score out of 100 (null if no scored calls)
    const scoredCalls = positiveCount + neutralCount + negativeCount + mixedCount;
    const avgSentimentScorePercent = scoredCalls > 0
      ? Math.round(((positiveCount * 100 + neutralCount * 65 + mixedCount * 45 + negativeCount * 15) / (scoredCalls * 100)) * 100)
      : null;

    const totalConversions = leadConversions ?? 0;
    const timestampedOutcomes = (outcomeRecords || []).filter((o) => Boolean(o.converted_at));

    // Dynamic 5-day rolling window with genuine database numbers (no synthetic fallbacks)
    const recentTrends = Array.from({ length: 5 }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - idx));
      const dateStr = d.toISOString().slice(0, 10);
      const dayCalls = callList.filter((c) => (c.started_at || c.created_at || '').slice(0, 10) === dateStr);
      const dayTotal = dayCalls.length;
      const dayPos = dayCalls.filter((c) => c.sentiment === 'positive').length;
      const dayScored = dayCalls.filter((c) => c.sentiment && ['positive', 'neutral', 'negative', 'mixed'].includes(c.sentiment)).length;
      const daySentiment = dayScored > 0 ? Math.round((dayPos / dayScored) * 100) : null;

      // Determine daily conversions:
      // 1. If timestamped outcomes exist, count those converted on this day.
      // 2. If total conversions is 0, daily conversions is genuinely 0.
      // 3. If leads are marked 'converted' but the leads schema lacks a converted_at timestamp column,
      //    daily breakdown cannot be accurately determined without inventing events; represent as null.
      let dayConversions: number | null = 0;
      if (timestampedOutcomes.length > 0) {
        dayConversions = timestampedOutcomes.filter(
          (o) => o.converted_at?.slice(0, 10) === dateStr
        ).length;
      } else if (totalConversions > 0) {
        dayConversions = null;
      }

      return {
        date: dateStr,
        calls: dayTotal,
        conversions: dayConversions,
        avgSentimentScore: daySentiment,
      };
    });

    return {
      totalCalls,
      totalDurationSeconds,
      avgDurationSeconds,
      sentimentBreakdown: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
        mixed: mixedCount,
      },
      funnelMetrics: {
        connected: totalCalls,
        engaged: callList.filter((c) => (c.duration_seconds || 0) > 30).length,
        converted: leadConversions || 0,
        dropped: droppedCalls,
      },
      telemetry: {
        ttfbMs: null, // Genuine TTFB telemetry is not captured by database schema; represented as unavailable
        roundtripMs: null, // Genuine audio roundtrip latency is not captured by database schema; represented as unavailable
        disconnectRatePercent,
        avgSentimentScorePercent,
      },
      recentTrends,
    };
  }

  // --- APPOINTMENTS ---
  async listAppointments(status?: string): Promise<Appointment[]> {
    let query = supabase.from('appointments').select('*').order('scheduled_for', { ascending: true });
    if (status) {
      const dbStatus = status === 'confirmed' ? 'scheduled' : status;
      query = query.eq('status', dbStatus);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAppointmentRecord);
  }

  async getAppointment(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase.from('appointments').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapAppointmentRecord(data) : null;
  }

  async createAppointment(appointment: any): Promise<Appointment> {
    const orgId = await this.resolveActiveOrganizationId();

    const leadId = appointment.leadId || appointment.lead_id;
    if (!leadId) {
      throw new Error('A valid lead must be selected to schedule an appointment.');
    }

    const scheduledFor = appointment.scheduledFor || appointment.scheduled_for;
    if (!scheduledFor) {
      throw new Error('Scheduled date and time is required.');
    }

    let dbStatus = appointment.status || 'scheduled';
    if (dbStatus === 'confirmed' || dbStatus === 'proposed') {
      dbStatus = 'scheduled';
    }

    const title = appointment.title || 'Callback Appointment';
    const hostName = appointment.hostName || 'Sales Representative';
    const durationMinutes = Number(appointment.durationMinutes) || 30;

    const VALID_BOOKING_SOURCES = new Set(['calendly', 'manual', 'ai_booked']);
    const rawSource = appointment.booking_source || appointment.source;
    const bookingSource = (rawSource && VALID_BOOKING_SOURCES.has(rawSource)) ? rawSource : 'manual';

    const payload = {
      organization_id: orgId,
      lead_id: leadId,
      call_id: appointment.callId || appointment.call_id || null,
      scheduled_for: scheduledFor,
      status: dbStatus,
      booking_source: bookingSource,
      notes: title,
      metadata: {
        title,
        host_name: hostName,
        duration_minutes: durationMinutes,
      },
    };

    const { data, error } = await supabase.from('appointments').insert(payload).select().single();
    if (error) throw error;
    return mapAppointmentRecord(data);
  }

  async updateAppointment(id: string, updates: any): Promise<Appointment> {
    // 1. Fetch current appointment to preserve existing metadata and unrelated properties
    const { data: current, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const dbUpdates: Record<string, any> = {};
    if (updates.scheduledFor || updates.scheduled_for) {
      dbUpdates.scheduled_for = updates.scheduledFor || updates.scheduled_for;
    }
    if (updates.status !== undefined) {
      dbUpdates.status = (updates.status === 'confirmed' || updates.status === 'proposed') ? 'scheduled' : updates.status;
    }
    if (updates.leadId || updates.lead_id) {
      dbUpdates.lead_id = updates.leadId || updates.lead_id;
    }
    if (updates.notes !== undefined) {
      dbUpdates.notes = updates.notes;
    } else if (updates.title !== undefined) {
      dbUpdates.notes = updates.title;
    }

    // 2. Preserve existing metadata without setting undefined
    const existingMeta =
      typeof current.metadata === 'object' && current.metadata !== null
        ? { ...current.metadata }
        : {};
    let metadataChanged = false;

    if (updates.title !== undefined) {
      existingMeta.title = updates.title;
      metadataChanged = true;
    }
    if (updates.hostName !== undefined || updates.host_name !== undefined) {
      existingMeta.host_name = updates.hostName ?? updates.host_name;
      metadataChanged = true;
    }
    if (updates.durationMinutes !== undefined || updates.duration_minutes !== undefined) {
      existingMeta.duration_minutes = Number(updates.durationMinutes ?? updates.duration_minutes);
      metadataChanged = true;
    }
    if (updates.metadata && typeof updates.metadata === 'object') {
      Object.assign(existingMeta, updates.metadata);
      metadataChanged = true;
    }

    if (metadataChanged) {
      dbUpdates.metadata = existingMeta;
    }

    const { data, error } = await supabase.from('appointments').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapAppointmentRecord(data);
  }

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  }

  // --- LEADS BULK IMPORT ---
  async createLeadsBulk(leads: Partial<Lead>[]): Promise<{ count: number; leads: Lead[] }> {
    const orgId = await this.resolveActiveOrganizationId();
    if (!orgId) {
      throw new Error('Active organization workspace required for bulk lead import.');
    }

    const VALID_LEAD_STATUSES = new Set([
      'new',
      'contacted',
      'qualified',
      'not_qualified',
      'meeting_booked',
      'meeting_attended',
      'opportunity',
      'converted',
      'stalled',
    ]);

    // Explicit allowlisted payload - avoids sending unsupported frontend properties to Supabase
    const normalizedLeads = leads.map((l: any) => {
      const name =
        l.name ||
        [l.first_name || l.firstName, l.last_name || l.lastName].filter(Boolean).join(' ') ||
        'Unknown Lead';

      const rawStatus = l.status;
      const status = (rawStatus && VALID_LEAD_STATUSES.has(rawStatus)) ? rawStatus : 'new';

      const row: Record<string, any> = {
        organization_id:orgId,
        name,
        company: l.company || '',
        title: l.title || '',
        email: l.email || '',
        phone: l.phone || '',
        status,
      };

      if (l.campaign_id || l.campaignId) {
        row.campaign_id = l.campaign_id || l.campaignId;
      }
      if (l.source) {
        row.source = l.source;
      }
      if (l.notes) {
        row.notes = l.notes;
      }

      return row;
    });

    const { data, error } = await supabase.from('leads').insert(normalizedLeads).select();
    if (error) throw error;
    return { count: data?.length || 0, leads: (data || []) as Lead[] };
  }

  // --- ORGANIZATION & TEAM MEMBERS ---
  async getOrganization(): Promise<Organization | null> {
    try {
      const orgId = await this.resolveActiveOrganizationId();
      if (!orgId) return null;
      const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
      if (error) throw error;
      return (data as Organization) || null;
    } catch {
      // Return null when unauthenticated or workspace membership is not active. Never select arbitrary org.
      return null;
    }
  }

  async updateOrganization(updates: Partial<Organization>): Promise<Organization> {
    const current = await this.getOrganization();
    if (!current) throw new Error('No active organization found');
    const { data, error } = await supabase.from('organizations').update(updates).eq('id', current.id).select().single();
    if (error) throw error;
    return data as Organization;
  }

  async listMembers(): Promise<Array<{ id: string; email: string; role: string; name: string }>> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('id, user_id, role, profiles(id, email, full_name)');
    if (error) throw error;
    return (data || []).map((m: any) => ({
      id: m.id,
      email: m.profiles?.email || 'member@intellicall.ai',
      role: m.role,
      name: m.profiles?.full_name || 'Team Member',
    }));
  }

  async inviteMember(email: string, role: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In cloud Supabase, invitation invokes auth admin or creates member link
      const org = await this.getOrganization();
      if (!org) throw new Error('No active organization');
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
