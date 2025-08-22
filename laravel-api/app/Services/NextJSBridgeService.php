<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class NextJSBridgeService
{
    protected $baseUrl;
    protected $apiToken;
    protected $timeout;

    public function __construct()
    {
        $this->baseUrl = config('fingerprint.nextjs_integration.api_url');
        $this->apiToken = config('fingerprint.nextjs_integration.api_token');
        $this->timeout = 30;
    }

    /**
     * Forward attendance data to NextJS API
     */
    public function forwardAttendance(array $attendanceData): array
    {
        try {
            $endpoint = $this->baseUrl . config('fingerprint.nextjs_integration.endpoints.attendance');
            
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-Token' => $this->apiToken,
                    'User-Agent' => 'Laravel-Fingerprint-Bridge/1.0'
                ])
                ->post($endpoint, [
                    'deviceId' => $attendanceData['device_id'] ?? null,
                    'userId' => $attendanceData['device_user_id'] ?? null,
                    'timestamp' => $attendanceData['attendance_time'] ?? null,
                    'type' => $attendanceData['attendance_type'] ?? 0,
                    'verificationType' => $attendanceData['verification_type'] ?? 1,
                    'workCode' => $attendanceData['work_code'] ?? null,
                    'rawData' => $attendanceData['raw_data'] ?? null,
                    'source' => 'laravel-bridge'
                ]);

            if ($response->successful()) {
                Log::info('Attendance forwarded to NextJS successfully', [
                    'attendance_id' => $attendanceData['id'] ?? null,
                    'device_user_id' => $attendanceData['device_user_id'] ?? null
                ]);

                return [
                    'success' => true,
                    'message' => 'Attendance forwarded successfully',
                    'data' => $response->json()
                ];
            } else {
                Log::error('Failed to forward attendance to NextJS', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'attendance_data' => $attendanceData
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to forward attendance',
                    'error' => $response->body()
                ];
            }
        } catch (Exception $e) {
            Log::error('Exception while forwarding attendance to NextJS', [
                'error' => $e->getMessage(),
                'attendance_data' => $attendanceData
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while forwarding attendance',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get sync status from NextJS
     */
    public function getSyncStatus(): array
    {
        try {
            $endpoint = $this->baseUrl . '/monitoring/sync-status';
            
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-API-Token' => $this->apiToken,
                    'User-Agent' => 'Laravel-Fingerprint-Bridge/1.0'
                ])
                ->get($endpoint);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to get sync status',
                    'error' => $response->body()
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception occurred while getting sync status',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Notify NextJS about device status change
     */
    public function notifyDeviceStatus(string $deviceId, string $status, array $additionalData = []): array
    {
        try {
            $endpoint = $this->baseUrl . '/monitoring/device-status';
            
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-Token' => $this->apiToken,
                    'User-Agent' => 'Laravel-Fingerprint-Bridge/1.0'
                ])
                ->post($endpoint, array_merge([
                    'deviceId' => $deviceId,
                    'status' => $status,
                    'timestamp' => now()->toISOString(),
                    'source' => 'laravel-bridge'
                ], $additionalData));

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Device status notification sent successfully',
                    'data' => $response->json()
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to notify device status',
                    'error' => $response->body()
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception occurred while notifying device status',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Test connection to NextJS API
     */
    public function testConnection(): array
    {
        try {
            $endpoint = $this->baseUrl . '/health';
            
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-API-Token' => $this->apiToken,
                    'User-Agent' => 'Laravel-Fingerprint-Bridge/1.0'
                ])
                ->get($endpoint);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Connection to NextJS API successful',
                    'response_time' => $response->handlerStats()['total_time'] ?? null
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Connection to NextJS API failed',
                    'status' => $response->status(),
                    'error' => $response->body()
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception occurred while testing connection',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send bulk attendance data to NextJS
     */
    public function forwardBulkAttendance(array $attendanceDataArray): array
    {
        try {
            $endpoint = $this->baseUrl . '/fingerprint/bulk-attendance';
            
            $formattedData = array_map(function($attendance) {
                return [
                    'deviceId' => $attendance['device_id'] ?? null,
                    'userId' => $attendance['device_user_id'] ?? null,
                    'timestamp' => $attendance['attendance_time'] ?? null,
                    'type' => $attendance['attendance_type'] ?? 0,
                    'verificationType' => $attendance['verification_type'] ?? 1,
                    'workCode' => $attendance['work_code'] ?? null,
                    'rawData' => $attendance['raw_data'] ?? null
                ];
            }, $attendanceDataArray);

            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-Token' => $this->apiToken,
                    'User-Agent' => 'Laravel-Fingerprint-Bridge/1.0'
                ])
                ->post($endpoint, [
                    'attendances' => $formattedData,
                    'source' => 'laravel-bridge',
                    'batch_id' => uniqid('batch_')
                ]);

            if ($response->successful()) {
                Log::info('Bulk attendance forwarded to NextJS successfully', [
                    'count' => count($attendanceDataArray)
                ]);

                return [
                    'success' => true,
                    'message' => 'Bulk attendance forwarded successfully',
                    'data' => $response->json()
                ];
            } else {
                Log::error('Failed to forward bulk attendance to NextJS', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'count' => count($attendanceDataArray)
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to forward bulk attendance',
                    'error' => $response->body()
                ];
            }
        } catch (Exception $e) {
            Log::error('Exception while forwarding bulk attendance to NextJS', [
                'error' => $e->getMessage(),
                'count' => count($attendanceDataArray)
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while forwarding bulk attendance',
                'error' => $e->getMessage()
            ];
        }
    }
}