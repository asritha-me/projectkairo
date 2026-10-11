import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-teal-600', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function FullPageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Spinner size={40} />
      <p className="mt-4 text-sm text-midnight-400">{label}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-5 w-40 mb-4" />
      <div className="skeleton h-4 w-full mb-2.5" />
      <div className="skeleton h-4 w-3/4 mb-2.5" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 flex items-center justify-center mb-5">
        <Icon className="text-teal-500" size={28} />
      </div>
      <h3 className="text-lg font-semibold text-midnight-800 mb-2">{title}</h3>
      <p className="text-sm text-midnight-400 max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
}
