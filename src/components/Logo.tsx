import { Link } from 'react-router-dom';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 36, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="rounded-xl bg-gradient-midnight flex items-center justify-center shadow-sm"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M18 52 L32 52 L39 32 L48 68 L57 42 L64 52 L82 52"
            stroke="#2DD4A6"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M70 26 L70 74" stroke="#2DD4A6" strokeWidth="5" strokeLinecap="round" />
          <path d="M70 50 L80 40 M70 50 L80 60" stroke="#2DD4A6" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-tight text-midnight-900">KAIRO</span>
          <span className="text-[9px] font-medium tracking-wider text-teal-600 uppercase">
            Health Copilot
          </span>
        </div>
      )}
    </div>
  );
}

export function LogoLink({ size = 36 }: { size?: number }) {
  return (
    <Link to="/">
      <Logo size={size} />
    </Link>
  );
}
