import React, { useState, useEffect } from 'react';
import { Target, Calendar, Palette, Layers, Award } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type {
  Goal,
  CreateGoalInput,
  GoalType,
  GoalPriority,
  GoalProgressMode,
} from '../../types/goal';
import type { Category } from '../../types/category';
import { formatLocalDate } from '../../utils/date';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalInput) => Promise<void>;
  goal?: Goal | null;
  existingGoals?: Goal[];
  categories?: Category[];
  initialType?: GoalType;
  initialStartDate?: string;
  initialEndDate?: string;
  isLoading?: boolean;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  goal,
  existingGoals = [],
  categories = [],
  initialType,
  initialStartDate,
  initialEndDate,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GoalType>('custom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [parentId, setParentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [progressMode, setProgressMode] = useState<GoalProgressMode>('auto');
  const [targetValue, setTargetValue] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('');
  const [weight, setWeight] = useState(1);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const colorPresets = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#8b5cf6', // Violet
  ];

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || '');
      setDescription(goal.description || '');
      setType(goal.type || 'custom');
      setStartDate(goal.startDate ? goal.startDate.split('T')[0] : '');
      setEndDate(goal.endDate ? goal.endDate.split('T')[0] : '');
      setParentId(goal.parentId || '');
      setCategoryId(goal.categoryId || '');
      setColor(goal.color || '#6366f1');
      setPriority(goal.priority || 'medium');
      setProgressMode(goal.progressMode || 'auto');
      setTargetValue(goal.targetValue ?? 100);
      setCurrentValue(goal.currentValue ?? 0);
      setUnit(goal.unit || '');
      setWeight(goal.weight ?? 1);
    } else {
      setTitle('');
      setDescription('');
      setType(initialType || 'custom');
      setStartDate(initialStartDate || formatLocalDate(new Date()));
      setEndDate(initialEndDate || formatLocalDate(new Date(Date.now() + 7 * 86400000)));
      setParentId('');
      setCategoryId('');
      setColor('#6366f1');
      setPriority('medium');
      setProgressMode('auto');
      setTargetValue(100);
      setCurrentValue(0);
      setUnit('');
      setWeight(1);
    }
    setErrors({});
  }, [goal, isOpen, initialType, initialStartDate, initialEndDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Tiêu đề mục tiêu là bắt buộc';
    }
    if (!startDate) {
      newErrors.startDate = 'Ngày bắt đầu là bắt buộc';
    }
    if (!endDate) {
      newErrors.endDate = 'Ngày kết thúc là bắt buộc';
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: CreateGoalInput = {
      title: title.trim(),
      description: description.trim(),
      type,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      parentId: parentId || null,
      categoryId: categoryId || null,
      color,
      priority,
      progressMode,
      targetValue: Number(targetValue) || 100,
      currentValue: Number(currentValue) || 0,
      unit: unit.trim(),
      weight: Number(weight) || 1,
    };

    await onSubmit(payload);
  };

  // Exclude current goal from parent options to prevent self-referencing
  const availableParents = existingGoals.filter((g) => !goal || g._id !== goal._id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={goal ? 'Chỉnh sửa Mục tiêu' : 'Tạo mới Mục tiêu'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Tiêu đề mục tiêu *"
          placeholder="Ví dụ: Đạt chứng chỉ IELTS 7.5, Đọc 12 cuốn sách..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({});
          }}
          error={errors.title}
          autoFocus
        />

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Mô tả mục tiêu
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tại sao mục tiêu này quan trọng? Kết quả then chốt là gì?"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
          />
        </div>

        {/* Goal Type & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Loại mục tiêu
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GoalType)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="year">Mục tiêu Năm (Yearly)</option>
              <option value="quarter">Mục tiêu Quý (Quarterly)</option>
              <option value="month">Mục tiêu Tháng (Monthly)</option>
              <option value="week">Mục tiêu Tuần (Weekly)</option>
              <option value="custom">Tùy chỉnh / Dài hạn (Custom)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Độ ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as GoalPriority)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">Thấp (Low)</option>
              <option value="medium">Trung bình (Medium)</option>
              <option value="high">Cao (High)</option>
            </select>
          </div>
        </div>

        {/* Start Date & End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 mr-1 text-slate-400" />
              Ngày bắt đầu *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.startDate && (
              <p className="text-xs text-rose-500">{errors.startDate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 mr-1 text-slate-400" />
              Ngày kết thúc *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.endDate && (
              <p className="text-xs text-rose-500">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Parent Goal & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4 mr-1 text-indigo-500" />
              Mục tiêu cha (Parent Goal)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Là mục tiêu gốc (Không có cha) --</option>
              {availableParents.map((p) => (
                <option key={p._id} value={p._id}>
                  [{p.type.toUpperCase()}] {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Danh mục (Category)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Không phân loại --</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress Mode Settings */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Award className="w-4 h-4 mr-1.5 text-amber-500" />
              Chế độ tính tiến độ (Progress Mode)
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setProgressMode('auto')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  progressMode === 'auto'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Tự động từ con (Auto)
              </button>
              <button
                type="button"
                onClick={() => setProgressMode('numeric')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  progressMode === 'numeric'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Chỉ số số học (Numeric)
              </button>
            </div>
          </div>

          {progressMode === 'auto' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tiến độ của mục tiêu này sẽ được tính tự động từ tỷ lệ hoàn thành trung bình có trọng số của các mục tiêu con và các công việc trực thuộc.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Mục tiêu cần đạt (Target)
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Giá trị hiện tại
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Đơn vị tính (Unit)
                </label>
                <input
                  type="text"
                  placeholder="trang, km, giờ..."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Color and Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="space-y-1.5">
            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
              <Palette className="w-4 h-4 mr-1 text-slate-400" />
              Màu sắc đại diện
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {colorPresets.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Trọng số đóng góp (Weight)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {goal ? 'Lưu thay đổi' : 'Tạo mục tiêu'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
