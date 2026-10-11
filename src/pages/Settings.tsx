import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  AlertCircle,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { initials } from '@/lib/utils';

export function Settings() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [aiConsent, setAiConsent] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-midnight-900">Settings</h1>
        <p className="mt-1 text-sm text-midnight-400">Manage your account and preferences.</p>
      </div>

      {/* Account */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
            <User size={18} className="text-teal-600" />
          </div>
          <h3 className="font-semibold text-midnight-800">Account</h3>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/70">
          <div className="w-14 h-14 rounded-xl bg-gradient-midnight flex items-center justify-center text-white text-lg font-semibold">
            {initials(profile?.first_name || '', profile?.last_name || '')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-midnight-800">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-midnight-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/app/profile')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors mt-3"
        >
          <span className="text-sm text-midnight-700">Edit health profile</span>
          <ChevronRight size={16} className="text-midnight-400" />
        </button>
      </div>

      {/* Preferences */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
            <Bell size={18} className="text-sky-600" />
          </div>
          <h3 className="font-semibold text-midnight-800">Preferences</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Notifications"
            description="Receive alerts when documents are processed"
            value={notifications}
            onChange={setNotifications}
          />
          <ToggleRow
            label="AI processing consent"
            description="Allow AI to analyze your uploaded medical documents"
            value={aiConsent}
            onChange={setAiConsent}
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Shield size={18} className="text-emerald-600" />
          </div>
          <h3 className="font-semibold text-midnight-800">Privacy & Security</h3>
        </div>
        <div className="space-y-3 text-sm text-midnight-600">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50/70">
            <Shield size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-midnight-700">Your data is private</p>
              <p className="text-xs text-midnight-400 mt-1">
                Your health information is protected by row-level security. Only you can access your records.
                No other patient can see your data.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50/70">
            <Heart size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-midnight-700">AI is informational only</p>
              <p className="text-xs text-midnight-400 mt-1">
                AI explanations are generated from your uploaded documents and are for informational
                purposes only. They do not replace professional medical advice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-rose-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <AlertCircle size={18} className="text-rose-600" />
          </div>
          <h3 className="font-semibold text-midnight-800">Account Actions</h3>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <p className="text-center text-xs text-midnight-300 pt-2">
        KAIRO — Your Health. Connected. Understood.
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50/70 transition-colors">
      <div>
        <p className="text-sm font-medium text-midnight-700">{label}</p>
        <p className="text-xs text-midnight-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}
