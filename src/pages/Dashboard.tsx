import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Activity,
  Heart,
  Upload,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Calendar,
  Pill,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MedicalDocument, LabResult, TimelineEvent, Medication } from '@/types';
import { CardSkeleton, EmptyState, Spinner } from '@/components/Loading';
import { StatusBadge, DocTypeBadge, LabFlagBadge } from '@/components/Badges';
import { formatDate, getGreeting, timeAgo, cn } from '@/lib/utils';

export function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const [docsRes, labsRes, timelineRes, medsRes] = await Promise.all([
      supabase.from('medical_documents').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('lab_results').select('*').order('report_date', { ascending: false }).limit(6),
      supabase.from('timeline_events').select('*').order('event_date', { ascending: false }).limit(5),
      supabase.from('medications').select('*').order('created_at', { ascending: false }).limit(5),
    ]);

    setDocuments((docsRes.data as MedicalDocument[]) || []);
    setLabResults((labsRes.data as LabResult[]) || []);
    setTimelineEvents((timelineRes.data as TimelineEvent[]) || []);
    setMedications((medsRes.data as Medication[]) || []);
    setLoading(false);
  };

  // Fetch AI insight when documents are available
  useEffect(() => {
    if (!loading && documents.length > 0 && documents.some((d) => d.processing_status === 'ai_summary_ready')) {
      fetchAiInsight();
    }
  }, [loading, documents]);

  const fetchAiInsight = async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: 'Give me a brief health overview based on my uploaded records. Highlight any test results outside reference range and list active medications. Keep it to 3-4 sentences.',
            history: [],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.configured !== false) {
          setAiInsight(data.reply);
        } else {
          setAiError(true);
        }
      } else {
        setAiError(true);
      }
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  // Profile completeness calculation
  const profileFields = [
    { key: 'first_name', label: 'Name', filled: !!profile?.first_name },
    { key: 'date_of_birth', label: 'Date of birth', filled: !!profile?.date_of_birth },
    { key: 'phone', label: 'Phone', filled: !!profile?.phone },
    { key: 'emergency_contact_name', label: 'Emergency contact', filled: !!profile?.emergency_contact_name },
    { key: 'known_allergies', label: 'Allergies', filled: (profile?.known_allergies?.length ?? 0) > 0 },
    { key: 'current_medications', label: 'Medications', filled: (profile?.current_medications?.length ?? 0) > 0 },
    { key: 'medical_history', label: 'Medical history', filled: (profile?.medical_history?.length ?? 0) > 0 },
    { key: 'existing_conditions', label: 'Conditions', filled: (profile?.existing_conditions?.length ?? 0) > 0 },
  ];
  const completedCount = profileFields.filter((f) => f.filled).length;
  const completenessPct = Math.round((completedCount / profileFields.length) * 100);

  const hasData = documents.length > 0 || labResults.length > 0 || timelineEvents.length > 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-midnight-900">
            {getGreeting()}, {profile?.first_name || 'there'}
          </h1>
          <p className="mt-1 text-sm text-midnight-400">
            Your health information, organized in one place.
          </p>
        </div>
        <Link to="/app/records" className="btn-primary">
          <Upload size={16} />
          Upload Document
        </Link>
      </div>

      {!hasData && (
        <div className="card p-8 bg-gradient-to-br from-white to-teal-50/30 border-teal-100">
          <EmptyState
            icon={Upload}
            title="Welcome to KAIRO"
            description="Upload your first medical document — a lab report, prescription, or discharge summary — and let AI explain it in simple language."
            action={
              <Link to="/app/records" className="btn-primary">
                <Upload size={16} />
                Upload your first document
              </Link>
            }
          />
        </div>
      )}

      {hasData && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={FileText}
              label="Documents"
              value={documents.length}
              color="teal"
              link="/app/records"
            />
            <StatCard
              icon={Activity}
              label="Lab Results"
              value={labResults.length}
              color="sky"
              link="/app/timeline"
            />
            <StatCard
              icon={Pill}
              label="Medications"
              value={medications.length}
              color="amber"
              link="/app/profile"
            />
            <StatCard
              icon={Clock}
              label="Timeline Events"
              value={timelineEvents.length}
              color="emerald"
              link="/app/timeline"
            />
          </div>

          {/* Profile completeness + AI insight */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile completeness */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-midnight-800">Profile Completeness</h3>
                <Heart size={18} className="text-teal-500" />
              </div>
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none" stroke="#0d9474" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - completenessPct / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-midnight-800">{completenessPct}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {profileFields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between text-sm">
                    <span className={cn('flex items-center gap-2', field.filled ? 'text-midnight-700' : 'text-midnight-300')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', field.filled ? 'bg-teal-500' : 'bg-slate-300')} />
                      {field.label}
                    </span>
                    {!field.filled && (
                      <Link to="/app/profile" className="text-xs text-teal-600 hover:text-teal-700">
                        Add
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              <Link to="/app/profile" className="btn-secondary w-full mt-4">
                Complete profile
              </Link>
            </div>

            {/* AI Insight */}
            <div className="card p-5 lg:col-span-2 bg-gradient-to-br from-white to-sky-50/20 border-sky-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-midnight-800">AI Health Insight</h3>
                </div>
                <span className="badge bg-sky-50 text-sky-700">AI-Generated</span>
              </div>

              {aiLoading && (
                <div className="flex items-center gap-3 py-8">
                  <Spinner size={20} />
                  <span className="text-sm text-midnight-400">Analyzing your records...</span>
                </div>
              )}

              {!aiLoading && aiError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <span>
                    AI insight is unavailable right now. The Gemini API key needs to be configured.
                    You can still view your extracted records below.
                  </span>
                </div>
              )}

              {!aiLoading && !aiError && aiInsight && (
                <div className="prose-chat text-sm">
                  <p>{aiInsight}</p>
                </div>
              )}

              {!aiLoading && !aiError && !aiInsight && (
                <div className="py-6 text-center">
                  <p className="text-sm text-midnight-400 mb-4">
                    Upload a document and get an AI-powered health overview.
                  </p>
                  <Link to="/app/copilot" className="btn-primary">
                    <MessageSquare size={16} />
                    Ask AI Copilot
                  </Link>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-midnight-300">
                  Based on your uploaded records. Not medical advice.
                </p>
                <Link to="/app/copilot" className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                  Chat with AI <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent documents + recent lab results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent documents */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-midnight-800">Recent Documents</h3>
                <Link to="/app/records" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              {documents.length === 0 ? (
                <p className="text-sm text-midnight-400 py-4 text-center">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 4).map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/app/records/${doc.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-midnight-800 truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <DocTypeBadge type={doc.document_type} />
                          <span className="text-xs text-midnight-400">{timeAgo(doc.created_at)}</span>
                        </div>
                      </div>
                      <StatusBadge status={doc.processing_status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent lab results */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-midnight-800">Recent Test Results</h3>
                <Link to="/app/timeline" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  View all <ChevronRight size={14} />
                </Link>
              </div>
              {labResults.length === 0 ? (
                <p className="text-sm text-midnight-400 py-4 text-center">No lab results extracted yet.</p>
              ) : (
                <div className="space-y-2">
                  {labResults.slice(0, 5).map((lab) => (
                    <div key={lab.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-midnight-800 truncate">{lab.test_name}</p>
                        <p className="text-xs text-midnight-400 mt-0.5">
                          {formatDate(lab.report_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-midnight-800">
                            {lab.value} <span className="text-xs font-normal text-midnight-400">{lab.unit}</span>
                          </p>
                          {lab.reference_range && (
                            <p className="text-[11px] text-midnight-400">Ref: {lab.reference_range}</p>
                          )}
                        </div>
                        <LabFlagBadge flag={lab.flag} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline preview */}
          {timelineEvents.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-midnight-800">Health Timeline Preview</h3>
                <Link to="/app/timeline" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  View full timeline <ChevronRight size={14} />
                </Link>
              </div>
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
                <div className="space-y-4">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-midnight-800">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-midnight-400 mt-0.5 line-clamp-2">{event.description}</p>
                          )}
                          {event.source_document_name && (
                            <p className="text-[11px] text-midnight-300 mt-1">Source: {event.source_document_name}</p>
                          )}
                        </div>
                        <span className="text-xs text-midnight-400 flex-shrink-0">{formatDate(event.event_date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  link,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: number;
  color: 'teal' | 'sky' | 'amber' | 'emerald';
  link: string;
}) {
  const colorMap = {
    teal: 'bg-teal-50 text-teal-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <Link to={link} className="card-hover p-4 group">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[color])}>
          <Icon size={20} />
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-midnight-400 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-midnight-900">{value}</p>
      <p className="text-xs text-midnight-400 mt-0.5">{label}</p>
    </Link>
  );
}
