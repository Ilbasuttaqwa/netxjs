import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShieldCheckIcon, 
  UserGroupIcon, 
  UserIcon 
} from '@heroicons/react/24/outline';

interface UserRoleBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ 
  size = 'md', 
  showIcon = true, 
  showText = true,
  className = ''
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrator',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: ShieldCheckIcon,
          darkColor: 'dark:bg-red-900 dark:text-red-200 dark:border-red-800'
        };
      case 'manager':
        return {
          label: 'Manager',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: UserGroupIcon,
          darkColor: 'dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
        };
      case 'user':
        return {
          label: 'Karyawan',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: UserIcon,
          darkColor: 'dark:bg-green-900 dark:text-green-200 dark:border-green-800'
        };
      default:
        return {
          label: 'User',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: UserIcon,
          darkColor: 'dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'h-3 w-3'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'h-5 w-5'
        };
      default: // md
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'h-4 w-4'
        };
    }
  };

  const roleConfig = getRoleConfig(user.role);
  const sizeClasses = getSizeClasses(size);
  const IconComponent = roleConfig.icon;

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${roleConfig.color} ${roleConfig.darkColor}
        ${sizeClasses.container}
        ${className}
      `}
    >
      {showIcon && (
        <IconComponent className={sizeClasses.icon} />
      )}
      {showText && roleConfig.label}
    </span>
  );
};

export default UserRoleBadge;