import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface CurrencyInputProps {
  label?: string;
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  id?: string;
  name?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Masukkan jumlah",
  error,
  required = false,
  disabled = false,
  className,
  min = 0,
  max,
  id,
  name,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number to Indonesian currency format
  const formatCurrency = (num: number): string => {
    if (isNaN(num) || num === 0) return '';
    return new Intl.NumberFormat('id-ID').format(num);
  };

  // Parse formatted string back to number
  const parseCurrency = (str: string): number => {
    if (!str) return 0;
    // Remove all non-digit characters except decimal separator
    const cleanStr = str.replace(/[^\d]/g, '');
    return parseInt(cleanStr) || 0;
  };

  // Update display value when prop value changes
  useEffect(() => {
    const numValue = typeof value === 'string' ? parseCurrency(value) : value;
    if (!isFocused) {
      setDisplayValue(formatCurrency(numValue));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only digits and remove any non-digit characters
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    const numericValue = parseInt(cleanValue) || 0;
    
    // Apply min/max constraints
    let constrainedValue = numericValue;
    if (min !== undefined && constrainedValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && constrainedValue > max) {
      constrainedValue = max;
    }
    
    // Update display with formatted value
    setDisplayValue(formatCurrency(constrainedValue));
    
    // Call onChange with numeric value
    onChange(constrainedValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    const numValue = typeof value === 'string' ? parseCurrency(value) : value;
    setDisplayValue(numValue > 0 ? numValue.toString() : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format back to currency display
    const numValue = parseCurrency(displayValue);
    setDisplayValue(formatCurrency(numValue));
    onChange(numValue);
  };

  const inputId = id || name || 'currency-input';

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Rupiah prefix */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm font-medium">
            Rp
          </span>
        </div>
        
        <input
          id={inputId}
          name={name}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400',
            'dark:focus:ring-primary-400 dark:disabled:bg-gray-800',
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 text-gray-900 placeholder-gray-500',
            isFocused && 'ring-2 ring-primary-500 border-transparent'
          )}
        />
        
        {/* Clear button when focused and has value */}
        {isFocused && displayValue && !disabled && (
          <button
            type="button"
            onClick={() => {
              setDisplayValue('');
              onChange(0);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {/* Helper text showing formatted value */}
      {!error && displayValue && !isFocused && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {typeof value === 'number' && value > 0 ? 
            `Rp ${formatCurrency(typeof value === 'string' ? parseCurrency(value) : value)}` : 
            ''
          }
        </p>
      )}
    </div>
  );
};

export default CurrencyInput;