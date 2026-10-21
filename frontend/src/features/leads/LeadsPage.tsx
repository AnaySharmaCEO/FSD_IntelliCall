import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  UploadCloud,
  Download,
  Phone,
  Mail,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useLeads, useCreateLead, useCampaigns } from '../../api/hooks';
import { StatusChip } from '../../components/patterns';
import { CsvImportModal } from './CsvImportModal';
import {
  Button,
  Badge,
  Input,
  Select,
  Modal,
  FilterBar,
  FilterChip,
  SkeletonTable,
  EmptyState,
  useToast,
} from '../../components/ui';
import { formatPhone, formatDate } from '../../lib/format';
import type { Lead } from '../../contracts/entities';

export const LeadsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [campaignId, setCampaignId] = useState('');

  const { data: campaigns = [] } = useCampaigns();
  const { data: leadsResult, isLoading, refetch } = useLeads({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
  });
  const createLead = useCreateLead();
  const { toast } = useToast();

  const leads = leadsResult?.data || [];

  const handleExportCsv = () => {
    if (leads.length === 0) {
      toast('No leads available to export', 'error');
      return;
    }

    const headers = ['Name', 'Phone', 'Email', 'Status', 'Created At'];
    const rows = leads.map((l: any) => [
      `"${l.name || [l.first_name, l.last_name].filter(Boolean).join(' ') || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.status || 'new'}"`,
      `"${l.created_at || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast(`Exported ${leads.length} leads to CSV`, 'success');
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) return;

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    try {
      await createLead.mutateAsync({
        name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        campaign_id: campaignId || undefined,
        status: 'new' as any,
      });
      toast('Lead added successfully', 'success');
      setModalOpen(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to add lead', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Prospect Pipeline
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Leads & Contact Lists
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Manage target prospects, qualification statuses, and campaign assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvModalOpen(true)}>
            <UploadCloud size={14} className="mr-1.5" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download size={14} className="mr-1.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" />
          <Input
            placeholder="Search leads by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <FilterBar>
          <FilterChip active={!statusFilter} onClick={() => setStatusFilter('')}>
            All Leads ({leads.length})
          </FilterChip>
          <FilterChip active={statusFilter === 'new'} onClick={() => setStatusFilter(statusFilter === 'new' ? '' : 'new')}>
            New Leads
          </FilterChip>
          <FilterChip active={statusFilter === 'contacted'} onClick={() => setStatusFilter(statusFilter === 'contacted' ? '' : 'contacted')}>
            Contacted
          </FilterChip>
          <FilterChip active={statusFilter === 'qualified'} onClick={() => setStatusFilter(statusFilter === 'qualified' ? '' : 'qualified')}>
            Qualified
          </FilterChip>
          <FilterChip active={statusFilter === 'converted'} onClick={() => setStatusFilter(statusFilter === 'converted' ? '' : 'converted')}>
            Converted
          </FilterChip>
        </FilterBar>
      </div>

      {/* Leads Table */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4">
            <SkeletonTable rows={5} />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title="Your pipeline is empty"
            description="Add your first contact manually or import a CSV lead list."
            action={{
              label: 'Add Prospect',
              onClick: () => setModalOpen(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)]/50 text-[var(--color-text-secondary)] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Prospect Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Custom Attributes</th>
                  <th className="py-3 px-4 text-right">Added On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-[var(--color-bg-sunken)]/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[var(--color-text-primary)]">
                      {lead.name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Prospect'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[var(--color-text-secondary)]">
                      {formatPhone(lead.phone)}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--color-text-secondary)]">
                      {lead.email || <span className="text-[var(--color-text-muted)]">&mdash;</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusChip status={lead.status} type="lead" />
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(lead.custom_fields).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-sunken)] text-[var(--color-text-muted)]"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">&mdash;</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-[var(--color-text-muted)]">
                      {formatDate(lead.created_at, { includeTime: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Lead */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add New Prospect">
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Vikram"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Malhotra"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            hint="E.164 international format (+91...)"
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="prospect@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Select
            label="Assign to Campaign"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select a campaign (optional)"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={createLead.isPending}>
              Save Prospect
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default LeadsPage;
