import React, { useState, useRef } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { StatsTrend } from '../../types/stats';
import { useI18n } from '../../i18n';

interface TrendLineChartProps {
  trend: StatsTrend | null;
  isLoading?: boolean;
  className?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  trend,
  isLoading = false,
  className = '',
}) => {
  const { t, language } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    actual?: number | null;
    ideal?: number | null;
    note?: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse ${className}`}>
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
        <div className="h-56 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  if (!trend || !trend.goal) {
    return (
      <div className={`p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 text-sm ${className}`}>
        <TrendingUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p>{language === 'vi' ? 'Vui lòng chọn một mục tiêu để xem biểu đồ xu hướng tiến độ.' : 'Please select a goal to visualize progress trend.'}</p>
      </div>
    );
  }

  const { goal, logs } = trend;
  const startTime = new Date(goal.startDate).getTime();
  const endTime = new Date(goal.endDate).getTime();
  const totalDuration = Math.max(endTime - startTime, 1);

  // SVG dimensions
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Coordinate transforms
  const getX = (dateStr: string) => {
    const timeVal = new Date(dateStr).getTime();
    const ratio = Math.min(Math.max((timeVal - startTime) / totalDuration, 0), 1);
    return padding.left + ratio * chartW;
  };

  const getY = (percent: number) => {
    const clamped = Math.min(Math.max(percent, 0), 100);
    return padding.top + chartH - (clamped / 100) * chartH;
  };

  // Ideal line: start at (0, 0%) and end at (totalDuration, 100%)
  const idealStart = { x: padding.left, y: getY(0) };
  const idealEnd = { x: padding.left + chartW, y: getY(100) };

  // Actual points
  const actualPoints: Array<{ x: number; y: number; date: string; percent: number; note?: string }> =
    [];

  // Start point
  actualPoints.push({
    x: padding.left,
    y: getY(0),
    date: goal.startDate,
    percent: 0,
    note: language === 'vi' ? 'Bắt đầu' : 'Start',
  });

  // Logs
  logs.forEach((log) => {
    actualPoints.push({
      x: getX(log.date),
      y: getY(log.snapshotPercent),
      date: log.date,
      percent: log.snapshotPercent,
      note: log.note,
    });
  });

  // Current or end progress point
  const now = Date.now();
  if (now > startTime && now < endTime) {
    actualPoints.push({
      x: getX(new Date(now).toISOString()),
      y: getY(goal.progressCache),
      date: new Date(now).toISOString(),
      percent: goal.progressCache,
      note: language === 'vi' ? 'Tiến độ hiện tại' : 'Current Progress',
    });
  } else if (now >= endTime || goal.progressCache >= 100) {
    actualPoints.push({
      x: padding.left + chartW,
      y: getY(goal.progressCache),
      date: goal.endDate,
      percent: goal.progressCache,
      note: goal.progressCache >= 100
        ? (language === 'vi' ? 'Hoàn thành' : 'Completed')
        : (language === 'vi' ? 'Kết thúc kỳ' : 'Period End'),
    });
  }

  // Sort actual points by x
  actualPoints.sort((a, b) => a.x - b.x);

  // Path string for actual line
  const actualPathD = actualPoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Area path below actual line for gradient fill
  const actualAreaD =
    actualPoints.length > 0
      ? `${actualPathD} L ${actualPoints[actualPoints.length - 1].x} ${
          padding.top + chartH
        } L ${actualPoints[0].x} ${padding.top + chartH} Z`
      : '';

  // Format date helper
  const fmtDate = (d: string) => {
    try {
      return format(parseISO(d), 'dd/MM/yyyy', {
        locale: language === 'vi' ? vi : undefined,
      });
    } catch {
      return d;
    }
  };

  return (
    <div
      className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {/* Header with Goal info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {language === 'vi' ? 'Đường xu hướng tiến độ:' : 'Progress Trajectory:'}{' '}
              <span className="text-indigo-600 dark:text-indigo-400">{goal.title}</span>
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {fmtDate(goal.startDate)} ➔ {fmtDate(goal.endDate)}
              </span>
            </span>
            {goal.atRisk && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('goals.atRiskBadge')}</span>
              </span>
            )}
            {goal.progressCache >= 100 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Hoàn thành xuất sắc' : 'Completed'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-1 rounded-full bg-indigo-600" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {language === 'vi' ? 'Thực tế' : 'Actual'} ({goal.progressCache}%)
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-500" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {language === 'vi' ? 'Lý tưởng' : 'Ideal'} ({goal.idealProgress}%)
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-30 bg-slate-900 dark:bg-slate-950 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 -translate-x-1/2 -translate-y-full whitespace-nowrap transition-all duration-150"
            style={{
              left: `${hoveredPoint.x}px`,
              top: `${hoveredPoint.y - 10}px`,
            }}
          >
            <div className="font-bold text-indigo-300">
              {hoveredPoint.actual !== undefined && hoveredPoint.actual !== null
                ? `${language === 'vi' ? 'Thực tế' : 'Actual'}: ${hoveredPoint.actual}%`
                : ''}
            </div>
            {hoveredPoint.note && (
              <div className="text-[11px] text-slate-300 italic">{hoveredPoint.note}</div>
            )}
            <div className="text-[10px] text-slate-400">{fmtDate(hoveredPoint.date)}</div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-72 select-none"
        >
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y axis labels */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartW}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-100 dark:text-slate-800"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-medium"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Ideal Progress Line (Dashed) */}
          <line
            x1={idealStart.x}
            y1={idealStart.y}
            x2={idealEnd.x}
            y2={idealEnd.y}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="opacity-80"
          />

          {/* Actual Line Gradient Area */}
          {actualAreaD && <path d={actualAreaD} fill="url(#actualGradient)" />}

          {/* Actual Progress Line */}
          {actualPathD && (
            <path
              d={actualPathD}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {actualPoints.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer group"
              onMouseEnter={(e) => {
                if (containerRef.current) {
                  const containerRect = containerRef.current.getBoundingClientRect();
                  const circleRect = e.currentTarget.getBoundingClientRect();
                  setHoveredPoint({
                    x: circleRect.left - containerRect.left + circleRect.width / 2,
                    y: circleRect.top - containerRect.top,
                    date: pt.date,
                    actual: pt.percent,
                    note: pt.note,
                  });
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r="7"
                fill="#6366f1"
                className="opacity-0 group-hover:opacity-30 transition-opacity"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="#ffffff"
                stroke="#6366f1"
                strokeWidth="2.5"
                className="transition-transform group-hover:scale-125"
              />
            </g>
          ))}

          {/* X axis labels */}
          <text
            x={padding.left}
            y={height - 12}
            textAnchor="start"
            className="text-[10px] fill-slate-400 font-medium"
          >
            {fmtDate(goal.startDate)} ({language === 'vi' ? 'Bắt đầu' : 'Start'})
          </text>
          <text
            x={padding.left + chartW}
            y={height - 12}
            textAnchor="end"
            className="text-[10px] fill-slate-400 font-medium"
          >
            {fmtDate(goal.endDate)} ({language === 'vi' ? 'Hạn chót' : 'Deadline'})
          </text>
        </svg>
      </div>
    </div>
  );
};
