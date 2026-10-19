import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiClient, CallFilterParams, LeadFilterParams } from '../client';
import { MockApiClient } from '../mock';
import { SupabaseApiClient } from '../http';
import type { Agent, Campaign, Lead, ComplianceRule, Organization } from '../../contracts/entities';

const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';
export const apiClient: ApiClient = useMockApi
  ? new MockApiClient()
  : new SupabaseApiClient();

// --- CALLS ---
export function useCalls(params?: CallFilterParams) {
  return useQuery({
    queryKey: ['calls', params],
    queryFn: () => apiClient.listCalls(params),
  });
}

export function useCall(id: string | undefined) {
  return useQuery({
    queryKey: ['call', id],
    queryFn: () => (id ? apiClient.getCall(id) : null),
    enabled: Boolean(id),
  });
}

export function useCallAnalysis(callId: string | undefined) {
  return useQuery({
    queryKey: ['call-analysis', callId],
    queryFn: () => (callId ? apiClient.getCallAnalysis(callId) : null),
    enabled: Boolean(callId),
  });
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (callId: string) => apiClient.triggerAnalysis(callId),
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: ['call-analysis', callId] });
      queryClient.invalidateQueries({ queryKey: ['call', callId] });
    },
  });
}

// --- AGENTS ---
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.listAgents(),
  });
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => (id ? apiClient.getAgent(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agent: Partial<Agent>) => apiClient.createAgent(agent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Agent> }) =>
      apiClient.updateAgent(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', id] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteAgent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

// --- CAMPAIGNS ---
export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.listCampaigns(),
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => (id ? apiClient.getCampaign(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaign: Partial<Campaign>) => apiClient.createCampaign(campaign),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Campaign> }) =>
      apiClient.updateCampaign(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
}

// --- LEADS ---
export function useLeads(params?: LeadFilterParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => apiClient.listLeads(params),
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => (id ? apiClient.getLead(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lead: Partial<Lead>) => apiClient.createLead(lead),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) =>
      apiClient.updateLead(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
  });
}

// --- COMPLIANCE ---
export function useComplianceRules() {
  return useQuery({
    queryKey: ['compliance-rules'],
    queryFn: () => apiClient.listComplianceRules(),
  });
}

export function useCreateComplianceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: Partial<ComplianceRule>) => apiClient.createComplianceRule(rule),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-rules'] }),
  });
}

export function useUpdateComplianceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ComplianceRule> }) =>
      apiClient.updateComplianceRule(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-rules'] }),
  });
}

export function useDeleteComplianceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteComplianceRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance-rules'] }),
  });
}

// --- NUMBERS & ANALYTICS ---
export function usePhoneNumbers() {
  return useQuery({
    queryKey: ['phone-numbers'],
    queryFn: () => apiClient.listPhoneNumbers(),
  });
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiClient.getAnalyticsOverview(),
  });
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => apiClient.getOrganization(),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Organization>) => apiClient.updateOrganization(updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization'] }),
  });
}
