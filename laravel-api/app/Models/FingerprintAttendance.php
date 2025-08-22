<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class FingerprintAttendance extends Model
{
    use HasFactory;

    protected $table = 'fingerprint_attendances';

    protected $fillable = [
        'device_id',
        'device_user_id',
        'employee_id',
        'attendance_time',
        'attendance_type',
        'verification_type',
        'work_code',
        'raw_data',
        'processed_at',
        'sync_status',
        'error_message'
    ];

    protected $casts = [
        'attendance_time' => 'datetime',
        'processed_at' => 'datetime',
        'attendance_type' => 'integer',
        'work_code' => 'integer',
        'raw_data' => 'array'
    ];

    /**
     * Get the device that owns this attendance record
     */
    public function device(): BelongsTo
    {
        return $this->belongsTo(FingerprintDevice::class, 'device_id');
    }

    /**
     * Get the employee that owns this attendance record
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Scope for check-in records
     */
    public function scopeCheckIn($query)
    {
        return $query->where('attendance_type', 0);
    }

    /**
     * Scope for check-out records
     */
    public function scopeCheckOut($query)
    {
        return $query->where('attendance_type', 1);
    }

    /**
     * Scope for today's records
     */
    public function scopeToday($query)
    {
        return $query->whereDate('attendance_time', today());
    }

    /**
     * Scope for this week's records
     */
    public function scopeThisWeek($query)
    {
        return $query->whereBetween('attendance_time', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    /**
     * Scope for this month's records
     */
    public function scopeThisMonth($query)
    {
        return $query->whereBetween('attendance_time', [
            now()->startOfMonth(),
            now()->endOfMonth()
        ]);
    }

    /**
     * Scope for date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('attendance_time', [$startDate, $endDate]);
    }

    /**
     * Scope for specific device
     */
    public function scopeForDevice($query, $deviceId)
    {
        return $query->where('device_id', $deviceId);
    }

    /**
     * Scope for specific employee
     */
    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    /**
     * Scope for processed records
     */
    public function scopeProcessed($query)
    {
        return $query->whereNotNull('processed_at');
    }

    /**
     * Scope for unprocessed records
     */
    public function scopeUnprocessed($query)
    {
        return $query->whereNull('processed_at');
    }

    /**
     * Get attendance type as string
     */
    public function getAttendanceTypeStringAttribute(): string
    {
        return $this->attendance_type == 0 ? 'check_in' : 'check_out';
    }

    /**
     * Get formatted attendance time
     */
    public function getFormattedTimeAttribute(): string
    {
        return $this->attendance_time->format('Y-m-d H:i:s');
    }

    /**
     * Get time only
     */
    public function getTimeOnlyAttribute(): string
    {
        return $this->attendance_time->format('H:i:s');
    }

    /**
     * Get date only
     */
    public function getDateOnlyAttribute(): string
    {
        return $this->attendance_time->format('Y-m-d');
    }

    /**
     * Check if this is a check-in record
     */
    public function isCheckIn(): bool
    {
        return $this->attendance_type == 0;
    }

    /**
     * Check if this is a check-out record
     */
    public function isCheckOut(): bool
    {
        return $this->attendance_type == 1;
    }

    /**
     * Check if record is processed
     */
    public function isProcessed(): bool
    {
        return !is_null($this->processed_at);
    }

    /**
     * Mark as processed
     */
    public function markAsProcessed(): bool
    {
        return $this->update([
            'processed_at' => now(),
            'sync_status' => 'synced'
        ]);
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(string $errorMessage): bool
    {
        return $this->update([
            'sync_status' => 'failed',
            'error_message' => $errorMessage
        ]);
    }

    /**
     * Get verification type icon
     */
    public function getVerificationIconAttribute(): string
    {
        $icons = [
            'fingerprint' => '👆',
            'face' => '😊',
            'password' => '🔑',
            'card' => '💳',
            'combination' => '🔐'
        ];

        return $icons[$this->verification_type] ?? '❓';
    }

    /**
     * Get time difference from now
     */
    public function getTimeDifferenceAttribute(): string
    {
        return $this->attendance_time->diffForHumans();
    }

    /**
     * Check if attendance is late (after 9 AM for check-in)
     */
    public function isLate(): bool
    {
        if (!$this->isCheckIn()) {
            return false;
        }

        $workStartTime = Carbon::parse($this->attendance_time->format('Y-m-d') . ' 09:00:00');
        return $this->attendance_time->gt($workStartTime);
    }

    /**
     * Check if attendance is early departure (before 5 PM for check-out)
     */
    public function isEarlyDeparture(): bool
    {
        if (!$this->isCheckOut()) {
            return false;
        }

        $workEndTime = Carbon::parse($this->attendance_time->format('Y-m-d') . ' 17:00:00');
        return $this->attendance_time->lt($workEndTime);
    }

    /**
     * Get attendance status
     */
    public function getStatusAttribute(): string
    {
        if ($this->isCheckIn()) {
            return $this->isLate() ? 'late' : 'on_time';
        }

        if ($this->isCheckOut()) {
            return $this->isEarlyDeparture() ? 'early_departure' : 'normal';
        }

        return 'unknown';
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute(): string
    {
        $colors = [
            'on_time' => 'green',
            'late' => 'red',
            'early_departure' => 'orange',
            'normal' => 'blue',
            'unknown' => 'gray'
        ];

        return $colors[$this->status] ?? 'gray';
    }

    /**
     * Convert to array for API response
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'device_id' => $this->device_id,
            'device_user_id' => $this->device_user_id,
            'employee_id' => $this->employee_id,
            'employee_name' => $this->employee ? $this->employee->name : null,
            'attendance_time' => $this->formatted_time,
            'attendance_type' => $this->attendance_type_string,
            'verification_type' => $this->verification_type,
            'verification_icon' => $this->verification_icon,
            'status' => $this->status,
            'status_color' => $this->status_color,
            'time_difference' => $this->time_difference,
            'is_processed' => $this->isProcessed(),
            'processed_at' => $this->processed_at ? $this->processed_at->toISOString() : null,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString()
        ];
    }
}