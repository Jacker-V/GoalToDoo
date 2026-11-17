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
import { getItemDateStr } from '../../utils/calendar';
import { formatLocalDate } from '../../utils/date';
import type {
  CalendarEvent,
  CreateEventInput,
  EventRecurrence,
  EventRecurrenceType,
} from '../../types/event';
import type { Category } from '../../types/category';
import { useI18n } from '../../i18n';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventInput) => Promise<void>;
  event?: CalendarEvent | null;
  categories?: Category[];
  initialDate?: string;
  initialStartTime?: string;
  isLoading?: boolean;
}

const PRESET_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
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
  const { t, language } = useI18n();
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

  const WEEKDAY_OPTIONS = [
    { label: language === 'vi' ? 'T2' : 'M', value: 1 },
    { label: language === 'vi' ? 'T3' : 'Tu', value: 2 },
    { label: language === 'vi' ? 'T4' : 'W', value: 3 },
    { label: language === 'vi' ? 'T5' : 'Th', value: 4 },
    { label: language === 'vi' ? 'T6' : 'F', value: 5 },
    { label: language === 'vi' ? 'T7' : 'Sa', value: 6 },
    { label: language === 'vi' ? 'CN' : 'Su', value: 0 },
  ];

  const REMINDER_OPTIONS = [
    { label: language === 'vi' ? '5 phút trước' : '5m before', value: 5 },
    { label: language === 'vi' ? '15 phút trước' : '15m before', value: 15 },
    { label: language === 'vi' ? '30 phút trước' : '30m before', value: 30 },
    { label: language === 'vi' ? '1 giờ trước' : '1h before', value: 60 },
    { label: language === 'vi' ? '1 ngày trước' : '1d before', value: 1440 },
  ];

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartDate(getItemDateStr(event.start));
      setEndDate(getItemDateStr(event.end));
      setAllDay(Boolean(event.allDay));
      setColor(event.color || '#6366f1');
      setCategoryId(event.categoryId || '');

      if (!event.allDay) {
        const s = new Date(event.start);
        const e = new Date(event.end);
        const shh = String(s.getHours()).padStart(2, '0');
        const smm = String(s.getMinutes()).padStart(2, '0');
        const ehh = String(e.getHours()).padStart(2, '0');
        const emm = String(e.getMinutes()).padStart(2, '0');
        setStartTime(`${shh}:${smm}`);
        setEndTime(`${ehh}:${emm}`);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
      }

      if (event.recurrence && event.recurrence.type) {
        setRecurrenceType(event.recurrence.type);
        setInterval(event.recurrence.interval || 1);
        setDaysOfWeek(event.recurrence.daysOfWeek || []);
        setRecurrenceEndDate(
          event.recurrence.endDate ? getItemDateStr(event.recurrence.endDate) : ''
        );
      } else {
        setRecurrenceType('none');
        setInterval(1);
        setDaysOfWeek([]);
        setRecurrenceEndDate('');
      }

      setReminders(event.reminders || []);
    } else {
      const defaultDate = initialDate || formatLocalDate(new Date());
      setTitle('');
      setDescription('');
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setStartTime(initialStartTime || '09:00');
      setEndTime(
        initialStartTime
          ? `${String(parseInt(initialStartTime.split(':')[0], 10) + 1).padStart(2, '0')}:00`
          : '10:00'
      );
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

  const toggleDayOfWeek = (dayVal: number) => {
    if (daysOfWeek.includes(dayVal)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayVal));
    } else {
      setDaysOfWeek([...daysOfWeek, dayVal]);
    }
  };

  const toggleReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      setReminders(reminders.filter((m) => m !== minutes));
    } else {
      setReminders([...reminders, minutes]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!endDate) {
      newErrors.endDate = 'End date is required';
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
      newErrors.endDate = 'End time must be after or equal to start time';
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
      title={event ? t('calendar.modal.editTitle') : t('calendar.modal.createTitle')}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label={`${t('calendar.modal.eventTitle')} *`}
          placeholder={t('calendar.modal.eventTitlePlaceholder')}
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
            {t('calendar.modal.isAllDay')}
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
              {t('calendar.modal.start')} *
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
              {t('calendar.modal.end')} *
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

        {/* Color & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <Palette className="w-3.5 h-3.5 mr-1" />
              {t('calendar.modal.color')}
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {PRESET_COLORS.slice(0, 6).map((c) => (
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1" />
              {t('calendar.modal.category')}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">{t('goals.modal.noCategory')}</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recurrence */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center">
            <Repeat className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            {t('calendar.modal.recurrence')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['none', 'daily', 'weekdays', 'weekly'] as EventRecurrenceType[]).map((rType) => (
              <button
                key={rType}
                type="button"
                onClick={() => setRecurrenceType(rType)}
                className={`py-1 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  recurrenceType === rType
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(`tasks.modal.recurrenceTypes.${rType}`)}
              </button>
            ))}
          </div>

          {recurrenceType === 'weekly' && (
            <div className="pt-2">
              <div className="flex space-x-1">
                {WEEKDAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(d.value)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                      daysOfWeek.includes(d.value)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reminders */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center">
            <Bell className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {t('calendar.modal.reminders')}
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
            <AlignLeft className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {t('goals.modal.description')}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('calendar.modal.description')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {event ? t('common.save') : t('calendar.addEvent')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
