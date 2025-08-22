<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FingerprintDeviceService;
use App\Services\AttendanceService;
use App\Services\NextJSBridgeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class FingerprintController extends Controller
{
    protected $fingerprintService;
    protected $attendanceService;
    protected $bridgeService;

    public function __construct(
        FingerprintDeviceService $fingerprintService,
        AttendanceService $attendanceService,
        NextJSBridgeService $bridgeService
    ) {
        $this->fingerprintService = $fingerprintService;
        $this->attendanceService = $attendanceService;
        $this->bridgeService = $bridgeService;
    }

    /**
     * Receive attendance data from fingerprint device
     */
    public function receiveAttendance(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'device_id' => 'required|string',
                'user_id' => 'required|string',
                'timestamp' => 'required|date',
                'verify_type' => 'required|integer',
                'in_out_mode' => 'required|integer',
                'work_code' => 'integer',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $attendanceData = $validator->validated();
            
            // Log incoming request
            Log::info('Fingerprint attendance received', $attendanceData);

            // Process attendance data
            $result = $this->attendanceService->processAttendance($attendanceData);

            if ($result['success']) {
                // Forward to NextJS using bridge service
                $bridgeResult = $this->bridgeService->forwardAttendance($attendanceData);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Attendance data processed successfully',
                    'data' => $result['data'],
                    'bridge_status' => $bridgeResult
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message']
            ], 400);

        } catch (\Exception $e) {
            Log::error('Error processing fingerprint attendance', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get device status
     */
    public function getDeviceStatus(Request $request): JsonResponse
    {
        try {
            $deviceId = $request->input('device_id');
            
            if (!$deviceId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Device ID is required'
                ], 422);
            }

            $status = $this->fingerprintService->getDeviceStatus($deviceId);

            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting device status', [
                'error' => $e->getMessage(),
                'device_id' => $request->input('device_id')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get device status'
            ], 500);
        }
    }

    /**
     * Sync device data
     */
    public function syncDevice(Request $request): JsonResponse
    {
        try {
            $deviceId = $request->input('device_id');
            
            if (!$deviceId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Device ID is required'
                ], 422);
            }

            $result = $this->fingerprintService->syncDevice($deviceId);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result['data'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Error syncing device', [
                'error' => $e->getMessage(),
                'device_id' => $request->input('device_id')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync device'
            ], 500);
        }
    }

    /**
     * Test device connection
     */
    public function testConnection(Request $request): JsonResponse
    {
        try {
            $deviceId = $request->input('device_id');
            
            if (!$deviceId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Device ID is required'
                ], 422);
            }

            $result = $this->fingerprintService->testConnection($deviceId);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'response_time' => $result['response_time'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Error testing device connection', [
                'error' => $e->getMessage(),
                'device_id' => $request->input('device_id')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to test device connection'
            ], 500);
        }
    }

    /**
     * Forward attendance data to NextJS (Bridge endpoint)
     */
    public function forwardToNextJS(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'attendance_data' => 'required|array',
                'attendance_data.device_id' => 'required|string',
                'attendance_data.device_user_id' => 'required|string',
                'attendance_data.attendance_time' => 'required|date',
                'attendance_data.attendance_type' => 'required|integer|in:0,1',
                'attendance_data.verification_type' => 'integer|in:1,2,3'
            ]);

            $result = $this->bridgeService->forwardAttendance($validated['attendance_data']);

            return response()->json($result, $result['success'] ? 200 : 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to forward attendance to NextJS',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sync status from NextJS (Bridge endpoint)
     */
    public function getSyncStatus(): JsonResponse
    {
        try {
            $result = $this->bridgeService->getSyncStatus();
            return response()->json($result, $result['success'] ? 200 : 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get sync status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

}