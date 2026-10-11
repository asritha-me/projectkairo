import { useEffect, useState } from 'react';
import {
  Heart,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  Pill,
  FileText,
  Activity,
  Stethoscope,
  Plus,
  X,
  Check,
  Edit2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile as ProfileType, Medication } from '@/types';
import { Spinner } from '@/components/Loading';

type TagField = 'known_allergies' | 'current_medications' | 'medical_history' | 'existing_conditions' | 'previous_procedures';

export function HealthProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileType>>({});
  const [tagInput, setTagInput] = useState<Record<TagField, string>>({
    known_allergies: '',
    current_medications: '',
    medical_history: '',
    existing_conditions: '',
    previous_procedures: '',
  });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(true);

  useEffect(() => {
    if (profile) {
      setFormData({ ...profile });
    }
  }, [profile]);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    const { data } = await supabase
      .from('medications')
      .select('*')
      .order('created_at', { ascending: false });
    setMedications((data as Medication[]) || []);
    setLoadingMeds(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        phone: formData.phone,
        address: formData.address,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relation: formData.emergency_contact_relation,
        known_allergies: formData.known_allergies,
        current_medications: formData.current_medications,
        medical_history: formData.medical_history,
        existing_conditions: formData.existing_conditions,
        previous_procedures: formData.previous_procedures,
        blood_type: formData.blood_type,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
      })
      .eq('id', user?.id);

    if (!error) {
      setSaved(true);
      setEditing(false);
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const addTag = (field: TagField) => {
    const value = tagInput[field].trim();
    if (!value) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[] || []), value],
    }));
    setTagInput((prev) => ({ ...prev, [field]: '' }));
  };

  const removeTag = (field: TagField, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[] || []).filter((_, i) => i !== index),
    }));
  };

  const data = editing ? formData : profile;

  if (!data) {
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
          <h1 className="text-2xl font-bold text-midnight-900">My Health Profile</h1>
          <p className="mt-1 text-sm text-midnight-400">
            Your personal health information. Keep it up to date for better insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 animate-fade-in">
              <Check size={16} /> Saved
            </span>
          )}
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setFormData({ ...profile }); }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Spinner size={16} className="text-white" /> : <Check size={16} />}
                Save Changes
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <Edit2 size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <User size={18} className="text-teal-600" />
          </div>
          <h3 className="font-semibold text-midnight-800">Personal Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="First name">
            {editing ? (
              <input className="input-field" value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.first_name || '—'}</p>}
          </Field>
          <Field label="Last name">
            {editing ? (
              <input className="input-field" value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.last_name || '—'}</p>}
          </Field>
          <Field label="Date of birth">
            {editing ? (
              <input type="date" className="input-field" value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.date_of_birth || '—'}</p>}
          </Field>
          <Field label="Phone">
            {editing ? (
              <input className="input-field" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.phone || '—'}</p>}
          </Field>
          <Field label="Blood type">
            {editing ? (
              <input className="input-field" placeholder="e.g. A+" value={formData.blood_type || ''} onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.blood_type || '—'}</p>}
          </Field>
          <Field label="Email">
            <p className="text-sm text-midnight-700">{user?.email || '—'}</p>
          </Field>
          <Field label="Height (cm)">
            {editing ? (
              <input type="number" className="input-field" value={formData.height_cm || ''} onChange={(e) => setFormData({ ...formData, height_cm: e.target.value as unknown as number })} />
            ) : <p className="text-sm text-midnight-700">{data.height_cm || '—'}</p>}
          </Field>
          <Field label="Weight (kg)">
            {editing ? (
              <input type="number" className="input-field" value={formData.weight_kg || ''} onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value as unknown as number })} />
            ) : <p className="text-sm text-midnight-700">{data.weight_kg || '—'}</p>}
          </Field>
          <Field label="Address" fullWidth>
            {editing ? (
              <input className="input-field" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.address || '—'}</p>}
          </Field>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <Phone size={18} className="text-rose-600" />
          </div>
          <h3 className="font-semibold text-midnight-800">Emergency Contact</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Contact name">
            {editing ? (
              <input className="input-field" value={formData.emergency_contact_name || ''} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.emergency_contact_name || '—'}</p>}
          </Field>
          <Field label="Phone">
            {editing ? (
              <input className="input-field" value={formData.emergency_contact_phone || ''} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.emergency_contact_phone || '—'}</p>}
          </Field>
          <Field label="Relationship">
            {editing ? (
              <input className="input-field" placeholder="e.g. Spouse" value={formData.emergency_contact_relation || ''} onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })} />
            ) : <p className="text-sm text-midnight-700">{data.emergency_contact_relation || '—'}</p>}
          </Field>
        </div>
      </div>

      {/* Tag-based sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TagSection
          icon={AlertTriangle}
          iconColor="rose"
          title="Known Allergies"
          field="known_allergies"
          items={data.known_allergies || []}
          editing={editing}
          tagInput={tagInput.known_allergies}
          onTagInputChange={(v) => setTagInput({ ...tagInput, known_allergies: v })}
          onAddTag={() => addTag('known_allergies')}
          onRemoveTag={(i) => removeTag('known_allergies', i)}
          placeholder="e.g. Penicillin"
        />
        <TagSection
          icon={Pill}
          iconColor="amber"
          title="Current Medications (self-reported)"
          field="current_medications"
          items={data.current_medications || []}
          editing={editing}
          tagInput={tagInput.current_medications}
          onTagInputChange={(v) => setTagInput({ ...tagInput, current_medications: v })}
          onAddTag={() => addTag('current_medications')}
          onRemoveTag={(i) => removeTag('current_medications', i)}
          placeholder="e.g. Metformin 500mg"
        />
        <TagSection
          icon={FileText}
          iconColor="sky"
          title="Medical History"
          field="medical_history"
          items={data.medical_history || []}
          editing={editing}
          tagInput={tagInput.medical_history}
          onTagInputChange={(v) => setTagInput({ ...tagInput, medical_history: v })}
          onAddTag={() => addTag('medical_history')}
          onRemoveTag={(i) => removeTag('medical_history', i)}
          placeholder="e.g. Appendectomy in 2019"
        />
        <TagSection
          icon={Activity}
          iconColor="teal"
          title="Existing Conditions"
          field="existing_conditions"
          items={data.existing_conditions || []}
          editing={editing}
          tagInput={tagInput.existing_conditions}
          onTagInputChange={(v) => setTagInput({ ...tagInput, existing_conditions: v })}
          onAddTag={() => addTag('existing_conditions')}
          onRemoveTag={(i) => removeTag('existing_conditions', i)}
          placeholder="e.g. Type 2 Diabetes"
        />
        <TagSection
          icon={Stethoscope}
          iconColor="midnight"
          title="Previous Procedures"
          field="previous_procedures"
          items={data.previous_procedures || []}
          editing={editing}
          tagInput={tagInput.previous_procedures}
          onTagInputChange={(v) => setTagInput({ ...tagInput, previous_procedures: v })}
          onAddTag={() => addTag('previous_procedures')}
          onRemoveTag={(i) => removeTag('previous_procedures', i)}
          placeholder="e.g. Knee arthroscopy"
        />
      </div>

      {/* Medications from documents */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Pill size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-midnight-800">Medications from Uploaded Records</h3>
            <p className="text-xs text-midnight-400 mt-0.5">Extracted from your prescriptions and medical documents</p>
          </div>
        </div>
        {loadingMeds ? (
          <div className="flex justify-center py-6"><Spinner size={20} /></div>
        ) : medications.length === 0 ? (
          <p className="text-sm text-midnight-400 py-4 text-center">
            No medications extracted from uploaded documents yet. Upload a prescription to see medications here.
          </p>
        ) : (
          <div className="space-y-2">
            {medications.map((med) => (
              <div key={med.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-midnight-800">{med.medicine_name}</p>
                  <p className="text-xs text-midnight-400 mt-0.5">
                    {med.dosage}{med.frequency && ` • ${med.frequency}`}{med.duration && ` • ${med.duration}`}
                  </p>
                  {(med.prescribing_clinician || med.prescription_date) && (
                    <p className="text-[11px] text-midnight-300 mt-0.5">
                      {med.prescribing_clinician && `Prescribed by ${med.prescribing_clinician}`}
                      {med.prescribing_clinician && med.prescription_date && ' • '}
                      {med.prescription_date && med.prescription_date}
                    </p>
                  )}
                </div>
                {med.source_document_name && (
                  <span className="text-xs text-midnight-400 flex-shrink-0 ml-2">From: {med.source_document_name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy note */}
      <div className="card p-4 bg-midnight-50/40 border-midnight-100">
        <div className="flex items-start gap-3">
          <Heart size={18} className="text-teal-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-midnight-500 leading-relaxed">
            Your health profile is private and secure. Only you can see this information.
            Information you enter manually is separated from information extracted by AI from your uploaded documents.
            KAIRO does not share your data with any third party.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <label className="label-text">{label}</label>
      {children}
    </div>
  );
}

function TagSection({
  icon: Icon,
  iconColor,
  title,
  items,
  editing,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  placeholder,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  iconColor: 'teal' | 'rose' | 'amber' | 'sky' | 'midnight';
  title: string;
  field: string;
  items: string[];
  editing: boolean;
  tagInput: string;
  onTagInputChange: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (i: number) => void;
  placeholder: string;
}) {
  const colorMap = {
    teal: 'bg-teal-50 text-teal-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    midnight: 'bg-midnight-50 text-midnight-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[iconColor]}`}>
          <Icon size={16} />
        </div>
        <h3 className="font-semibold text-midnight-800 text-sm">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.length === 0 && !editing && (
          <p className="text-sm text-midnight-300">Not specified</p>
        )}
        {items.map((item, i) => (
          <span key={i} className="badge bg-slate-100 text-midnight-700 group">
            {item}
            {editing && (
              <button onClick={() => onRemoveTag(i)} className="ml-0.5 hover:text-rose-600">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="flex gap-2">
          <input
            className="input-field text-sm py-2"
            placeholder={placeholder}
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddTag(); } }}
          />
          <button onClick={onAddTag} className="btn-secondary px-3 py-2">
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
