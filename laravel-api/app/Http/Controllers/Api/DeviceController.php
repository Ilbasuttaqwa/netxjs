<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FingerprintDevice;
use App\Services\FingerprintDeviceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class DeviceController extends Controller
{
    protected $deviceService;

    public function __construct(FingerprintDeviceService $deviceService)
    {
        $this->deviceService = $deviceService;
    }

    /**
     * Get all devices
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = FingerprintDevice::with(['branch']);

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by branch
            if ($request->has('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter active only
            if ($request->boolean('active_only')) {
                $query->active();
            }

            $devices = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $devices
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch devices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store new device
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'device_id' => 'required|string|unique:fingerprint_devices',
                'name' => 'required|string|max:255',
                'ip_address' => 'required|ip',
                'port' => 'integer|min:1|max:65535',
                'username' => 'nullable|string',
                'password' => 'nullable|string',
                'branch_id' => 'nullable|exists:branches,id',
                'location' => 'nullable|string|max:255'
            ]);

            $device = FingerprintDevice::create($validated);

            // Test connection
            $connectionTest = $this->deviceService->testConnection($device->device_id);
            if ($connectionTest['success']) {
                $device->update(['status' => 'online']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Device created successfully',
                'data' => $device->load('branch'),
                'connection_test' => $connectionTest
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create device',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show specific device
     */
    public function show(FingerprintDevice $device): JsonResponse
    {
        try {
            $device->load(['branch', 'attendances' => function($query) {
                $query->latest()->limit(10);
            }]);

            return response()->json([
                'success' => true,
                'data' => $device
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch device',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update device
     */
    public function update(Request $request, FingerprintDevice $device): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'string|max:255',
                'ip_address' => 'ip',
                'port' => 'integer|min:1|max:65535',
                'username' => 'nullable|string',
                'password' => 'nullable|string',
                'branch_id' => 'nullable|exists:branches,id',
                'location' => 'nullable|string|max:255',
                'is_active' => 'boolean'
            ]);

            $device->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Device updated successfully',
                'data' => $device->load('branch')
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update device',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete device
     */
    public function destroy(FingerprintDevice $device): JsonResponse
    {
        try {
            $device->delete();

            return response()->json([
                'success' => true,
                'message' => 'Device deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete device',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync device data
     */
    public function sync(FingerprintDevice $device): JsonResponse
    {
        try {
            $result = $this->deviceService->syncDevice($device->device_id);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result['data'] ?? null
            ], $result['success'] ? 200 : 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sync failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test device connection
     */
    public function testConnection(FingerprintDevice $device): JsonResponse
    {
        try {
            $result = $this->deviceService->testConnection($device->device_id);

            // Update device status based on test result
            $device->update([
                'status' => $result['success'] ? 'online' : 'offline',
                'last_ping_at' => now()
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Connection test failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get device attendances
     */
    public function getAttendances(Request $request, FingerprintDevice $device): JsonResponse
    {
        try {
            $query = $device->attendances()->with(['employee']);

            // Filter by date range
            if ($request->has('start_date')) {
                $query->whereDate('attendance_time', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->whereDate('attendance_time', '<=', $request->end_date);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $attendances = $query->latest('attendance_time')
                ->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $attendances
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendances',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}