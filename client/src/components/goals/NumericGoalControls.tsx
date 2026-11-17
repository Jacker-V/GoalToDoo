import React, { useState } from 'react';
import { Plus, Minus, Check, Edit3 } from 'lucide-react';
import type { Goal } from '../../types/goal';

interface NumericGoalControlsProps {
  goal: Goal;
  onUpdateValue: (goal: Goal, newValue: number) => void;
  isUpdating?: boolean;
}

export const NumericGoalControls: React.FC<NumericGoalControlsProps> = ({
  goal,
  onUpdateValue,
  isUpdating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState((goal.currentValue ?? 0).toString());

  const handleIncrement = () => {
    const next = (goal.currentValue || 0) + 1;
    onUpdateValue(goal, next);
  };

  const handleDecrement = () => {
    const next = Math.max(0, (goal.currentValue || 0) - 1);
    onUpdateValue(goal, next);
  };

  const handleSaveInput = () => {
    const num = parseFloat(tempVal);
    if (!isNaN(num) && num >= 0) {
      onUpdateValue(goal, num);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {isEditing ? (
        <div className="flex items-center space-x-1.5">
          <input
            type="number"
            min="0"
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveInput();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-16 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 border-indigo-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleSaveInput}
            className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            title="Lưu"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => {
            setTempVal((goal.currentValue ?? 0).toString());
            setIsEditing(true);
          }}
          className="cursor-pointer group/num flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Nhấp để nhập trực tiếp"
        >
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {goal.currentValue}
          </span>
          <span className="text-xs text-slate-500">
            / {goal.targetValue} {goal.unit || ''}
          </span>
          <Edit3 className="w-3 h-3 text-slate-400 group-hover/num:text-indigo-500 ml-1 opacity-0 group-hover/num:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Stepper buttons */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          disabled={isUpdating || goal.currentValue <= 0}
          onClick={handleDecrement}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Giảm 1"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          disabled={isUpdating}
          onClick={handleIncrement}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-slate-200 dark:border-slate-700"
          title="Tăng 1"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
