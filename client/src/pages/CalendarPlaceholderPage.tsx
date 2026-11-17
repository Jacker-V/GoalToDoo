import React from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const CalendarPlaceholderPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-md">
        <Calendar className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
          Giai đoạn 4 sắp ra mắt
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Lịch biểu & Tích hợp Time-blocking
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
          Giao diện xem lịch theo Tháng / Tuần / Ngày kết hợp Time-blocking, đồng bộ trực tiếp với các mục tiêu và công việc bạn đã lên kế hoạch ở Giai đoạn 3.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <Clock className="w-5 h-5 text-indigo-500 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Time-blocking</h4>
          <p className="text-xs text-slate-500 mt-1">
            Kéo thả phân bổ khung giờ làm việc cho từng công việc cụ thể.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <Calendar className="w-5 h-5 text-indigo-500 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Đồng bộ đa chế độ</h4>
          <p className="text-xs text-slate-500 mt-1">
            Xem lịch Month, Week, Day và danh sách sự kiện song song.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <Sparkles className="w-5 h-5 text-indigo-500 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Liên kết mục tiêu</h4>
          <p className="text-xs text-slate-500 mt-1">
            Mỗi khối thời gian đóng góp vào tiến độ các mục tiêu tuần và tháng.
          </p>
        </div>
      </div>

      <div className="pt-4 flex justify-center space-x-3">
        <Button variant="primary" onClick={() => navigate('/tasks')}>
          Xem danh sách công việc
        </Button>
        <Button variant="outline" onClick={() => navigate('/goals')}>
          Khám phá cây mục tiêu
        </Button>
      </div>
    </div>
  );
};
