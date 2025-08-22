import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full mx-4';
      default:
        return 'max-w-lg';
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
      <div 
        className="flex min-h-screen items-center justify-center p-4 text-center"
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        
        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            'relative w-full transform overflow-hidden rounded-2xl bg-white border-2 border-slate-200 shadow-4xl transition-all animate-scale-in backdrop-blur-sm',
            getSizeClasses(),
            className
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-8 py-6 border-b-2 border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50">
              {title && (
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="rounded-xl bg-white/80 p-2 text-slate-400 hover:text-slate-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transition-all duration-200 shadow-medium"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon className="h-6 w-6" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="px-8 py-6 bg-gradient-to-br from-white to-slate-50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
