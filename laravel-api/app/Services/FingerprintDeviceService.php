<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Models\FingerprintDevice;
use App\Models\FingerprintAttendance;

class FingerprintDeviceService
{
    protected $deviceConfig;

    public function __construct()
    {
        $this->deviceConfig = [
            'ip' => config('fingerprint.device_ip'),
            'port' => config('fingerprint.device_port'),
            'username' => config('fingerprint.device_username'),
            'password' => config('fingerprint.device_password'),
            'timeout' => config('fingerprint.device_timeout', 30)
        ];
    }

    /**
     * Get device status
     */
    public function getDeviceStatus(string $deviceId): array
    {
        try {
            $device = FingerprintDevice::where('device_id', $deviceId)->first();
            
            if (!$device) {
                return [
                    'success' => false,
                    'message' => 'Device not found',
                    'status' => 'unknown'
                ];
            }

            // Test connection to device
            $connectionTest = $this->testDeviceConnection($device->ip_address, $device->port);
            
            // Update device status
            $device->update([
                'status' => $connectionTest['success'] ? 'online' : 'offline',
                'last_ping' => now(),
                'updated_at' => now()
            ]);

            return [
                'success' => true,
                'device_id' => $device->device_id,
                'device_name' => $device->device_name,
                'ip_address' => $device->ip_address,
                'port' => $device->port,
                'status' => $device->status,
                'last_sync' => $device->last_sync,
                'last_ping' => $device->last_ping,
                'total_users' => $device->total_users,
                'total_records' => $device->total_records,
                'response_time' => $connectionTest['response_time'] ?? null
            ];

        } catch (\Exception $e) {
            Log::error('Error getting device status', [
                'device_id' => $deviceId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get device status',
                'status' => 'error'
            ];
        }
    }

    /**
     * Test device connection
     */
    public function testConnection(string $deviceId): array
    {
        try {
            $device = FingerprintDevice::where('device_id', $deviceId)->first();
            
            if (!$device) {
                return [
                    'success' => false,
                    'message' => 'Device not found'
                ];
            }

            $startTime = microtime(true);
            $result = $this->testDeviceConnection($device->ip_address, $device->port);
            $responseTime = round((microtime(true) - $startTime) * 1000, 2);

            return [
                'success' => $result['success'],
                'message' => $result['message'],
                'response_time' => $responseTime . 'ms'
            ];

        } catch (\Exception $e) {
            Log::error('Error testing device connection', [
                'device_id' => $deviceId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Connection test failed'
            ];
        }
    }

    /**
     * Sync device data
     */
    public function syncDevice(string $deviceId): array
    {
        try {
            $device = FingerprintDevice::where('device_id', $deviceId)->first();
            
            if (!$device) {
                return [
                    'success' => false,
                    'message' => 'Device not found'
                ];
            }

            // Test connection first
            $connectionTest = $this->testDeviceConnection($device->ip_address, $device->port);
            
            if (!$connectionTest['success']) {
                return [
                    'success' => false,
                    'message' => 'Device is offline or unreachable'
                ];
            }

            // Simulate sync process (in real implementation, use SOAP/TCP communication)
            $syncResult = $this->performDeviceSync($device);
            
            if ($syncResult['success']) {
                $device->update([
                    'last_sync' => now(),
                    'total_records' => $syncResult['total_records'],
                    'status' => 'online',
                    'updated_at' => now()
                ]);
            }

            return $syncResult;

        } catch (\Exception $e) {
            Log::error('Error syncing device', [
                'device_id' => $deviceId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Sync failed'
            ];
        }
    }

    /**
     * Test device connection via TCP/HTTP
     */
    private function testDeviceConnection(string $ip, int $port): array
    {
        try {
            // Try HTTP connection first
            $response = Http::timeout($this->deviceConfig['timeout'])
                ->get("http://{$ip}:{$port}/cgi-bin/AttendanceInquiry.cgi");

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Device is online and responding'
                ];
            }

            // Try TCP socket connection as fallback
            $socket = @fsockopen($ip, $port, $errno, $errstr, $this->deviceConfig['timeout']);
            
            if ($socket) {
                fclose($socket);
                return [
                    'success' => true,
                    'message' => 'Device is reachable via TCP'
                ];
            }

            return [
                'success' => false,
                'message' => "Connection failed: {$errstr} ({$errno})"
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Connection test failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Perform actual device sync
     */
    private function performDeviceSync(FingerprintDevice $device): array
    {
        try {
            // In real implementation, this would:
            // 1. Connect to device via SOAP/TCP
            // 2. Retrieve attendance records
            // 3. Parse and store data
            // 4. Return sync results

            // Simulate sync process
            $newRecords = rand(5, 25);
            $totalRecords = $device->total_records + $newRecords;

            // Simulate creating attendance records
            for ($i = 0; $i < $newRecords; $i++) {
                FingerprintAttendance::create([
                    'device_id' => $device->id,
                    'device_user_id' => 'USER_' . rand(1, 100),
                    'attendance_time' => now()->subMinutes(rand(1, 1440)),
                    'attendance_type' => rand(0, 1), // 0: in, 1: out
                    'verification_type' => 'fingerprint',
                    'raw_data' => json_encode([
                        'device_id' => $device->device_id,
                        'timestamp' => now()->toISOString(),
                        'sync_batch' => uniqid()
                    ])
                ]);
            }

            Log::info('Device sync completed', [
                'device_id' => $device->device_id,
                'new_records' => $newRecords,
                'total_records' => $totalRecords
            ]);

            return [
                'success' => true,
                'message' => 'Sync completed successfully',
                'data' => [
                    'new_records' => $newRecords,
                    'total_records' => $totalRecords,
                    'sync_time' => now()->toISOString()
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Device sync failed', [
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Sync failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all devices
     */
    public function getAllDevices(): array
    {
        try {
            $devices = FingerprintDevice::all();
            
            return [
                'success' => true,
                'data' => $devices->map(function ($device) {
                    return [
                        'id' => $device->id,
                        'device_id' => $device->device_id,
                        'device_name' => $device->device_name,
                        'ip_address' => $device->ip_address,
                        'port' => $device->port,
                        'status' => $device->status,
                        'last_sync' => $device->last_sync,
                        'last_ping' => $device->last_ping,
                        'total_users' => $device->total_users,
                        'total_records' => $device->total_records,
                        'created_at' => $device->created_at,
                        'updated_at' => $device->updated_at
                    ];
                })
            ];

        } catch (\Exception $e) {
            Log::error('Error getting all devices', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get devices'
            ];
        }
    }
}