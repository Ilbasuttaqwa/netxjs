<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceRule extends Model
{
    use HasFactory;

    protected $table = 'attendance_rules';

    protected $fillable = [
        'name',
        'type',
        'category',
        'calculation_method',
        'amount',
        'conditions',
        'description',
        'is_active'
    ];

    protected $casts = [
        'conditions' => 'array',
        'amount' => 'decimal:2',
        'is_active' => 'boolean'
    ];

    /**
     * Scope for active rules
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for deduction rules
     */
    public function scopeDeductions($query)
    {
        return $query->where('type', 'deduction');
    }

    /**
     * Scope for allowance rules
     */
    public function scopeAllowances($query)
    {
        return $query->where('type', 'allowance');
    }

    /**
     * Scope for attendance category
     */
    public function scopeAttendanceCategory($query)
    {
        return $query->where('category', 'attendance');
    }
}