import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/Loading';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password, firstName, lastName);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/app');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/app');
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand/visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-midnight relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 800" fill="none">
            <circle cx="200" cy="200" r="150" stroke="#2DD4A6" strokeWidth="1" />
            <circle cx="600" cy="600" r="200" stroke="#2DD4A6" strokeWidth="1" />
            <circle cx="400" cy="400" r="300" stroke="#2DD4A6" strokeWidth="0.5" />
            <path d="M0 400 L150 400 L200 300 L280 500 L350 380 L400 400 L800 400" stroke="#2DD4A6" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Logo size={44} className="[&_span]:text-white [&_span.text-teal-600]:text-teal-300" />

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Your health.
              <br />
              <span className="text-teal-300">Connected. Understood.</span>
            </h1>
            <p className="text-lg text-midnight-200 leading-relaxed">
              KAIRO brings your scattered medical records into one secure profile —
              with AI that explains everything in plain language.
            </p>

            <div className="mt-10 space-y-4">
              {[
                'Upload lab reports, prescriptions, and discharge summaries',
                'AI-powered explanations in simple language you can understand',
                'Track your health journey on a unified timeline',
                'Ask questions about your records — anytime',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Activity className="text-teal-300" size={12} />
                  </div>
                  <span className="text-sm text-midnight-100">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-midnight-300">
            <ShieldCheck size={16} className="text-teal-400" />
            <span>Healthcare-grade privacy. Your data stays yours.</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo size={40} />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-midnight-900">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-midnight-400">
              {mode === 'signin'
                ? 'Sign in to access your personal health copilot.'
                : 'Start your journey to understanding your health.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">First name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Jane"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-text">Last name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label-text">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 animate-fade-in">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <Spinner size={20} className="text-white" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-midnight-400">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-midnight-300 leading-relaxed max-w-sm mx-auto">
            KAIRO provides health information assistance and is not a substitute for
            professional medical advice. Always consult your clinician for health decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
