<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FingerprintDevice extends Model
{
    use HasFactory;

    protected $table = 'fingerprint_devices';

    protected $fillable = [
        'device_id',
        'device_name',
        'ip_address',
        'port',
        'username',
        'password',
        'status',
        'last_sync',
        'last_ping',
        'total_users',
        'total_records',
        'branch_id',
        'device_type',
        'firmware_version',
        'serial_number',
        'is_active'
    ];

    protected $casts = [
        'last_sync' => 'datetime',
        'last_ping' => 'datetime',
        'total_users' => 'integer',
        'total_records' => 'integer',
        'port' => 'integer',
        'is_active' => 'boolean'
    ];

    protected $hidden = [
        'password'
    ];

    /**
     * Get attendance records for this device
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(FingerprintAttendance::class, 'device_id');
    }

    /**
     * Get branch for this device
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Scope for active devices
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for online devices
     */
    public function scopeOnline($query)
    {
        return $query->where('status', 'online');
    }

    /**
     * Scope for offline devices
     */
    public function scopeOffline($query)
    {
        return $query->where('status', 'offline');
    }

    /**
     * Get device connection URL
     */
    public function getConnectionUrlAttribute(): string
    {
        return "http://{$this->ip_address}:{$this->port}";
    }

    /**
     * Check if device is online
     */
    public function isOnline(): bool
    {
        return $this->status === 'online';
    }

    /**
     * Check if device is offline
     */
    public function isOffline(): bool
    {
        return $this->status === 'offline';
    }

    /**
     * Update device status
     */
    public function updateStatus(string $status): bool
    {
        return $this->update([
            'status' => $status,
            'last_ping' => now()
        ]);
    }

    /**
     * Update sync information
     */
    public function updateSync(int $totalRecords = null): bool
    {
        $data = [
            'last_sync' => now(),
            'status' => 'online'
        ];

        if ($totalRecords !== null) {
            $data['total_records'] = $totalRecords;
        }

        return $this->update($data);
    }

    /**
     * Get recent attendance records
     */
    public function getRecentAttendance(int $limit = 10)
    {
        return $this->attendances()
            ->with('employee')
            ->orderBy('attendance_time', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get attendance count for today
     */
    public function getTodayAttendanceCount(): int
    {
        return $this->attendances()
            ->whereDate('attendance_time', today())
            ->count();
    }

    /**
     * Get attendance count for this week
     */
    public function getWeekAttendanceCount(): int
    {
        return $this->attendances()
            ->whereBetween('attendance_time', [
                now()->startOfWeek(),
                now()->endOfWeek()
            ])
            ->count();
    }

    /**
     * Get device statistics
     */
    public function getStatistics(): array
    {
        return [
            'total_records' => $this->total_records,
            'today_records' => $this->getTodayAttendanceCount(),
            'week_records' => $this->getWeekAttendanceCount(),
            'last_sync' => $this->last_sync,
            'last_ping' => $this->last_ping,
            'status' => $this->status,
            'uptime_percentage' => $this->calculateUptimePercentage()
        ];
    }

    /**
     * Calculate device uptime percentage (last 30 days)
     */
    private function calculateUptimePercentage(): float
    {
        // This is a simplified calculation
        // In real implementation, you would track ping history
        $hoursInMonth = 24 * 30;
        $lastPingHours = $this->last_ping ? now()->diffInHours($this->last_ping) : $hoursInMonth;
        
        if ($lastPingHours >= $hoursInMonth) {
            return 0.0;
        }
        
        $uptimeHours = $hoursInMonth - $lastPingHours;
        return round(($uptimeHours / $hoursInMonth) * 100, 2);
    }

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($device) {
            if (empty($device->device_id)) {
                $device->device_id = 'FP' . str_pad(static::count() + 1, 3, '0', STR_PAD_LEFT);
            }
        });
    }
}