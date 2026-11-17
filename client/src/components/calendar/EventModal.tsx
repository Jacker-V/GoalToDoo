import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  Tag,
  Palette,
  Bell,
  AlignLeft,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type {
  CalendarEvent,
  CreateEventInput,
  EventRecurrence,
  EventRecurrenceType,
} from '../../types/event';
import type { Category } from '../../types/category';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventInput) => Promise<void>;
  event?: CalendarEvent | null;
  categories?: Category[];
  initialDate?: string; // YYYY-MM-DD
  initialStartTime?: string; // HH:mm
  isLoading?: boolean;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const WEEKDAY_OPTIONS = [
  { label: 'T2', value: 1 },
  { label: 'T3', value: 2 },
  { label: 'T4', value: 3 },
  { label: 'T5', value: 4 },
  { label: 'T6', value: 5 },
  { label: 'T7', value: 6 },
  { label: 'CN', value: 0 },
];

const REMINDER_OPTIONS = [
  { label: '5 phút trước', value: 5 },
  { label: '10 phút trước', value: 10 },
  { label: '15 phút trước', value: 15 },
  { label: '30 phút trước', value: 30 },
  { label: '1 giờ trước', value: 60 },
  { label: '1 ngày trước', value: 1440 },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  event,
  categories = [],
  initialDate,
  initialStartTime,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#6366f1');
  const [categoryId, setCategoryId] = useState<string>('');

  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState<EventRecurrenceType>('none');
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');

  // Reminders
  const [reminders, setReminders] = useState<number[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');

      const s = new Date(event.start);
      const e = new Date(event.end);

      const sDateStr = !isNaN(s.getTime()) ? s.toISOString().split('T')[0] : '';
      const sTimeStr = !isNaN(s.getTime())
        ? `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
        : '09:00';

      const eDateStr = !isNaN(e.getTime()) ? e.toISOString().split('T')[0] : '';
      const eTimeStr = !isNaN(e.getTime())
        ? `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`
        : '10:00';

      setStartDate(sDateStr);
      setStartTime(sTimeStr);
      setEndDate(eDateStr);
      setEndTime(eTimeStr);
      setAllDay(Boolean(event.allDay));
      setColor(event.color || '#6366f1');
      setCategoryId(event.categoryId || '');

      setRecurrenceType(event.recurrence?.type || 'none');
      setInterval(event.recurrence?.interval || 1);
      setDaysOfWeek(event.recurrence?.daysOfWeek || []);
      setRecurrenceEndDate(
        event.recurrence?.endDate ? event.recurrence.endDate.split('T')[0] : ''
      );

      setReminders(event.reminders || []);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const defaultDate = initialDate || todayStr;
      const defaultStart = initialStartTime || '09:00';

      setTitle('');
      setDescription('');
      setStartDate(defaultDate);
      setStartTime(defaultStart);
      setEndDate(defaultDate);

      // default end 1 hour later
      const [h, m] = defaultStart.split(':').map(Number);
      const endH = (h + 1) % 24;
      setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

      setAllDay(false);
      setColor('#6366f1');
      setCategoryId('');
      setRecurrenceType('none');
      setInterval(1);
      setDaysOfWeek([]);
      setRecurrenceEndDate('');
      setReminders([15]);
    }
    setErrors({});
  }, [event, isOpen, initialDate, initialStartTime]);

  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const toggleReminder = (min: number) => {
    if (reminders.includes(min)) {
      setReminders(reminders.filter((r) => r !== min));
    } else {
      setReminders([...reminders, min]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề sự kiện';
    }
    if (!startDate) {
      newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    }
    if (!endDate) {
      newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    }

    let startIso: string;
    let endIso: string;

    if (allDay) {
      startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();
    } else {
      startIso = new Date(`${startDate}T${startTime || '00:00'}:00`).toISOString();
      endIso = new Date(`${endDate}T${endTime || '00:00'}:00`).toISOString();
    }

    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      newErrors.endDate = 'Thời gian kết thúc không thể trước thời gian bắt đầu';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const recurrence: EventRecurrence | undefined =
      recurrenceType !== 'none'
        ? {
            type: recurrenceType,
            interval,
            daysOfWeek: recurrenceType === 'weekly' ? daysOfWeek : [],
            endDate: recurrenceEndDate ? new Date(`${recurrenceEndDate}T23:59:59.999Z`).toISOString() : null,
          }
        : undefined;

    const payload: CreateEventInput = {
      title: title.trim(),
      description: description.trim(),
      start: startIso,
      end: endIso,
      allDay,
      color,
      categoryId: categoryId ? categoryId : null,
      recurrence,
      reminders,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Tiêu đề sự kiện *"
          placeholder="Ví dụ: Họp Sprint Review, Lễ tốt nghiệp..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({ ...errors, title: '' });
          }}
          error={errors.title}
          autoFocus
        />

        {/* All-day switch */}
        <div className="flex items-center justify-between py-1 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Sự kiện cả ngày
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Start Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bắt đầu *
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-28 px-2 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kết thúc *
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-28 px-2 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
            {errors.endDate && (
              <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Category & Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1" />
              Danh mục
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                const catId = e.target.value;
                setCategoryId(catId);
                const selectedCat = categories.find((c) => c._id === catId);
                if (selectedCat && selectedCat.color) {
                  setColor(selectedCat.color);
                }
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Không có danh mục</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <Palette className="w-3.5 h-3.5 mr-1" />
              Màu sắc hiển thị
            </label>
            <div className="flex items-center space-x-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Recurrence */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center">
              <Repeat className="w-3.5 h-3.5 mr-1" />
              Lặp lại sự kiện
            </span>
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as EventRecurrenceType)}
              className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="none">Không lặp lại</option>
              <option value="daily">Hàng ngày</option>
              <option value="weekdays">Các ngày trong tuần (T2 - T6)</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </div>

          {recurrenceType !== 'none' && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
              {/* Interval */}
              <div className="flex items-center space-x-2">
                <span className="text-slate-600 dark:text-slate-400">Lặp lại mỗi:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-slate-900 dark:text-white"
                />
                <span className="text-slate-600 dark:text-slate-400">
                  {recurrenceType === 'daily'
                    ? 'ngày'
                    : recurrenceType === 'weekly'
                    ? 'tuần'
                    : recurrenceType === 'monthly'
                    ? 'tháng'
                    : recurrenceType === 'yearly'
                    ? 'năm'
                    : 'kỳ'}
                </span>
              </div>

              {/* Days of week for weekly */}
              {recurrenceType === 'weekly' && (
                <div>
                  <span className="text-slate-600 dark:text-slate-400 block mb-1">
                    Vào các ngày:
                  </span>
                  <div className="flex space-x-1.5">
                    {WEEKDAY_OPTIONS.map((opt) => {
                      const isSelected = daysOfWeek.includes(opt.value);
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => toggleDayOfWeek(opt.value)}
                          className={`w-7 h-7 rounded-md font-semibold text-xs flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recurrence End Date */}
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-slate-600 dark:text-slate-400">Kết thúc lặp:</span>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                {recurrenceEndDate && (
                  <button
                    type="button"
                    onClick={() => setRecurrenceEndDate('')}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Bỏ giới hạn
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reminders */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
            <Bell className="w-3.5 h-3.5 mr-1" />
            Nhắc nhở
          </label>
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_OPTIONS.map((opt) => {
              const active = reminders.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggleReminder(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
            <AlignLeft className="w-3.5 h-3.5 mr-1" />
            Mô tả
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Thêm ghi chú, đường dẫn cuộc họp hoặc chi tiết..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {event ? 'Lưu thay đổi' : 'Tạo sự kiện'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
