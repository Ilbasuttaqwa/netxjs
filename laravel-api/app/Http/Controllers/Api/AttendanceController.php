<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FingerprintAttendance;
use App\Services\AttendanceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    protected $attendanceService;

    public function __construct(AttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
    }

    /**
     * Get all attendances
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = FingerprintAttendance::with(['device', 'employee']);

            // Filter by date range
            if ($request->has('start_date')) {
                $query->whereDate('attendance_time', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->whereDate('attendance_time', '<=', $request->end_date);
            }

            // Filter by employee
            if ($request->has('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            // Filter by device
            if ($request->has('device_id')) {
                $query->where('device_id', $request->device_id);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by attendance type
            if ($request->has('attendance_type')) {
                $query->where('attendance_type', $request->attendance_type);
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

    /**
     * Show specific attendance
     */
    public function show(FingerprintAttendance $attendance): JsonResponse
    {
        try {
            $attendance->load(['device', 'employee']);

            return response()->json([
                'success' => true,
                'data' => $attendance
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update attendance
     */
    public function update(Request $request, FingerprintAttendance $attendance): JsonResponse
    {
        try {
            $validated = $request->validate([
                'attendance_time' => 'date',
                'attendance_type' => 'integer|in:0,1',
                'verification_type' => 'integer|in:1,2,3',
                'work_code' => 'nullable|string',
                'notes' => 'nullable|string',
                'status' => 'string|in:pending,processed,failed'
            ]);

            $attendance->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Attendance updated successfully',
                'data' => $attendance->load(['device', 'employee'])
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
                'message' => 'Failed to update attendance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete attendance
     */
    public function destroy(FingerprintAttendance $attendance): JsonResponse
    {
        try {
            $attendance->delete();

            return response()->json([
                'success' => true,
                'message' => 'Attendance deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete attendance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk process attendances
     */
    public function bulkProcess(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'attendance_ids' => 'required|array',
                'attendance_ids.*' => 'exists:fingerprint_attendances,id',
                'action' => 'required|string|in:process,mark_processed,mark_failed'
            ]);

            $attendances = FingerprintAttendance::whereIn('id', $validated['attendance_ids'])->get();
            $results = [];

            foreach ($attendances as $attendance) {
                try {
                    switch ($validated['action']) {
                        case 'process':
                            $result = $this->attendanceService->processAttendance($attendance->toArray());
                            $attendance->markAsProcessed();
                            break;
                        case 'mark_processed':
                            $attendance->markAsProcessed();
                            $result = ['success' => true, 'message' => 'Marked as processed'];
                            break;
                        case 'mark_failed':
                            $attendance->markAsFailed();
                            $result = ['success' => true, 'message' => 'Marked as failed'];
                            break;
                    }
                    $results[] = ['id' => $attendance->id, 'result' => $result];
                } catch (\Exception $e) {
                    $results[] = ['id' => $attendance->id, 'error' => $e->getMessage()];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Bulk processing completed',
                'results' => $results
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
                'message' => 'Bulk processing failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get daily attendance stats
     */
    public function getDailyStats(Request $request): JsonResponse
    {
        try {
            $date = $request->get('date', today()->toDateString());
            $stats = $this->attendanceService->getAttendanceStats($date, $date);

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch daily stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get monthly attendance stats
     */
    public function getMonthlyStats(Request $request): JsonResponse
    {
        try {
            $month = $request->get('month', now()->month);
            $year = $request->get('year', now()->year);
            
            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
            
            $stats = $this->attendanceService->getAttendanceStats(
                $startDate->toDateString(),
                $endDate->toDateString()
            );

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch monthly stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}