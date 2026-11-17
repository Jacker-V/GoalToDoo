import React from 'react';
import { BarChart3, TrendingUp, Zap, Target } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const InsightsPlaceholderPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-md">
        <BarChart3 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
          Giai đoạn 5 sắp ra mắt
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Báo cáo & Thống kê Hiệu suất (Insights)
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
          Biểu đồ phân tích năng suất cá nhân, tỷ lệ hoàn thành mục tiêu, chuỗi ngày hoàn thành thói quen (streak analytics) và cảnh báo trễ hạn thông minh.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <TrendingUp className="w-5 h-5 text-indigo-500 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Xu hướng hoàn thành</h4>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tỷ lệ hoàn thành công việc theo ngày, tuần và tháng.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <Zap className="w-5 h-5 text-indigo-500 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Streak Tracker</h4>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận và tôn vinh chuỗi ngày kỷ luật liên tiếp của bạn.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <Target className="w-5 h-5 text-indigo-500 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tiến độ mục tiêu</h4>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá sức khỏe của các mục tiêu chiến lược và dự báo ngày về đích.
          </p>
        </div>
      </div>

      <div className="pt-4 flex justify-center space-x-3">
        <Button variant="primary" onClick={() => navigate('/goals')}>
          Quản lý Mục tiêu
        </Button>
        <Button variant="outline" onClick={() => navigate('/tasks')}>
          Xem danh sách công việc
        </Button>
      </div>
    </div>
  );
};
