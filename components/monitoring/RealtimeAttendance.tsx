import React, { useEffect, useState, useRef } from 'react';
import {
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface AttendanceRecord {
  id: number;
  karyawan_id: number;
  device_id: string;
  timestamp: string;
  type: 'masuk' | 'keluar';
  verify_method: 'fingerprint' | 'face' | 'card';
  status: 'hadir' | 'terlambat' | 'pulang_cepat';
  created_at: string;
}

interface RealtimeMessage {
  type: 'connected' | 'ping' | 'attendance_record' | 'records_cleared';
  data?: AttendanceRecord;
  clientId?: number;
  timestamp?: string;
}

const RealtimeAttendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    connectToRealtimeStream();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectToRealtimeStream = () => {
    try {
      setConnectionStatus('connecting');
      
      const eventSource = new EventSource('/api/fingerprint/realtime');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('Connected to realtime stream, client ID:', message.clientId);
              break;
              
            case 'ping':
              setLastUpdate(message.timestamp || new Date().toISOString());
              break;
              
            case 'attendance_record':
              if (message.data) {
                setRecords(prev => [message.data!, ...prev.slice(0, 49)]); // Keep last 50 records
                setLastUpdate(new Date().toISOString());
              }
              break;
              
            case 'records_cleared':
              setRecords([]);
              break;
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToRealtimeStream();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error connecting to SSE:', error);
      setConnectionStatus('disconnected');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hadir':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'terlambat':
        return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />;
      case 'pulang_cepat':
        return <XCircleIcon className="h-5 w-5 text-danger-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'hadir':
        return 'Hadir';
      case 'terlambat':
        return 'Terlambat';
      case 'pulang_cepat':
        return 'Pulang Cepat';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir':
        return 'bg-success-100 text-success-800';
      case 'terlambat':
        return 'bg-warning-100 text-warning-800';
      case 'pulang_cepat':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerifyMethodIcon = (method: string) => {
    switch (method) {
      case 'fingerprint':
        return '👆';
      case 'face':
        return '👤';
      case 'card':
        return '💳';
      default:
        return '🔍';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Monitoring Kehadiran Real-time
          </h3>
          <div className="flex items-center space-x-3">
            <div className={cn(
              'flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
              connectionStatus === 'connected' ? 'bg-success-100 text-success-800' :
              connectionStatus === 'connecting' ? 'bg-warning-100 text-warning-800' :
              'bg-danger-100 text-danger-800'
            )}>
              <div className={cn(
                'w-2 h-2 rounded-full',
                connectionStatus === 'connected' ? 'bg-success-500' :
                connectionStatus === 'connecting' ? 'bg-warning-500' :
                'bg-danger-500'
              )} />
              <span>
                {connectionStatus === 'connected' ? 'Terhubung' :
                 connectionStatus === 'connecting' ? 'Menghubungkan...' :
                 'Terputus'}
              </span>
            </div>
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Update terakhir: {formatTime(lastUpdate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="max-h-96 overflow-y-auto">
        {records.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada data kehadiran real-time</p>
            <p className="text-sm text-gray-400 mt-1">
              Data akan muncul secara otomatis ketika ada aktivitas fingerprint
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {records.map((record) => (
              <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(record.status)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          Karyawan #{record.karyawan_id}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getVerifyMethodIcon(record.verify_method)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <ComputerDesktopIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {record.device_id}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(record.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      record.type === 'masuk' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    )}>
                      {record.type === 'masuk' ? 'Masuk' : 'Keluar'}
                    </span>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(record.status)
                    )}>
                      {getStatusText(record.status)}
                    </span>
                    <span className="text-sm font-mono text-gray-900">
                      {formatTime(record.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeAttendance;
