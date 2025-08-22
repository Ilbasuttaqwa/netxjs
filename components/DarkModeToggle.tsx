import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

interface DarkModeToggleProps {
  className?: string;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-10 w-10 items-center justify-center
        rounded-lg border border-gray-200 bg-white text-gray-500
        hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2
        focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400
        dark:hover:bg-gray-700 dark:hover:text-gray-200
        ${className}
      `}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
};

export default DarkModeToggle;