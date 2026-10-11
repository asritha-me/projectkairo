import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Search,
  Filter,
  Calendar,
  FileText,
  Pill,
  Activity,
  Stethoscope,
  Heart,
  FilePlus,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { TimelineEvent, TimelineEventType, LabResult } from '@/types';
import { Spinner, EmptyState } from '@/components/Loading';
import { formatDate, cn } from '@/lib/utils';

const EVENT_TYPE_CONFIG: Record<TimelineEventType, { dot: string; bg: string; text: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; label: string }> = {
  lab_report: { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-600', icon: Activity, label: 'Lab Report' },
  prescription: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-600', icon: Pill, label: 'Prescription' },
  discharge: { dot: 'bg-midnight-500', bg: 'bg-midnight-50', text: 'text-midnight-600', icon: FileText, label: 'Discharge' },
  diagnosis: { dot: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600', icon: Stethoscope, label: 'Diagnosis' },
  procedure: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', icon: Heart, label: 'Procedure' },
  doctor_note: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: FilePlus, label: 'Doctor Note' },
  other: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500', icon: FileText, label: 'Other' },
};

export function HealthTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TimelineEventType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | '3months' | 'year'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [eventsRes, labsRes] = await Promise.all([
      supabase.from('timeline_events').select('*').order('event_date', { ascending: false }),
      supabase.from('lab_results').select('*').order('report_date', { ascending: false }),
    ]);
    setEvents((eventsRes.data as TimelineEvent[]) || []);
    setLabResults((labsRes.data as LabResult[]) || []);
    setLoading(false);
  };

  // Group lab results by test name for trend comparison
  const labTrends = useMemo(() => {
    const grouped: Record<string, LabResult[]> = {};
    for (const lab of labResults) {
      if (!grouped[lab.test_name]) grouped[lab.test_name] = [];
      grouped[lab.test_name].push(lab);
    }
    // Only show trends for tests with 2+ results
    return Object.entries(grouped).filter(([, results]) => results.length >= 2);
  }, [labResults]);

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.event_type === typeFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      if (dateFilter === '3months') cutoff.setMonth(now.getMonth() - 3);
      if (dateFilter === 'year') cutoff.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter((e) => new Date(e.event_date) >= cutoff);
    }

    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(lower) ||
          e.description.toLowerCase().includes(lower) ||
          e.source_document_name.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [events, typeFilter, dateFilter, search]);

  // Group events by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of filteredEvents) {
      const d = new Date(event.event_date);
      const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    }
    return Object.entries(groups);
  }, [filteredEvents]);

  const availableTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.event_type));
    return Array.from(types);
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-midnight-900">Health Timeline</h1>
        <p className="mt-1 text-sm text-midnight-400">
          Your documented health events, in chronological order.
        </p>
      </div>

      {events.length === 0 && labResults.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Clock}
            title="No timeline events yet"
            description="Upload medical documents to build your health timeline. Lab reports, prescriptions, and other documents will appear here chronologically."
            action={
              <Link to="/app/records" className="btn-primary">
                <FileText size={16} /> Upload a document
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="card p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TimelineEventType | 'all')}
                  className="input-field pl-9 pr-8 appearance-none cursor-pointer"
                >
                  <option value="all">All types</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {EVENT_TYPE_CONFIG[type]?.label || type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                  className="input-field pl-9 pr-8 appearance-none cursor-pointer"
                >
                  <option value="all">All time</option>
                  <option value="month">Past month</option>
                  <option value="3months">Past 3 months</option>
                  <option value="year">Past year</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lab trend charts */}
          {labTrends.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-midnight-800 mb-4">Test Value Trends</h3>
              <p className="text-xs text-midnight-400 mb-4">
                Comparing results only when the same test, units, and context are available. Missing data is shown honestly.
              </p>
              <div className="space-y-4">
                {labTrends.slice(0, 5).map(([testName, results]) => (
                  <LabTrendChart key={testName} testName={testName} results={results} />
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {filteredEvents.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-midnight-400">No events match your filters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByMonth.map(([month, monthEvents]) => (
                <div key={month}>
                  <h3 className="text-sm font-semibold text-midnight-500 mb-3 sticky top-16 bg-slate-50 py-1 z-10">
                    {month}
                  </h3>
                  <div className="card p-5">
                    <div className="relative pl-6">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
                      <div className="space-y-5">
                        {monthEvents.map((event) => {
                          const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
                          const Icon = config.icon;
                          return (
                            <div key={event.id} className="relative">
                              <div className={cn(
                                'absolute -left-[18px] top-0.5 w-3.5 h-3.5 rounded-full ring-4 ring-white',
                                config.dot
                              )} />
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                                  config.bg
                                )}>
                                  <Icon size={16} className={config.text} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-midnight-800">{event.title}</p>
                                      {event.description && (
                                        <p className="text-xs text-midnight-500 mt-1">{event.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1.5 text-xs text-midnight-400">
                                        <span className="badge bg-slate-100 text-midnight-600">{config.label}</span>
                                        <span>{formatDate(event.event_date)}</span>
                                        {event.source_document_name && (
                                          <span>Source: {event.source_document_name}</span>
                                        )}
                                      </div>
                                    </div>
                                    {event.document_id && (
                                      <Link
                                        to={`/app/records/${event.document_id}`}
                                        className="btn-ghost text-xs flex-shrink-0"
                                      >
                                        View <ChevronRight size={12} />
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LabTrendChart({ testName, results }: { testName: string; results: LabResult[] }) {
  const sorted = [...results].sort((a, b) => {
    const aDate = new Date(a.report_date || a.created_at).getTime();
    const bDate = new Date(b.report_date || b.created_at).getTime();
    return aDate - bDate;
  });

  const values = sorted.map((r) => parseFloat(r.value));
  const hasNumericValues = values.every((v) => !isNaN(v));

  if (!hasNumericValues || sorted.length < 2) return null;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.15;
  const chartMin = minVal - padding;
  const chartMax = maxVal + padding;
  const chartRange = chartMax - chartMin;

  const width = 100;
  const height = 40;
  const points = sorted.map((r, i) => {
    const val = parseFloat(r.value);
    const x = sorted.length === 1 ? width / 2 : (i / (sorted.length - 1)) * width;
    const y = height - ((val - chartMin) / chartRange) * height;
    return { x, y, val, date: r.report_date, unit: r.unit };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-midnight-800">{testName}</p>
        <span className="text-xs text-midnight-400">{sorted.length} results • {sorted[0].unit || 'no unit'}</span>
      </div>
      <div className="flex items-center gap-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="flex-1 h-16" preserveAspectRatio="none">
          <path d={pathD} fill="none" stroke="#0d9474" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="1.5" fill="#0d9474" />
            </g>
          ))}
        </svg>
        <div className="flex gap-2 flex-shrink-0">
          {sorted.map((r, i) => (
            <div key={i} className="text-center">
              <p className="text-sm font-semibold text-midnight-800">{r.value}</p>
              <p className="text-[10px] text-midnight-400">{formatDate(r.report_date)}</p>
            </div>
          ))}
        </div>
      </div>
      {sorted.some((r) => r.reference_range) && (
        <p className="text-[11px] text-midnight-400 mt-2">
          Reference range: {sorted[0].reference_range}
        </p>
      )}
    </div>
  );
}
