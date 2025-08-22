import React, { useState, ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  BriefcaseIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import DarkModeToggle from '../DarkModeToggle';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Monitoring', href: '/admin/monitoring', icon: ComputerDesktopIcon, roles: ['admin'] },
  { name: 'Pengguna', href: '/users', icon: UserCircleIcon, roles: ['admin', 'manager'] },
  { name: 'Kehadiran', href: '/attendance', icon: ClockIcon, roles: ['admin', 'manager'] },
  { name: 'Karyawan', href: '/admin/karyawan', icon: UsersIcon, roles: ['admin', 'manager'] },
  { name: 'Cabang', href: '/admin/cabang', icon: BuildingOfficeIcon, roles: ['admin'] },
  { name: 'Jabatan', href: '/admin/jabatan', icon: BriefcaseIcon, roles: ['admin'] },
  { name: 'Absensi', href: '/admin/absensi', icon: CalendarDaysIcon, roles: ['admin', 'manager'] },
  { name: 'Bon Karyawan', href: '/admin/bon', icon: CurrencyDollarIcon, roles: ['admin', 'manager'] },
  { name: 'Payroll', href: '/admin/payroll', icon: DocumentChartBarIcon, roles: ['admin', 'manager'] },
  { name: 'Aturan Payroll', href: '/admin/payroll-rules', icon: Cog6ToothIcon, roles: ['admin'] },
  { name: 'Pengaturan', href: '/admin/settings', icon: CogIcon, roles: ['admin'] },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const filteredNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user?.role || '')
  );

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AFMS</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">AFMS</span>
            </div>
            <nav className="mt-5 space-y-1 px-2">
              {filteredNavigation.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`
                      group flex items-center px-2 py-2 text-base font-medium rounded-md w-full text-left
                      ${
                        isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        mr-4 h-6 w-6 flex-shrink-0
                        ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                <UserCircleIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{user?.name}</p>
                <p className="text-sm font-medium text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AFMS</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">AFMS</span>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {filteredNavigation.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left transition-colors
                      ${
                        isActive
                          ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        mr-3 h-6 w-6 flex-shrink-0 transition-colors
                        ${isActive ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'}
                      `}
                    />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex w-full items-center">
              <div className="h-9 w-9 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <UserCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 bg-white pl-1 pt-1 sm:pl-3 sm:pt-3 lg:hidden">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Page header */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {navigation.find((item) => item.href === router.pathname)?.name || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <DarkModeToggle />
                <button className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
                  <BellIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
