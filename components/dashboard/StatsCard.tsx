import React from 'react';
import { cn } from '../../utils/cn';
import Card from '../ui/card';
import Loading from '../ui/Loading';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  loading = false,
  subtitle,
  trend,
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 text-white shadow-glow';
      case 'secondary':
        return 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white';
      case 'success':
        return 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow-glow-emerald';
      case 'warning':
        return 'bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white';
      case 'danger':
        return 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 text-white shadow-glow-rose';
      case 'info':
        return 'bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-500 text-white';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600 text-white';
    }
  };

  const getBgColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-gradient-to-br from-violet-50/80 via-purple-50/80 to-indigo-50/80 border-violet-200/30';
      case 'secondary':
        return 'bg-gradient-to-br from-slate-50/80 via-slate-100/80 to-slate-50/80 border-slate-200/30';
      case 'success':
        return 'bg-gradient-to-br from-emerald-50/80 via-green-50/80 to-teal-50/80 border-emerald-200/30';
      case 'warning':
        return 'bg-gradient-to-br from-amber-50/80 via-orange-50/80 to-yellow-50/80 border-amber-200/30';
      case 'danger':
        return 'bg-gradient-to-br from-red-50/80 via-rose-50/80 to-pink-50/80 border-red-200/30';
      case 'info':
        return 'bg-gradient-to-br from-blue-50/80 via-cyan-50/80 to-indigo-50/80 border-blue-200/30';
      default:
        return 'bg-gradient-to-br from-gray-50/80 to-gray-100/80 border-gray-200/30';
    }
  };

  if (loading) {
    return (
      <div className={cn(
        'card-stats animate-fade-in',
        getBgColorClasses()
      )}>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mb-2" />
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse" />
            {subtitle && <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mt-2 w-3/4" />}
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'card-stats hover-lift animate-fade-in group',
      getBgColorClasses()
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dots opacity-30" />
      
      {/* Floating Elements */}
      <div className="absolute top-2 right-2 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl" />
      <div className="absolute bottom-2 left-2 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-lg" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 text-shadow">{title}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white text-shadow-lg group-hover:text-gradient transition-all duration-300">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-3">
                <span
                  className={cn(
                    'text-sm font-bold px-2 py-1 rounded-full',
                    trend.isPositive 
                      ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30' 
                      : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30'
                  )}
                >
                  {trend.isPositive ? '↗' : '↘'} {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-medium">
                  vs last period
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
              getColorClasses()
            )}
          >
            <div className="transform transition-transform duration-300 group-hover:scale-110">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
