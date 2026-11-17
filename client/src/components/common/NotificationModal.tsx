import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../../store/useToastStore';
import { useI18n } from '../../i18n';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported, isOpen]);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error(t('notifications.unsupported'));
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success(t('notifications.statusGranted'));
        new Notification(t('notifications.testTitle'), {
          body: t('notifications.testBody'),
        });
      } else {
        toast.warning(t('notifications.statusDenied'));
      }
    } catch (err) {
      toast.error('Failed to request notification permission');
    }
  };

  const sendTestNotification = () => {
    if (permission !== 'granted') {
      toast.warning(t('notifications.statusDefault'));
      return;
    }

    new Notification(t('notifications.testTitle'), {
      body: t('notifications.testBody'),
      icon: '/vite.svg',
    });
    toast.success(t('notifications.testSent'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('notifications.modalTitle')}
      description={t('notifications.modalDesc')}
      size="md"
    >
      <div className="space-y-5">
        {/* Permission Status Box */}
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3.5 ${
            permission === 'granted'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              : permission === 'denied'
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
              : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              permission === 'granted'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                : permission === 'denied'
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300'
            }`}
          >
            {permission === 'granted' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : permission === 'denied' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div className="text-xs">
            <div className="font-bold text-slate-800 dark:text-white">
              {permission === 'granted'
                ? t('notifications.statusGranted')
                : permission === 'denied'
                ? t('notifications.statusDenied')
                : t('notifications.statusDefault')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {!isSupported
                ? t('notifications.unsupported')
                : permission === 'granted'
                ? t('notifications.grantedDesc')
                : t('notifications.defaultDesc')}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {permission !== 'granted' ? (
            <Button
              className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2"
              onClick={requestPermission}
              disabled={!isSupported || permission === 'denied'}
            >
              <BellRing className="w-4 h-4" />
              <span>{t('notifications.enableButton')}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2"
              onClick={sendTestNotification}
            >
              <BellRing className="w-4 h-4 text-indigo-500" />
              <span>{t('notifications.testButton')}</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
