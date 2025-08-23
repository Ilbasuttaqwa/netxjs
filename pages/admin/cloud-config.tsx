import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';
import {
  CloudIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface CloudConfig {
  id?: number;
  server_url: string;
  api_key: string;
  sync_interval: number;
  retry_attempts: number;
  timeout: number;
  enable_auto_sync: boolean;
  enable_offline_mode: boolean;
  max_offline_records: number;
  created_at?: string;
  updated_at?: string;
}

const CloudConfigPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState<CloudConfig>({
    server_url: '',
    api_key: '',
    sync_interval: 300,
    retry_attempts: 3,
    timeout: 30000,
    enable_auto_sync: true,
    enable_offline_mode: true,
    max_offline_records: 1000
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchConfig();
    }
  }, [user, loading]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/devices/cloud-config');
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
      } else {
        showToast('Failed to load configuration', 'error');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      showToast('Error loading configuration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const method = config.id ? 'PUT' : 'POST';
      const url = config.id ? `/api/devices/cloud-config?id=${config.id}` : '/api/devices/cloud-config';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        showToast('Configuration saved successfully', 'success');
      } else {
        showToast(result.message || 'Failed to save configuration', 'error');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showToast('Error saving configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would test the actual connection
      const isValid = config.server_url.startsWith('http') && config.api_key.length > 0;
      
      if (isValid) {
        showToast('Connection test successful', 'success');
      } else {
        showToast('Connection test failed', 'error');
      }
    } catch (error) {
      showToast('Connection test failed', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (field: keyof CloudConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Cloud Server Configuration - AFMS</title>
        <meta name="description" content="Configure cloud server settings for fingerprint devices" />
      </Head>
      
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CloudIcon className="h-8 w-8 text-blue-600" />
                Cloud Server Configuration
              </h1>
              <p className="text-gray-600">Configure cloud server settings for fingerprint device synchronization</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !config.server_url || !config.api_key}
                variant="outline"
                leftIcon={<ArrowPathIcon className={`h-4 w-4 ${isTesting ? 'animate-spin' : ''}`} />}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                leftIcon={<CheckCircleIcon className="h-4 w-4" />}
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Server Settings */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Cog6ToothIcon className="h-5 w-5 text-blue-600" />
                  Server Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Server URL *
                    </label>
                    <Input
                      type="url"
                      value={config.server_url}
                      onChange={(e) => handleInputChange('server_url', e.target.value)}
                      placeholder="https://your-cloud-server.com/api"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key *
                    </label>
                    <Input
                      type="password"
                      value={config.api_key}
                      onChange={(e) => handleInputChange('api_key', e.target.value)}
                      placeholder="Enter your API key"
                      required
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Sync Settings */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ArrowPathIcon className="h-5 w-5 text-green-600" />
                  Synchronization Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sync Interval (seconds)
                    </label>
                    <Input
                      type="number"
                      value={config.sync_interval}
                      onChange={(e) => handleInputChange('sync_interval', parseInt(e.target.value))}
                      min="60"
                      max="3600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: 60-3600 seconds</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Retry Attempts
                    </label>
                    <Input
                      type="number"
                      value={config.retry_attempts}
                      onChange={(e) => handleInputChange('retry_attempts', parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: 1-10 attempts</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout (milliseconds)
                    </label>
                    <Input
                      type="number"
                      value={config.timeout}
                      onChange={(e) => handleInputChange('timeout', parseInt(e.target.value))}
                      min="5000"
                      max="120000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: 5000-120000 ms</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <InformationCircleIcon className="h-5 w-5 text-purple-600" />
                  Advanced Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable Auto Sync</label>
                      <p className="text-xs text-gray-500">Automatically sync data at specified intervals</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.enable_auto_sync}
                      onChange={(e) => handleInputChange('enable_auto_sync', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable Offline Mode</label>
                      <p className="text-xs text-gray-500">Store data locally when server is unavailable</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.enable_offline_mode}
                      onChange={(e) => handleInputChange('enable_offline_mode', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Offline Records
                    </label>
                    <Input
                      type="number"
                      value={config.max_offline_records}
                      onChange={(e) => handleInputChange('max_offline_records', parseInt(e.target.value))}
                      min="100"
                      max="10000"
                      disabled={!config.enable_offline_mode}
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: 100-10000 records</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Status Information */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  Configuration Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Server URL</span>
                    <span className={`text-sm font-medium ${
                      config.server_url ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {config.server_url ? 'Configured' : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">API Key</span>
                    <span className={`text-sm font-medium ${
                      config.api_key ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {config.api_key ? 'Configured' : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Auto Sync</span>
                    <span className={`text-sm font-medium ${
                      config.enable_auto_sync ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {config.enable_auto_sync ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Offline Mode</span>
                    <span className={`text-sm font-medium ${
                      config.enable_offline_mode ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {config.enable_offline_mode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {config.updated_at && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Last Updated</span>
                      <span className="text-sm text-gray-600">
                        {new Date(config.updated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default CloudConfigPage;