import { cn } from '@/lib/utils';
import type { ProcessingStatus, DocumentType, AppointmentStatus } from '@/types';

const statusConfig: Record<ProcessingStatus, { color: string; dot: string; label: string }> = {
  waiting: { color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Waiting' },
  uploading: { color: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500 animate-pulse', label: 'Uploading' },
  processing: { color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500 animate-pulse', label: 'Processing' },
  text_extracted: { color: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', label: 'Text Extracted' },
  ai_summary_ready: { color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'AI Summary Ready' },
  needs_review: { color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Needs Review' },
  failed: { color: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Failed' },
};

export function StatusBadge({ status, className }: { status: ProcessingStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <span className={cn('badge', config.color, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

const docTypeConfig: Record<DocumentType, { color: string; label: string }> = {
  lab_report: { color: 'bg-teal-50 text-teal-700', label: 'Lab Report' },
  prescription: { color: 'bg-sky-50 text-sky-700', label: 'Prescription' },
  discharge_summary: { color: 'bg-midnight-100 text-midnight-700', label: 'Discharge' },
  doctor_note: { color: 'bg-amber-50 text-amber-700', label: 'Doctor Note' },
  medical_history: { color: 'bg-rose-50 text-rose-700', label: 'Medical History' },
  other: { color: 'bg-slate-100 text-slate-600', label: 'Other' },
};

export function DocTypeBadge({ type, className }: { type: DocumentType; className?: string }) {
  const config = docTypeConfig[type];
  return <span className={cn('badge', config.color, className)}>{config.label}</span>;
}

const appointmentStatusConfig: Record<AppointmentStatus, { color: string; dot: string; label: string }> = {
  scheduled: { color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500', label: 'Scheduled' },
  completed: { color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' },
  cancelled: { color: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Cancelled' },
  pending: { color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
};

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const config = appointmentStatusConfig[status];
  return (
    <span className={cn('badge', config.color, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

export function LabFlagBadge({ flag }: { flag: string }) {
  if (flag === 'H') {
    return <span className="badge bg-amber-50 text-amber-700">High</span>;
  }
  if (flag === 'L') {
    return <span className="badge bg-sky-50 text-sky-700">Low</span>;
  }
  if (flag === 'abnormal') {
    return <span className="badge bg-rose-50 text-rose-700">Abnormal</span>;
  }
  return <span className="badge bg-emerald-50 text-emerald-700">Normal</span>;
}
