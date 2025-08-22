<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\FingerprintAttendance;
use App\Models\Employee;
use App\Models\AttendanceRule;
use Carbon\Carbon;

class AttendanceService
{
    /**
     * Process attendance data from fingerprint device
     */
    public function processAttendance(array $attendanceData): array
    {
        try {
            DB::beginTransaction();

            // Validate and normalize data
            $normalizedData = $this->normalizeAttendanceData($attendanceData);
            
            // Check for duplicates
            if ($this->isDuplicateAttendance($normalizedData)) {
                DB::rollBack();
                return [
                    'success' => false,
                    'message' => 'Duplicate attendance record detected'
                ];
            }

            // Find employee
            $employee = $this->findEmployee($normalizedData['user_id']);
            if (!$employee) {
                Log::warning('Employee not found for attendance', [
                    'user_id' => $normalizedData['user_id'],
                    'device_id' => $normalizedData['device_id']
                ]);
            }

            // Create attendance record
            $attendance = FingerprintAttendance::create([
                'device_id' => $normalizedData['device_id'],
                'device_user_id' => $normalizedData['user_id'],
                'employee_id' => $employee ? $employee->id : null,
                'attendance_time' => $normalizedData['timestamp'],
                'attendance_type' => $normalizedData['in_out_mode'],
                'verification_type' => $this->getVerificationType($normalizedData['verify_type']),
                'work_code' => $normalizedData['work_code'] ?? 1,
                'raw_data' => json_encode($attendanceData),
                'processed_at' => now()
            ]);

            // Process attendance rules if employee found
            if ($employee) {
                $this->processAttendanceRules($attendance, $employee);
            }

            // Log successful processing
            Log::info('Attendance processed successfully', [
                'attendance_id' => $attendance->id,
                'employee_id' => $employee ? $employee->id : null,
                'device_id' => $normalizedData['device_id'],
                'timestamp' => $normalizedData['timestamp']
            ]);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Attendance processed successfully',
                'data' => [
                    'attendance_id' => $attendance->id,
                    'employee_id' => $employee ? $employee->id : null,
                    'employee_name' => $employee ? $employee->name : null,
                    'timestamp' => $attendance->attendance_time,
                    'type' => $attendance->attendance_type == 0 ? 'check_in' : 'check_out',
                    'verification' => $attendance->verification_type
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error processing attendance', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $attendanceData
            ]);

            return [
                'success' => false,
                'message' => 'Failed to process attendance: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Normalize attendance data
     */
    private function normalizeAttendanceData(array $data): array
    {
        return [
            'device_id' => $data['device_id'],
            'user_id' => $data['user_id'],
            'timestamp' => Carbon::parse($data['timestamp']),
            'verify_type' => (int) $data['verify_type'],
            'in_out_mode' => (int) $data['in_out_mode'],
            'work_code' => isset($data['work_code']) ? (int) $data['work_code'] : 1
        ];
    }

    /**
     * Check for duplicate attendance
     */
    private function isDuplicateAttendance(array $data): bool
    {
        $timeWindow = 5; // 5 minutes window
        $startTime = $data['timestamp']->copy()->subMinutes($timeWindow);
        $endTime = $data['timestamp']->copy()->addMinutes($timeWindow);

        return FingerprintAttendance::where('device_id', $data['device_id'])
            ->where('device_user_id', $data['user_id'])
            ->where('attendance_type', $data['in_out_mode'])
            ->whereBetween('attendance_time', [$startTime, $endTime])
            ->exists();
    }

    /**
     * Find employee by device user ID
     */
    private function findEmployee(string $deviceUserId): ?Employee
    {
        // Try to find by device_user_id first
        $employee = Employee::where('device_user_id', $deviceUserId)->first();
        
        if (!$employee) {
            // Try to find by employee_id if device_user_id matches
            $employee = Employee::where('id', $deviceUserId)->first();
        }

        return $employee;
    }

    /**
     * Get verification type string
     */
    private function getVerificationType(int $verifyType): string
    {
        $types = [
            1 => 'fingerprint',
            15 => 'face',
            2 => 'password',
            3 => 'card',
            4 => 'combination'
        ];

        return $types[$verifyType] ?? 'unknown';
    }

    /**
     * Process attendance rules
     */
    private function processAttendanceRules(FingerprintAttendance $attendance, Employee $employee): void
    {
        try {
            // Get active attendance rules
            $rules = AttendanceRule::where('is_active', true)->get();
            
            foreach ($rules as $rule) {
                $this->applyAttendanceRule($attendance, $employee, $rule);
            }

        } catch (\Exception $e) {
            Log::error('Error processing attendance rules', [
                'attendance_id' => $attendance->id,
                'employee_id' => $employee->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Apply specific attendance rule
     */
    private function applyAttendanceRule(FingerprintAttendance $attendance, Employee $employee, AttendanceRule $rule): void
    {
        // This is where you would implement specific business rules
        // For example:
        // - Late arrival detection
        // - Early departure detection
        // - Overtime calculation
        // - Break time validation
        
        Log::info('Applying attendance rule', [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'attendance_id' => $attendance->id,
            'employee_id' => $employee->id
        ]);
    }

    /**
     * Get attendance statistics
     */
    public function getAttendanceStats(array $filters = []): array
    {
        try {
            $query = FingerprintAttendance::query();

            // Apply filters
            if (isset($filters['date_from'])) {
                $query->where('attendance_time', '>=', $filters['date_from']);
            }

            if (isset($filters['date_to'])) {
                $query->where('attendance_time', '<=', $filters['date_to']);
            }

            if (isset($filters['device_id'])) {
                $query->where('device_id', $filters['device_id']);
            }

            if (isset($filters['employee_id'])) {
                $query->where('employee_id', $filters['employee_id']);
            }

            $stats = [
                'total_records' => $query->count(),
                'check_ins' => $query->clone()->where('attendance_type', 0)->count(),
                'check_outs' => $query->clone()->where('attendance_type', 1)->count(),
                'today_records' => $query->clone()->whereDate('attendance_time', today())->count(),
                'this_week_records' => $query->clone()->whereBetween('attendance_time', [
                    now()->startOfWeek(),
                    now()->endOfWeek()
                ])->count(),
                'verification_types' => $query->clone()
                    ->select('verification_type', DB::raw('count(*) as count'))
                    ->groupBy('verification_type')
                    ->pluck('count', 'verification_type')
                    ->toArray()
            ];

            return [
                'success' => true,
                'data' => $stats
            ];

        } catch (\Exception $e) {
            Log::error('Error getting attendance stats', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get attendance statistics'
            ];
        }
    }

    /**
     * Get recent attendance records
     */
    public function getRecentAttendance(int $limit = 50): array
    {
        try {
            $records = FingerprintAttendance::with('employee')
                ->orderBy('attendance_time', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'device_id' => $record->device_id,
                        'device_user_id' => $record->device_user_id,
                        'employee_name' => $record->employee ? $record->employee->name : 'Unknown',
                        'attendance_time' => $record->attendance_time,
                        'attendance_type' => $record->attendance_type == 0 ? 'check_in' : 'check_out',
                        'verification_type' => $record->verification_type,
                        'processed_at' => $record->processed_at
                    ];
                });

            return [
                'success' => true,
                'data' => $records
            ];

        } catch (\Exception $e) {
            Log::error('Error getting recent attendance', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to get recent attendance'
            ];
        }
    }
}