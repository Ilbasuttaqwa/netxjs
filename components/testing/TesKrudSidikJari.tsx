import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, CheckCircle, XCircle, Play, RotateCcw } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface TestResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface TestSummary {
  total_tests: number;
  passed: number;
  failed: number;
}

interface TestResponse {
  success: boolean;
  message: string;
  data?: {
    test_results: TestResult[];
    summary: TestSummary;
  };
  error?: string;
}

interface TestFormData {
  device_id: string;
  user_id: string;
  timestamp: string;
  verify_type: number;
  in_out_mode: number;
  work_code: number;
}

const FingerprintTestCrud: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [activeTab, setActiveTab] = useState('create');
  
  const [formData, setFormData] = useState<TestFormData>({
    device_id: 'TEST_DEVICE_001',
    user_id: '999',
    timestamp: new Date().toISOString(),
    verify_type: 1,
    in_out_mode: 0,
    work_code: 0
  });

  const [readParams, setReadParams] = useState({
    page: 1,
    limit: 5
  });

  const handleInputChange = (field: keyof TestFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const executeTest = async (method: string, endpoint: string, data?: any) => {
    setLoading(true);
    setTestResults([]);
    setTestSummary(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login terlebih dahulu.');
      }

      const url = new URL(`/api/fingerprint/test-crud`, window.location.origin);
      if (method === 'GET' && data) {
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            url.searchParams.append(key, data[key].toString());
          }
        });
      }

      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: method !== 'GET' ? JSON.stringify(data) : undefined
      });

      const result: TestResponse = await response.json();

      if (result.success && result.data) {
        setTestResults(result.data.test_results);
        setTestSummary(result.data.summary);
        
        toast({
          title: "Test Berhasil",
          description: `${result.message} - ${result.data.summary.passed}/${result.data.summary.total_tests} test berhasil`,
          variant: "default"
        });
      } else {
        throw new Error(result.error || result.message || 'Test gagal');
      }
    } catch (error: any) {
      console.error('Test error:', error);
      toast({
        title: "Test Gagal",
        description: error.message || 'Terjadi kesalahan saat menjalankan test',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runCreateTest = () => {
    executeTest('POST', '/api/fingerprint/test-crud', formData);
  };

  const runReadTest = () => {
    executeTest('GET', '/api/fingerprint/test-crud', readParams);
  };

  const runUpdateTest = () => {
    executeTest('PUT', '/api/fingerprint/test-crud');
  };

  const runDeleteTest = () => {
    executeTest('DELETE', '/api/fingerprint/test-crud');
  };

  const resetForm = () => {
    setFormData({
      device_id: 'TEST_DEVICE_001',
      user_id: '999',
      timestamp: new Date().toISOString(),
      verify_type: 1,
      in_out_mode: 0,
      work_code: 0
    });
    setTestResults([]);
    setTestSummary(null);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? 'PASS' : 'FAIL'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Antarmuka Pengujian CRUD Sidik Jari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="create">Tes CREATE</TabsTrigger>
              <TabsTrigger value="read">Tes READ</TabsTrigger>
              <TabsTrigger value="update">Tes UPDATE</TabsTrigger>
              <TabsTrigger value="delete">Tes DELETE</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device_id">Device ID</Label>
                  <Input
                    id="device_id"
                    value={formData.device_id}
                    onChange={(e) => handleInputChange('device_id', e.target.value)}
                    placeholder="TEST_DEVICE_001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_id">User ID</Label>
                  <Input
                    id="user_id"
                    value={formData.user_id}
                    onChange={(e) => handleInputChange('user_id', e.target.value)}
                    placeholder="999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timestamp">Timestamp</Label>
                  <Input
                    id="timestamp"
                    type="datetime-local"
                    value={formData.timestamp.slice(0, 16)}
                    onChange={(e) => handleInputChange('timestamp', new Date(e.target.value).toISOString())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verify_type">Jenis Verifikasi</Label>
                  <Select
                    value={formData.verify_type.toString()}
                    onValueChange={(value) => handleInputChange('verify_type', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Sidik Jari (1)</SelectItem>
                      <SelectItem value="15">Wajah (15)</SelectItem>
                      <SelectItem value="2">Kartu (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in_out_mode">Mode Masuk/Keluar</Label>
                  <Select
                    value={formData.in_out_mode.toString()}
                    onValueChange={(value) => handleInputChange('in_out_mode', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Masuk (0)</SelectItem>
                      <SelectItem value="1">Keluar (1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_code">Kode Kerja</Label>
                  <Input
                    id="work_code"
                    type="number"
                    value={formData.work_code}
                    onChange={(e) => handleInputChange('work_code', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={runCreateTest} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Jalankan Tes CREATE
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Formulir
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="read" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page">Page</Label>
                  <Input
                    id="page"
                    type="number"
                    value={readParams.page}
                    onChange={(e) => setReadParams(prev => ({ ...prev, page: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={readParams.limit}
                    onChange={(e) => setReadParams(prev => ({ ...prev, limit: parseInt(e.target.value) || 5 }))}
                    min="1"
                    max="50"
                  />
                </div>
              </div>
              <Button onClick={runReadTest} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Jalankan Tes READ
              </Button>
            </TabsContent>

            <TabsContent value="update" className="space-y-4">
              <Alert>
                <AlertDescription>
                  UPDATE test akan mencari record test yang ada dan melakukan update pada status processing dan verification type.
                </AlertDescription>
              </Alert>
              <Button onClick={runUpdateTest} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Jalankan Tes UPDATE
              </Button>
            </TabsContent>

            <TabsContent value="delete" className="space-y-4">
              <Alert>
                <AlertDescription>
                  DELETE test akan menghapus record test yang telah dibuat. Pastikan sudah menjalankan CREATE dan UPDATE test terlebih dahulu.
                </AlertDescription>
              </Alert>
              <Button onClick={runDeleteTest} disabled={loading} variant="destructive">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Jalankan Tes DELETE
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Tes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{testSummary.total_tests}</div>
                <div className="text-sm text-gray-500">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{testSummary.passed}</div>
                <div className="text-sm text-gray-500">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{testSummary.failed}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
            
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.success)}
                    <div>
                      <div className="font-medium">{result.operation}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(result.success)}
                    {result.error && (
                      <div className="text-sm text-red-600 max-w-xs truncate" title={result.error}>
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FingerprintTestCrud;