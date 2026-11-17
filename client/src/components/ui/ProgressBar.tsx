import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ProgressBarProps {
  value: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  showLabel = false,
  size = 'md',
  className,
  animate = true,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Dynamic color coding according to specification:
  // red (<30%), amber/orange (30-70%), green (>70%), yellow/blue when 100%
  let barColor = 'bg-rose-500';
  if (clampedValue >= 100) {
    barColor = 'bg-gradient-to-r from-amber-400 to-blue-600';
  } else if (clampedValue >= 70) {
    barColor = 'bg-emerald-500';
  } else if (clampedValue >= 30) {
    barColor = 'bg-amber-500';
  } else {
    barColor = 'bg-rose-500';
  }

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={twMerge('w-full', className)}>
      <div className={twMerge('w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden', heights[size])}>
        <div
          className={twMerge(
            'h-full rounded-full',
            barColor,
            animate ? 'transition-all duration-500 ease-out' : ''
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>Tiến độ</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{clampedValue}%</span>
        </div>
      )}
    </div>
  );
};
