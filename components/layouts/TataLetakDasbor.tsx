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
  WifiIcon,
  SignalIcon,
  CloudIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import DarkModeToggle from '../DarkModeToggle';
import UserRoleBadge from '../ui/UserRoleBadge';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const getNavigationForRole = (role: string): NavItem[] => {
  const baseNavigation: NavItem[] = [
    // Dashboard berdasarkan role
    ...(role === 'admin' ? [{ name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon }] : []),
    ...(role === 'manager' ? [{ name: 'Dashboard', href: '/manager/dashboard', icon: HomeIcon }] : []),
    ...(role === 'user' ? [{ name: 'Dashboard', href: '/dasbor', icon: HomeIcon }] : []),
    
    // Menu untuk Admin
    { name: 'Monitoring', href: '/admin/pemantauan', icon: ComputerDesktopIcon, roles: ['admin'] },
    { name: 'Device Management', href: '/admin/devices', icon: WifiIcon, roles: ['admin'] },
    { name: 'Device Config', href: '/admin/device-config', icon: CogIcon, roles: ['admin'] },
    { name: 'Device Monitor', href: '/admin/device-monitor', icon: SignalIcon, roles: ['admin'] },
    { name: 'Device Monitoring', href: '/admin/pemantauan-perangkat', icon: ComputerDesktopIcon, roles: ['admin'] },
    { name: 'Device Analytics', href: '/admin/device-analytics', icon: ChartBarIcon, roles: ['admin'] },
    { name: 'Fingerprint Backup', href: '/admin/fingerprint-backup', icon: CircleStackIcon, roles: ['admin'] },
    { name: 'Cloud Config', href: '/admin/cloud-config', icon: CloudIcon, roles: ['admin'] },
    { name: 'Cabang', href: '/admin/cabang', icon: BuildingOfficeIcon, roles: ['admin'] },
    { name: 'Jabatan', href: '/admin/jabatan', icon: BriefcaseIcon, roles: ['admin'] },
    { name: 'Aturan Payroll', href: '/admin/payroll-rules', icon: Cog6ToothIcon, roles: ['admin'] },
    { name: 'Pengaturan', href: '/admin/settings', icon: CogIcon, roles: ['admin'] },
    
    // Menu untuk Admin dan Manager
    { name: 'Pengguna', href: '/users', icon: UserCircleIcon, roles: ['admin', 'manager'] },
    { name: 'Karyawan', href: '/admin/karyawan', icon: UsersIcon, roles: ['admin', 'manager'] },
    { name: 'Absensi', href: '/admin/absensi', icon: CalendarDaysIcon, roles: ['admin', 'manager'] },
    { name: 'Bon Karyawan', href: '/admin/bon', icon: CurrencyDollarIcon, roles: ['admin', 'manager'] },
    { name: 'Payroll', href: '/admin/payroll', icon: DocumentChartBarIcon, roles: ['admin', 'manager'] },
    
    // Menu untuk semua role
    { name: 'Kehadiran', href: '/attendance', icon: ClockIcon, roles: ['admin', 'manager', 'user'] },
  ];
  
  return baseNavigation.filter(item => !item.roles || item.roles.includes(role));
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const filteredNavigation = getNavigationForRole(user?.role || 'user');

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col glass">
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
              <div className="h-8 w-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">AFMS</span>
              </div>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">AFMS</span>
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
                      group flex items-center px-3 py-3 text-base font-medium rounded-xl w-full text-left transition-all duration-300
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg transform scale-105'
                          : 'text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 hover:text-violet-700 hover:shadow-md hover:scale-105'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        mr-4 h-6 w-6 flex-shrink-0 transition-all duration-300
                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-violet-600'}
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
                <p className="text-base font-medium text-gray-700">{user?.nama_pegawai}</p>
                <p className="text-sm font-medium text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-violet-200/30 glass dark:border-violet-700/30">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <div className="h-8 w-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">AFMS</span>
              </div>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">AFMS</span>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {filteredNavigation.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={`
                      group flex items-center px-3 py-3 text-sm font-medium rounded-xl w-full text-left transition-all duration-300
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg transform scale-105'
                          : 'text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 hover:text-violet-700 hover:shadow-md hover:scale-105 dark:text-gray-300 dark:hover:from-violet-900/30 dark:hover:to-indigo-900/30 dark:hover:text-violet-300'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        mr-3 h-6 w-6 flex-shrink-0 transition-all duration-300
                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-violet-600 dark:text-gray-400 dark:group-hover:text-violet-400'}
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
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.nama_pegawai}</p>
                <UserRoleBadge size="sm" className="mt-1" />
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
        <div className="hidden lg:block glass shadow-lg border-b border-violet-200/30 dark:border-violet-700/30 backdrop-blur-xl">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {filteredNavigation.find((item) => item.href === router.pathname)?.name || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <DarkModeToggle />
                <button className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
                  <BellIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.nama_pegawai}</span>
                    <UserRoleBadge size="sm" />
                  </div>
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
