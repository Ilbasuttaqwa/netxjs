<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Employee extends Model
{
    use HasFactory;

    protected $table = 'employees';

    protected $fillable = [
        'employee_id',
        'name',
        'email',
        'phone',
        'device_user_id',
        'branch_id',
        'position_id',
        'department',
        'hire_date',
        'status',
        'is_active'
    ];

    protected $casts = [
        'hire_date' => 'date',
        'is_active' => 'boolean'
    ];

    /**
     * Get attendance records for this employee
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(FingerprintAttendance::class);
    }

    /**
     * Get branch for this employee
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get position for this employee
     */
    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    /**
     * Scope for active employees
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get today's attendance
     */
    public function getTodayAttendance()
    {
        return $this->attendances()
            ->whereDate('attendance_time', today())
            ->orderBy('attendance_time')
            ->get();
    }

    /**
     * Get latest check-in today
     */
    public function getTodayCheckIn()
    {
        return $this->attendances()
            ->whereDate('attendance_time', today())
            ->where('attendance_type', 0)
            ->orderBy('attendance_time', 'desc')
            ->first();
    }

    /**
     * Get latest check-out today
     */
    public function getTodayCheckOut()
    {
        return $this->attendances()
            ->whereDate('attendance_time', today())
            ->where('attendance_type', 1)
            ->orderBy('attendance_time', 'desc')
            ->first();
    }

    /**
     * Check if employee is currently checked in
     */
    public function isCurrentlyCheckedIn(): bool
    {
        $lastCheckIn = $this->getTodayCheckIn();
        $lastCheckOut = $this->getTodayCheckOut();

        if (!$lastCheckIn) {
            return false;
        }

        if (!$lastCheckOut) {
            return true;
        }

        return $lastCheckIn->attendance_time->gt($lastCheckOut->attendance_time);
    }

    /**
     * Get full name attribute
     */
    public function getFullNameAttribute(): string
    {
        return $this->name;
    }

    /**
     * Get display name with employee ID
     */
    public function getDisplayNameAttribute(): string
    {
        return "{$this->name} ({$this->employee_id})";
    }
}