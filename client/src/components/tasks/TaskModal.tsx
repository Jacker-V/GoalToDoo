import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar, Clock, Repeat, Target, Tag, ListChecks } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getItemDateStr } from '../../utils/calendar';
import type { Task, CreateTaskInput, Subtask, Priority, RecurrenceType } from '../../types/task';
import type { Goal } from '../../types/goal';
import { useI18n } from '../../i18n';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  task?: Task | null;
  goals?: Goal[];
  initialDueDate?: string;
  isLoading?: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  goals = [],
  initialDueDate,
  isLoading = false,
}) => {
  const { t, language } = useI18n();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [goalId, setGoalId] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setDueDate(task.dueDate ? getItemDateStr(task.dueDate) : '');
      setDueTime(task.dueTime || '');
      setPriority(task.priority || 'medium');
      setGoalId(task.goalId || '');
      setTags(task.tags || []);
      setSubtasks(task.subtasks || []);
      setRecurrenceType(task.recurrence?.type || 'none');
      setInterval(task.recurrence?.interval || 1);
      setDaysOfWeek(task.recurrence?.daysOfWeek || []);
    } else {
      setTitle('');
      setNotes('');
      setDueDate(initialDueDate || '');
      setDueTime('');
      setPriority('medium');
      setGoalId('');
      setTags([]);
      setSubtasks([]);
      setRecurrenceType('none');
      setInterval(1);
      setDaysOfWeek([]);
    }
    setErrors({});
  }, [task, isOpen, initialDueDate]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, idx) => idx !== index));
  };

  const handleAddSubtask = () => {
    const trimmed = subtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks([...subtasks, { title: trimmed, done: false }]);
    setSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, idx) => idx !== index));
  };

  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrors({ title: 'Task title is required' });
      return;
    }

    const payload: CreateTaskInput = {
      title: title.trim(),
      notes: notes.trim(),
      priority,
      goalId: goalId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      dueTime: dueTime.trim() || null,
      tags,
      subtasks,
      recurrence: {
        type: recurrenceType,
        interval,
        daysOfWeek: recurrenceType === 'weekly' ? daysOfWeek : [],
      },
    };

    await onSubmit(payload);
  };

  const weekDayLabels = [
    { label: language === 'vi' ? 'T2' : 'M', val: 1 },
    { label: language === 'vi' ? 'T3' : 'Tu', val: 2 },
    { label: language === 'vi' ? 'T4' : 'W', val: 3 },
    { label: language === 'vi' ? 'T5' : 'Th', val: 4 },
    { label: language === 'vi' ? 'T6' : 'F', val: 5 },
    { label: language === 'vi' ? 'T7' : 'Sa', val: 6 },
    { label: language === 'vi' ? 'CN' : 'Su', val: 0 },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? t('tasks.modal.editTitle') : t('tasks.modal.createTitle')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label={`${t('tasks.modal.taskTitle')} *`}
          placeholder={t('tasks.modal.taskTitlePlaceholder')}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({});
          }}
          error={errors.title}
          autoFocus
        />

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('tasks.modal.notes')}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('tasks.modal.notesPlaceholder')}
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-slate-300 dark:border-slate-700"
          />
        </div>

        {/* Due Date & Due Time & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 mr-1 text-slate-400" />
              {t('tasks.modal.dueDate')}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 mr-1 text-slate-400" />
              {t('tasks.modal.dueTime')}
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('tasks.modal.priority')}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">{t('common.priority.low')}</option>
              <option value="medium">{t('common.priority.medium')}</option>
              <option value="high">{t('common.priority.high')}</option>
            </select>
          </div>
        </div>

        {/* Goal Selector */}
        <div className="space-y-1.5">
          <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Target className="w-4 h-4 mr-1 text-indigo-500" />
            {t('tasks.modal.linkGoal')}
          </label>
          <select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t('tasks.modal.noGoal')}</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                [{g.type.toUpperCase()}] {g.title} ({g.progressCache}%)
              </option>
            ))}
          </select>
        </div>

        {/* Subtasks Manager */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <label className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
            <ListChecks className="w-4 h-4 mr-1.5 text-indigo-500" />
            {t('tasks.modal.subtasks')}
          </label>

          <div className="flex space-x-2">
            <input
              type="text"
              placeholder={t('tasks.modal.subtaskPlaceholder')}
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              className="flex-1 px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSubtask}
              disabled={!subtaskTitle.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t('tasks.modal.addSubtask')}
            </Button>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
              {subtasks.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className={st.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}>
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recurrence Settings */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <label className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Repeat className="w-4 h-4 mr-1.5 text-purple-500" />
            {t('tasks.modal.recurrence')}
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['none', 'daily', 'weekdays', 'weekly'] as RecurrenceType[]).map((rType) => (
              <button
                key={rType}
                type="button"
                onClick={() => setRecurrenceType(rType)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  recurrenceType === rType
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(`tasks.modal.recurrenceTypes.${rType}`)}
              </button>
            ))}
          </div>

          {recurrenceType === 'weekly' && (
            <div className="pt-2">
              <span className="text-xs text-slate-500 block mb-1">
                {language === 'vi' ? 'Chọn các ngày trong tuần:' : 'Select days of week:'}
              </span>
              <div className="flex space-x-1">
                {weekDayLabels.map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => toggleDayOfWeek(d.val)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                      daysOfWeek.includes(d.val)
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Tag className="w-4 h-4 mr-1 text-slate-400" />
            {t('tasks.modal.tags')}
          </label>
          <input
            type="text"
            placeholder={t('tasks.modal.tagsPlaceholder')}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tg, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  #{tg}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="ml-1 text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {task ? t('common.save') : t('tasks.addTask')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
