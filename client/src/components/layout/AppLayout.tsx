import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/Toast';
import { QuickCreateModal } from '../common/QuickCreateModal';
import { ShortcutsModal } from '../common/ShortcutsModal';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const isFullHeightPage = location.pathname.startsWith('/learn/chat');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger when user is typing in form controls or holding modifiers (Ctrl/Cmd/Alt)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickCreateOpen(true);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('gc-jump-today'));
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickCreateAction = (action: 'task' | 'goal' | 'event') => {
    if (action === 'task') {
      navigate('/tasks?create=true');
    } else if (action === 'goal') {
      navigate('/goals?create=true');
    } else if (action === 'event') {
      navigate('/calendar?create=true');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex md:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          isCollapsed={false}
          onToggleCollapse={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        <main
          className={`flex-1 min-h-0 ${
            isFullHeightPage
              ? 'p-2 sm:p-3 overflow-hidden flex flex-col'
              : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Modals triggered by shortcuts */}
      <QuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onSelectAction={handleQuickCreateAction}
      />
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
