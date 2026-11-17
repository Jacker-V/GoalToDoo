import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Calendar,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../../services/category.service';
import { useI18n } from '../../i18n';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { t } = useI18n();
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const navItems = [
    {
      to: '/',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/goals',
      label: t('nav.goals'),
      icon: Target,
      badge: null,
    },
    {
      to: '/tasks',
      label: t('nav.tasks'),
      icon: CheckSquare,
      badge: null,
    },
    {
      to: '/calendar',
      label: t('nav.calendar'),
      icon: Calendar,
      badge: null,
    },
    {
      to: '/insights',
      label: t('nav.insights'),
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex-shrink-0">
            <div className="flex items-center">
              <Calendar className="w-5 h-5" />
              <Target className="w-3.5 h-3.5 -ml-1.5 -mt-1.5 text-rose-500" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                GoalCalendar
              </span>
              <span className="text-[10px] uppercase font-semibold text-indigo-500 tracking-wider">
                System Active
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                } ${isCollapsed ? 'justify-center' : 'justify-between'}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Categories Section */}
        {!isCollapsed && categories.length > 0 && (
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('nav.categories')} ({categories.length})
            </div>
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="flex items-center px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0"
                    style={{ backgroundColor: cat.color || '#6366f1' }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
          <p className="truncate">{t('common.appTagline')}</p>
          <p className="text-[10px] text-slate-400">{t('nav.version')}</p>
        </div>
      )}
    </aside>
  );
};
