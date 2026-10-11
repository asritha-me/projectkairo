import { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  User,
  Building2,
  Trash2,
  X,
  CalendarPlus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentStatus } from '@/types';
import { AppointmentStatusBadge } from '@/components/Badges';
import { Spinner, EmptyState } from '@/components/Loading';
import { formatDate, cn } from '@/lib/utils';

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setDoctorName('');
    setHospitalName('');
    setAppointmentDate('');
    setAppointmentTime('');
    setStatus('scheduled');
    setNotes('');
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('appointments').insert({
      title: title.trim(),
      doctor_name: doctorName.trim(),
      hospital_name: hospitalName.trim(),
      appointment_date: appointmentDate || null,
      appointment_time: appointmentTime,
      status,
      notes: notes.trim(),
    });

    if (!error) {
      resetForm();
      setShowForm(false);
      await fetchAppointments();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const now = new Date();
  const upcoming = appointments.filter((a) => {
    if (!a.appointment_date) return false;
    return new Date(a.appointment_date) >= now && a.status !== 'cancelled' && a.status !== 'completed';
  });
  const past = appointments.filter((a) => {
    if (!a.appointment_date) return false;
    return new Date(a.appointment_date) < now || a.status === 'completed' || a.status === 'cancelled';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight-900">Appointments</h1>
          <p className="mt-1 text-sm text-midnight-400">
            Plan and track your medical appointments. This is a planning tool — it does not book appointments with hospitals.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Appointment
        </button>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight-900/40" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-midnight-800">New Appointment</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-midnight-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-text">Title</label>
                <input className="input-field" placeholder="e.g. Cardiology follow-up" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Doctor name</label>
                  <input className="input-field" placeholder="Dr. Smith" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Hospital / Clinic</label>
                  <input className="input-field" placeholder="City Hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Date</label>
                  <input type="date" className="input-field" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
                </div>
                <div>
                  <label className="label-text">Time</label>
                  <input type="time" className="input-field" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label-text">Status</label>
                <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="label-text">Notes</label>
                <textarea className="input-field min-h-20 resize-y" placeholder="Any preparation needed, questions to ask..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAdd} disabled={saving || !title.trim()} className="btn-primary">
                  {saving ? <Spinner size={16} className="text-white" /> : <CalendarPlus size={16} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Calendar}
            title="No appointments planned"
            description="Add upcoming doctor visits, lab appointments, or check-ups to keep track of your schedule."
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} /> Add your first appointment
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-midnight-800 mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-midnight-400 mb-3">Past</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  onStatusChange,
  onDelete,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card-hover p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-midnight-800">{appointment.title}</p>
          <AppointmentStatusBadge status={appointment.status} />
        </div>
        <button
          onClick={() => onDelete(appointment.id)}
          className="p-1.5 rounded-lg text-midnight-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="space-y-2 text-sm text-midnight-600">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-midnight-400" />
          <span>{formatDate(appointment.appointment_date)}</span>
          {appointment.appointment_time && (
            <>
              <Clock size={15} className="text-midnight-400 ml-2" />
              <span>{appointment.appointment_time}</span>
            </>
          )}
        </div>
        {appointment.doctor_name && (
          <div className="flex items-center gap-2">
            <User size={15} className="text-midnight-400" />
            <span>{appointment.doctor_name}</span>
          </div>
        )}
        {appointment.hospital_name && (
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-midnight-400" />
            <span>{appointment.hospital_name}</span>
          </div>
        )}
        {appointment.notes && (
          <p className="text-xs text-midnight-400 mt-2 pt-2 border-t border-slate-100">{appointment.notes}</p>
        )}
      </div>
      <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
        <select
          value={appointment.status}
          onChange={(e) => onStatusChange(appointment.id, e.target.value as AppointmentStatus)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-midnight-600 cursor-pointer"
        >
          <option value="scheduled">Scheduled</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
