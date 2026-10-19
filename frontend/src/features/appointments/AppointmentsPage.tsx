import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { StatusChip } from '../../components/patterns';
import { Button, Badge, Input, Select, Modal, useToast } from '../../components/ui';
import { formatDate } from '../../lib/format';

interface AppointmentItem {
  id: string;
  leadName: string;
  phone: string;
  dateTime: string;
  status: 'confirmed' | 'proposed' | 'completed' | 'cancelled';
  purpose: string;
  notes: string;
}

const MOCK_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'apt-001',
    leadName: 'Vikram Malhotra',
    phone: '+91 98765 43210',
    dateTime: '2026-10-20T14:00:00Z',
    status: 'confirmed',
    purpose: 'Sign Loan Agreement Documents',
    notes: 'Loan amount sanctioned at 8.4% APR.',
  },
  {
    id: 'apt-002',
    leadName: 'Rohit Verma',
    phone: '+91 99887 76655',
    dateTime: '2026-10-21T11:30:00Z',
    status: 'proposed',
    purpose: 'Fixed Deposit Advisory Callback',
    notes: 'Inquired about senior citizen FD scheme yield.',
  },
  {
    id: 'apt-003',
    leadName: 'Anita Deshmukh',
    phone: '+91 98112 23344',
    dateTime: '2026-10-20T16:00:00Z',
    status: 'confirmed',
    purpose: 'Fee Reversal Verification',
    notes: 'Supervisor review requested for dispute refund.',
  },
];

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>(MOCK_APPOINTMENTS);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const [leadName, setLeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [purpose, setPurpose] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !dateTime) return;

    const newApt: AppointmentItem = {
      id: `apt-${Date.now()}`,
      leadName,
      phone: phone || '+91 00000 00000',
      dateTime: new Date(dateTime).toISOString(),
      status: 'confirmed',
      purpose: purpose || 'Follow-up consultation',
      notes: 'Scheduled by operator.',
    };

    setAppointments((prev) => [newApt, ...prev]);
    toast('Appointment scheduled', 'success');
    setModalOpen(false);
    setLeadName('');
    setPhone('');
    setPurpose('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Calendar & Commitments
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Scheduled Appointments
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Confirmed calendar reservations and pending callbacks generated during AI calls.
          </p>
        </div>

        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          Schedule Appointment
        </Button>
      </div>

      {/* Appointments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-4 shadow-2xs hover:border-[var(--color-border-default)] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                  {apt.leadName}
                </span>
                <Badge variant={apt.status === 'confirmed' ? 'success' : 'warning'}>
                  {apt.status}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <Phone size={13} className="text-[var(--color-text-muted)]" />
                  <span className="font-mono">{apt.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <Calendar size={13} className="text-[var(--color-text-muted)]" />
                  <span className="font-mono">{formatDate(apt.dateTime)}</span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded bg-[var(--color-bg-sunken)] text-xs space-y-1">
                <strong className="text-[var(--color-text-primary)] block font-medium">
                  {apt.purpose}
                </strong>
                <p className="text-[var(--color-text-secondary)] text-[11px] leading-relaxed">
                  {apt.notes}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                ID: {apt.id}
              </span>
              <button
                onClick={() => toast(`Calendar invitation re-sent to ${apt.phone}`, 'info')}
                className="text-[var(--color-action-primary)] hover:underline font-semibold cursor-pointer"
              >
                Resend Invite &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Schedule */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule New Appointment">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Prospect Name"
            placeholder="e.g. Vikram Malhotra"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            label="Date & Time"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />

          <Input
            label="Consultation Purpose"
            placeholder="e.g. Loan Agreement Final Review"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppointmentsPage;
