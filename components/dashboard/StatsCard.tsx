import React from 'react';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';

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
        return 'bg-primary-500 text-white';
      case 'secondary':
        return 'bg-secondary-500 text-white';
      case 'success':
        return 'bg-success-500 text-white';
      case 'warning':
        return 'bg-warning-500 text-white';
      case 'danger':
        return 'bg-danger-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getBgColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary-50';
      case 'secondary':
        return 'bg-secondary-50';
      case 'success':
        return 'bg-success-50';
      case 'warning':
        return 'bg-warning-50';
      case 'danger':
        return 'bg-danger-50';
      case 'info':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card variant="default" hover animate className={getBgColorClasses()}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-8 bg-gray-200 rounded animate-pulse" />
            {subtitle && <div className="h-3 bg-gray-200 rounded animate-pulse mt-2 w-3/4" />}
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      variant="default" 
      hover 
      animate 
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        getBgColorClasses()
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend.isPositive ? 'text-success-600' : 'text-danger-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  vs last period
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-lg',
              getColorClasses()
            )}
          >
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;