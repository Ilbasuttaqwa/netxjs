import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from '../../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-success-500" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-danger-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-primary-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'border-success-200 bg-success-50';
      case 'error':
        return 'border-danger-200 bg-danger-50';
      case 'warning':
        return 'border-warning-200 bg-warning-50';
      case 'info':
        return 'border-primary-200 bg-primary-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto border-l-4
        ${getColorClasses()}
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-500">
                {toast.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={handleRemove}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
};

export default Toast;
