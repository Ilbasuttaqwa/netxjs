import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  onSelect: (item: DropdownItem) => void;
  trigger: React.ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  items,
  onSelect,
  trigger,
  placement = 'bottom-start',
  className,
  menuClassName,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const getPlacementClasses = () => {
    switch (placement) {
      case 'bottom-start':
        return 'top-full left-0 mt-1';
      case 'bottom-end':
        return 'top-full right-0 mt-1';
      case 'top-start':
        return 'bottom-full left-0 mb-1';
      case 'top-end':
        return 'bottom-full right-0 mb-1';
      default:
        return 'top-full left-0 mt-1';
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      onSelect(item);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {trigger}
      </div>

      {/* Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 min-w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-scale-in',
            getPlacementClasses(),
            menuClassName
          )}
        >
          {items.map((item, index) => (
            <React.Fragment key={`${item.value}-${index}`}>
              {item.divider && (
                <div className="border-t border-gray-200 my-1" />
              )}
              <button
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center space-x-2',
                  item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900 focus:outline-none'
                )}
              >
                {item.icon && (
                  <span className="flex-shrink-0">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

// Simple Select Dropdown Component
interface SelectProps {
  options: { label: string; value: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi',
  disabled = false,
  className,
  error = false,
}) => {
  const selectedOption = options.find(option => option.value === value);

  const dropdownItems: DropdownItem[] = options.map(option => ({
    label: option.label,
    value: option.value,
  }));

  const trigger = (
    <div
      className={cn(
        'flex items-center justify-between w-full px-4 py-3 text-left bg-white border-2 rounded-xl shadow-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all duration-300',
        error
          ? 'border-red-400 focus:border-red-500 shadow-glow-rose'
          : 'border-slate-300 focus:border-violet-500 hover:border-violet-400 focus:shadow-glow',
        disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
        className
      )}
    >
      <span className={cn(
        'block truncate',
        !selectedOption && 'text-gray-500'
      )}>
        {selectedOption ? selectedOption.label : placeholder}
      </span>
      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
    </div>
  );

  return (
    <Dropdown
      items={dropdownItems}
      onSelect={(item) => onChange(item.value)}
      trigger={trigger}
      disabled={disabled}
      className="w-full"
    />
  );
};

export default Dropdown;
