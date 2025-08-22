import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className,
  text,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-6 h-6';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'primary':
        return 'text-primary-600';
      case 'secondary':
        return 'text-secondary-600';
      case 'white':
        return 'text-white';
      case 'gray':
        return 'text-gray-600';
      default:
        return 'text-primary-600';
    }
  };

  const renderSpinner = () => (
    <svg
      className={cn(
        'animate-spin',
        getSizeClasses(),
        getColorClasses(),
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderDots = () => (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            getSizeClasses().replace('w-', 'w-').replace('h-', 'h-').split(' ').map(cls => {
              if (cls.startsWith('w-')) return cls.replace(/\d+/, (match) => String(Math.max(1, parseInt(match) / 2)));
              if (cls.startsWith('h-')) return cls.replace(/\d+/, (match) => String(Math.max(1, parseInt(match) / 2)));
              return cls;
            }).join(' '),
            getColorClasses().replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        'rounded-full animate-pulse',
        getSizeClasses(),
        getColorClasses().replace('text-', 'bg-'),
        className
      )}
    />
  );

  const renderBars = () => (
    <div className={cn('flex items-end space-x-1', className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse',
            'w-1',
            getSizeClasses().split(' ')[1], // Get height class
            getColorClasses().replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.8s',
            height: `${20 + (i % 2) * 10}px`,
          }}
        />
      ))}
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderLoader()}
      {text && (
        <p className={cn('text-sm', getColorClasses())}>
          {text}
        </p>
      )}
    </div>
  );
};

export default Loading;
