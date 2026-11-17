import React, { useEffect, useState, useRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sparkles } from 'lucide-react';

export interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subtitle?: string;
  showValue?: boolean;
  showConfetti?: boolean;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 130,
  strokeWidth = 10,
  label,
  subtitle,
  showValue = true,
  showConfetti = true,
  className,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const clamped = Math.min(Math.max(percent, 0), 100);
  const [displayValue, setDisplayValue] = useState(0);
  const currentValRef = useRef(0);

  // Smooth counter animation when percent changes
  useEffect(() => {
    let startTime: number | null = null;
    const startValue = currentValRef.current;
    const targetValue = clamped;
    const duration = 750; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (targetValue - startValue) * ease);
      currentValRef.current = current;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [clamped]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  // Determine color scheme based on percent
  let strokeColor = '#f43f5e'; // < 30%: red / rose
  let textColor = 'text-rose-600 dark:text-rose-400';
  let gradientStops = { from: '#f43f5e', to: '#fb7185' };

  if (clamped >= 100) {
    strokeColor = `url(#${gradientId}-golden)`;
    textColor = 'text-amber-500 dark:text-amber-400';
    gradientStops = { from: '#f59e0b', to: '#3b82f6' };
  } else if (clamped >= 70) {
    strokeColor = '#10b981'; // > 70%: green / emerald
    textColor = 'text-emerald-600 dark:text-emerald-400';
    gradientStops = { from: '#10b981', to: '#34d399' };
  } else if (clamped >= 30) {
    strokeColor = '#f59e0b'; // 30% - 70%: amber / orange
    textColor = 'text-amber-600 dark:text-amber-400';
    gradientStops = { from: '#f59e0b', to: '#fbbf24' };
  }

  const isCompleted = clamped >= 100;

  return (
    <div
      className={twMerge(
        'relative inline-flex flex-col items-center justify-center select-none',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center drop-shadow-sm"
      >
        <defs>
          <linearGradient id={`${gradientId}-golden`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id={`${gradientId}-dynamic`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStops.from} />
            <stop offset="100%" stopColor={gradientStops.to} />
          </linearGradient>
        </defs>

        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800/80 transition-colors"
        />

        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isCompleted ? `url(#${gradientId}-golden)` : `url(#${gradientId}-dynamic)`}
          strokeWidth={strokeWidth}
          strokeLinecap={clamped > 0 ? 'round' : 'butt'}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          opacity={clamped > 0 ? 1 : 0}
          style={{
            transition:
              'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease, opacity 0.3s ease',
          }}
        />
      </svg>

      {/* Floating Sparkles & Gentle Confetti when 100% */}
      {isCompleted && showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <span
            className="absolute -top-1 right-2 text-amber-400 animate-ping opacity-75"
            style={{ animationDuration: '2s' }}
          >
            ✦
          </span>
          <span
            className="absolute -bottom-1 left-2 text-blue-500 animate-pulse"
            style={{ animationDuration: '1.5s' }}
          >
            ★
          </span>
          <span className="absolute top-1 -left-1 text-amber-300 text-xs animate-bounce">
            ✨
          </span>
          <span
            className="absolute bottom-1 -right-1 text-purple-400 text-xs animate-pulse"
            style={{ animationDuration: '1.8s' }}
          >
            🎉
          </span>
        </div>
      )}

      {/* Center Percentage & Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
        {showValue && (
          <div className="flex items-center justify-center space-x-0.5">
            <span
              className={twMerge(
                'font-extrabold tracking-tight transition-colors duration-300',
                textColor,
                size >= 140 ? 'text-2xl' : size >= 100 ? 'text-xl' : 'text-base'
              )}
            >
              {displayValue}%
            </span>
            {isCompleted && (
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
            )}
          </div>
        )}
        {label && (
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate max-w-[90%]">
            {label}
          </span>
        )}
        {subtitle && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[85%]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
