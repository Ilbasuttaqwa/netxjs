import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { 
  TestTube, 
  Database, 
  Wifi, 
  Shield, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import FingerprintTestCrud from '../../components/testing/FingerprintTestCrud';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';

interface SystemStatus {
  database: boolean;
  api: boolean;
  fingerprint_service: boolean;
  realtime_connection: boolean;
}

interface TestEnvironment {
  status: 'ready' | 'not_ready' | 'checking';
  issues: string[];
  last_check: string;
}

const FingerprintTestingPage: NextPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('environment');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: false,
    api: false,
    fingerprint_service: false,
    realtime_connection: false
  });
  const [testEnvironment, setTestEnvironment] = useState<TestEnvironment>({
    status: 'checking',
    issues: [],
    last_check: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/dasbor');
      return;
    }

    checkSystemStatus();
  }, [isAuthenticated, user, router]);

  const checkSystemStatus = async () => {
    setLoading(true);
    const issues: string[] = [];
    const status: SystemStatus = {
      database: false,
      api: false,
      fingerprint_service: false,
      realtime_connection: false
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        issues.push('Token autentikasi tidak ditemukan');
        setTestEnvironment({
          status: 'not_ready',
          issues,
          last_check: new Date().toISOString()
        });
        return;
      }

      // Check Database Connection (using test-db endpoint)
      try {
        const dbResponse = await fetch('/api/test-db', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        status.database = dbResponse.ok;
        if (!dbResponse.ok) {
          issues.push('Koneksi database gagal');
        }
      } catch (error) {
        issues.push('Tidak dapat mengakses endpoint database');
      }

      // API service check removed - focusing on fingerprint integration

      // Check Fingerprint Service
      try {
        const fingerprintResponse = await fetch('/api/fingerprint/health', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        status.fingerprint_service = fingerprintResponse.ok;
        if (!fingerprintResponse.ok) {
          issues.push('Fingerprint service tidak aktif');
        }
      } catch (error) {
        issues.push('Fingerprint service tidak dapat diakses');
      }

      // Check Realtime Connection
      try {
        const realtimeResponse = await fetch('/api/fingerprint/realtime', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        status.realtime_connection = realtimeResponse.ok;
        if (!realtimeResponse.ok) {
          issues.push('Realtime connection tidak tersedia');
        }
      } catch (error) {
        issues.push('Tidak dapat mengakses realtime endpoint');
      }

      setSystemStatus(status);
      setTestEnvironment({
        status: issues.length === 0 ? 'ready' : 'not_ready',
        issues,
        last_check: new Date().toISOString()
      });

      if (issues.length === 0) {
        toast({
          title: "Sistem Siap",
          description: "Semua komponen sistem berfungsi dengan baik",
          variant: "default"
        });
      } else {
        toast({
          title: "Sistem Tidak Siap",
          description: `Ditemukan ${issues.length} masalah pada sistem`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('System check error:', error);
      issues.push('Terjadi kesalahan saat memeriksa sistem');
      setTestEnvironment({
        status: 'not_ready',
        issues,
        last_check: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? 'ONLINE' : 'OFFLINE'}
      </Badge>
    );
  };

  const getEnvironmentStatusIcon = () => {
    switch (testEnvironment.status) {
      case 'ready':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'not_ready':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Fingerprint Testing - AFMS</title>
        <meta name="description" content="Fingerprint system testing interface" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Fingerprint System Testing</h1>
          <p className="text-gray-600">
            Interface untuk testing dan validasi sistem fingerprint AFMS
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="crud" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              CRUD Testing
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Integration
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="environment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getEnvironmentStatusIcon()}
                  Test Environment Status
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkSystemStatus}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5" />
                      <span>Database Connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.database)}
                      {getStatusBadge(systemStatus.database)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wifi className="h-5 w-5" />
                      <span>API Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.api)}
                      {getStatusBadge(systemStatus.api)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <TestTube className="h-5 w-5" />
                      <span>Fingerprint Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.fingerprint_service)}
                      {getStatusBadge(systemStatus.fingerprint_service)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5" />
                      <span>Realtime Connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.realtime_connection)}
                      {getStatusBadge(systemStatus.realtime_connection)}
                    </div>
                  </div>
                </div>

                {testEnvironment.issues.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Issues Found:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {testEnvironment.issues.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-gray-500 mt-4">
                  Last checked: {testEnvironment.last_check ? new Date(testEnvironment.last_check).toLocaleString() : 'Never'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crud" className="space-y-6">
            {testEnvironment.status === 'ready' ? (
              <FingerprintTestCrud />
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Test environment belum siap. Silakan periksa status environment terlebih dahulu.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Integration testing akan segera tersedia. Fitur ini akan menguji integrasi dengan sistem attendance, payroll, dan monitoring.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Security testing akan segera tersedia. Fitur ini akan menguji enkripsi data fingerprint dan log aktivitas keamanan.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default FingerprintTestingPage;