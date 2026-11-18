import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ProgressBarProps {
  value?: number; // 0 - 100
  progress?: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  progress,
  color,
  showLabel = false,
  size = 'md',
  className,
  animate = true,
}) => {
  const actualValue = value ?? progress ?? 0;
  const clampedValue = Math.min(Math.max(actualValue, 0), 100);

  const isCustomColor = color && (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl'));

  // Dynamic color coding according to specification:
  // red (<30%), amber/orange (30-70%), green (>70%), yellow/blue when 100%
  let barColor = !isCustomColor && color ? color : 'bg-rose-500';
  if (!color) {
    if (clampedValue >= 100) {
      barColor = 'bg-gradient-to-r from-amber-400 to-blue-600';
    } else if (clampedValue >= 70) {
      barColor = 'bg-emerald-500';
    } else if (clampedValue >= 30) {
      barColor = 'bg-amber-500';
    } else {
      barColor = 'bg-rose-500';
    }
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
            !isCustomColor ? barColor : '',
            animate ? 'transition-all duration-500 ease-out' : ''
          )}
          style={{
            width: `${clampedValue}%`,
            ...(isCustomColor ? { backgroundColor: color } : {}),
          }}
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
