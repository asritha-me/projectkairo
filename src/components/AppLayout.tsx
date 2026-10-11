import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Heart,
  FileText,
  MessageSquare,
  Calendar,
  Settings,
  Clock,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { initials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/profile', label: 'My Health Profile', icon: Heart },
  { to: '/app/records', label: 'Medical Records', icon: FileText },
  { to: '/app/copilot', label: 'AI Health Copilot', icon: MessageSquare },
  { to: '/app/timeline', label: 'Health Timeline', icon: Clock },
  { to: '/app/appointments', label: 'Appointments', icon: Calendar },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';
  const userEmail = user?.email || '';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-midnight-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <Logo size={34} />
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} className="text-midnight-400" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-midnight-500 hover:bg-slate-50 hover:text-midnight-700'
                )
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Disclaimer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3">
            <p className="text-[11px] leading-relaxed text-amber-700">
              AI explanations are informational only. Always consult your clinician for medical decisions.
            </p>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} className="text-midnight-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <Bell size={18} className="text-midnight-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white" />
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-midnight flex items-center justify-center text-white text-xs font-semibold">
                  {initials(firstName, lastName)}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-sm font-medium text-midnight-800">
                    {firstName} {lastName}
                  </span>
                  <span className="text-[11px] text-midnight-400 mt-0.5">
                    {userEmail}
                  </span>
                </div>
                <ChevronDown size={16} className="text-midnight-400" />
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-20 w-56 card p-2 animate-scale-in origin-top-right">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-medium text-midnight-800">{firstName} {lastName}</p>
                      <p className="text-xs text-midnight-400 truncate">{userEmail}</p>
                    </div>
                    <NavLink
                      to="/app/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-midnight-600 hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </NavLink>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
