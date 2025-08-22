<?php

/**
 * Laravel API System Optimizer
 * 
 * Script untuk mengoptimasi dan menghapus duplikasi dalam sistem
 * fingerprint attendance Laravel API
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\FingerprintAttendance;
use App\Models\Employee;
use App\Models\FingerprintDevice;

class SystemOptimizer
{
    private $output = [];
    private $errors = [];
    private $stats = [
        'duplicates_removed' => 0,
        'orphaned_records_cleaned' => 0,
        'cache_cleared' => 0,
        'indexes_optimized' => 0
    ];

    public function __construct()
    {
        $this->log('System Optimizer Started', 'info');
    }

    /**
     * Run complete optimization process
     */
    public function optimize()
    {
        try {
            $this->log('Starting system optimization...', 'info');
            
            // 1. Remove duplicate attendance records
            $this->removeDuplicateAttendance();
            
            // 2. Clean orphaned records
            $this->cleanOrphanedRecords();
            
            // 3. Optimize database indexes
            $this->optimizeIndexes();
            
            // 4. Clear and rebuild caches
            $this->optimizeCaches();
            
            // 5. Cleanup old logs
            $this->cleanupLogs();
            
            // 6. Optimize database tables
            $this->optimizeTables();
            
            // 7. Generate optimization report
            $this->generateReport();
            
            $this->log('System optimization completed successfully', 'success');
            
        } catch (Exception $e) {
            $this->log('Optimization failed: ' . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Remove duplicate attendance records
     */
    private function removeDuplicateAttendance()
    {
        $this->log('Removing duplicate attendance records...', 'info');
        
        try {
            // Find duplicates based on device_id, device_user_id, and attendance_time
            $duplicates = DB::select("
                SELECT 
                    device_id, 
                    device_user_id, 
                    attendance_time,
                    COUNT(*) as count,
                    GROUP_CONCAT(id ORDER BY id) as ids
                FROM fingerprint_attendances 
                GROUP BY device_id, device_user_id, attendance_time 
                HAVING COUNT(*) > 1
            ");
            
            $removedCount = 0;
            
            foreach ($duplicates as $duplicate) {
                $ids = explode(',', $duplicate->ids);
                // Keep the first record, remove the rest
                $idsToRemove = array_slice($ids, 1);
                
                if (!empty($idsToRemove)) {
                    FingerprintAttendance::whereIn('id', $idsToRemove)->delete();
                    $removedCount += count($idsToRemove);
                    
                    $this->log("Removed {count($idsToRemove)} duplicate records for device {$duplicate->device_id}, user {$duplicate->device_user_id}", 'info');
                }
            }
            
            $this->stats['duplicates_removed'] = $removedCount;
            $this->log("Total duplicate records removed: {$removedCount}", 'success');
            
        } catch (Exception $e) {
            $this->log('Error removing duplicates: ' . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Clean orphaned records
     */
    private function cleanOrphanedRecords()
    {
        $this->log('Cleaning orphaned records...', 'info');
        
        try {
            // Remove attendance records for non-existent devices
            $orphanedAttendance = FingerprintAttendance::whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                      ->from('fingerprint_devices')
                      ->whereColumn('fingerprint_devices.device_id', 'fingerprint_attendances.device_id');
            })->count();
            
            if ($orphanedAttendance > 0) {
                FingerprintAttendance::whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                          ->from('fingerprint_devices')
                          ->whereColumn('fingerprint_devices.device_id', 'fingerprint_attendances.device_id');
                })->delete();
                
                $this->log("Removed {$orphanedAttendance} orphaned attendance records", 'info');
            }
            
            // Remove attendance records for non-existent employees
            $orphanedEmployeeAttendance = FingerprintAttendance::whereNotNull('employee_id')
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                          ->from('employees')
                          ->whereColumn('employees.id', 'fingerprint_attendances.employee_id');
                })->count();
            
            if ($orphanedEmployeeAttendance > 0) {
                FingerprintAttendance::whereNotNull('employee_id')
                    ->whereNotExists(function ($query) {
                        $query->select(DB::raw(1))
                              ->from('employees')
                              ->whereColumn('employees.id', 'fingerprint_attendances.employee_id');
                    })->update(['employee_id' => null]);
                
                $this->log("Cleaned {$orphanedEmployeeAttendance} attendance records with invalid employee references", 'info');
            }
            
            $this->stats['orphaned_records_cleaned'] = $orphanedAttendance + $orphanedEmployeeAttendance;
            
        } catch (Exception $e) {
            $this->log('Error cleaning orphaned records: ' . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Optimize database indexes
     */
    private function optimizeIndexes()
    {
        $this->log('Optimizing database indexes...', 'info');
        
        try {
            $indexes = [
                // Fingerprint Attendances
                'CREATE INDEX IF NOT EXISTS idx_attendance_device_time ON fingerprint_attendances(device_id, attendance_time)',
                'CREATE INDEX IF NOT EXISTS idx_attendance_employee_time ON fingerprint_attendances(employee_id, attendance_time)',
                'CREATE INDEX IF NOT EXISTS idx_attendance_status ON fingerprint_attendances(status)',
                'CREATE INDEX IF NOT EXISTS idx_attendance_type ON fingerprint_attendances(attendance_type)',
                
                // Employees
                'CREATE INDEX IF NOT EXISTS idx_employee_device_user ON employees(device_user_id)',
                'CREATE INDEX IF NOT EXISTS idx_employee_branch ON employees(branch_id)',
                'CREATE INDEX IF NOT EXISTS idx_employee_active ON employees(is_active)',
                
                // Devices
                'CREATE INDEX IF NOT EXISTS idx_device_status ON fingerprint_devices(status)',
                'CREATE INDEX IF NOT EXISTS idx_device_branch ON fingerprint_devices(branch_id)',
                'CREATE INDEX IF NOT EXISTS idx_device_active ON fingerprint_devices(is_active)',
            ];
            
            foreach ($indexes as $index) {
                DB::statement($index);
                $this->stats['indexes_optimized']++;
            }
            
            $this->log("Optimized {$this->stats['indexes_optimized']} database indexes", 'success');
            
        } catch (Exception $e) {
            $this->log('Error optimizing indexes: ' . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Optimize caches
     */
    private function optimizeCaches()
    {
        $this->log('Optimizing caches...', 'info');
        
        try {
            // Clear all caches
            Cache::flush();
            
            // Rebuild important caches
            $this->rebuildEmployeeCache();
            $this->rebuildDeviceCache();
            $this->rebuildStatsCache();
            
            $this->stats['cache_cleared'] = 1;
            $this->log('Caches optimized successfully', 'success');
            
        } catch (Exception $e) {
            $this->log('Error optimizing caches: ' . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Rebuild employee cache
     */
    private function rebuildEmployeeCache()
    {
        $employees = Employee::active()->get();
        
        foreach ($employees as $employee) {
            $cacheKey = "employee_device_user_{$employee->device_user_id}";
            Cache::put($cacheKey, $employee, now()->addHours(24));
        }
        
        $this->log("Rebuilt cache for {$employees->count()} employees", 'info');
    }

    /**
     * Rebuild device cache
     */
    private function rebuildDeviceCache()
    {
        $devices = FingerprintDevice::active()->get();
        
        foreach ($devices as $device) {
            $cacheKey = "device_{$device->device_id}";
            Cache::put($cacheKey, $device, now()->addHours(24));
        }
        
        $this->log("Rebuilt cache for {$devices->count()} devices", 'info');
    }

    /**
     * Rebuild stats cache
     */
    private function rebuildStatsCache()
    {
        $stats = [
            'total_employees' => Employee::active()->count(),
            'total_devices' => FingerprintDevice::active()->count(),
            'total_attendances' => FingerprintAttendance::count(),
            'today_attendances' => FingerprintAttendance::today()->count(),
        ];
        
        Cache::put('system_stats', $stats, now()->addHours(1));
        $this->log('Rebuilt system statistics cache', 'info');
    }

    /**
     * Cleanup old logs
     */
    private function cleanupLogs()
    {
        $this->log('Cleaning up old logs...', 'info');
        
        try {
            $logPath = storage_path('logs');
            $files = glob($logPath . '/*.log');
            $cleaned = 0;
            
            foreach ($files as $file) {
                if (filemtime($file) < strtotime('-30 days')) {
                    unlink($file);
                    $cleaned++;
                }
            }
            
            $this->log("Cleaned up {$cleaned} old log files", 'success');
            
        } catch (Exception $e) {
            $this->log('Error cleaning logs: ' . $e->getMessage(), 'error');
        }
    }

    /**
     * Optimize database tables
     */
    private function optimizeTables()
    {
        $this->log('Optimizing database tables...', 'info');
        
        try {
            $tables = [
                'fingerprint_attendances',
                'employees',
                'fingerprint_devices',
                'attendance_rules',
                'branches',
                'positions'
            ];
            
            foreach ($tables as $table) {
                DB::statement("OPTIMIZE TABLE {$table}");
            }
            
            $this->log("Optimized {count($tables)} database tables", 'success');
            
        } catch (Exception $e) {
            $this->log('Error optimizing tables: ' . $e->getMessage(), 'error');
        }
    }

    /**
     * Generate optimization report
     */
    private function generateReport()
    {
        $report = [
            'timestamp' => now()->toDateTimeString(),
            'statistics' => $this->stats,
            'output' => $this->output,
            'errors' => $this->errors,
            'database_stats' => [
                'total_attendances' => FingerprintAttendance::count(),
                'total_employees' => Employee::count(),
                'total_devices' => FingerprintDevice::count(),
                'active_employees' => Employee::active()->count(),
                'active_devices' => FingerprintDevice::active()->count(),
            ]
        ];
        
        $reportPath = storage_path('logs/optimization_report_' . date('Y-m-d_H-i-s') . '.json');
        file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT));
        
        $this->log("Optimization report saved to: {$reportPath}", 'info');
        
        return $report;
    }

    /**
     * Log message
     */
    private function log($message, $level = 'info')
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] {$message}";
        
        $this->output[] = $logMessage;
        
        if ($level === 'error') {
            $this->errors[] = $logMessage;
        }
        
        // Output to console if running from CLI
        if (php_sapi_name() === 'cli') {
            $color = match($level) {
                'error' => "\033[31m",
                'success' => "\033[32m",
                'info' => "\033[34m",
                default => "\033[0m"
            };
            echo $color . $logMessage . "\033[0m" . PHP_EOL;
        }
        
        // Log to Laravel log
        Log::$level($message);
    }

    /**
     * Get optimization statistics
     */
    public function getStats()
    {
        return $this->stats;
    }

    /**
     * Get output messages
     */
    public function getOutput()
    {
        return $this->output;
    }

    /**
     * Get error messages
     */
    public function getErrors()
    {
        return $this->errors;
    }
}

// Run optimization if called from CLI
if (php_sapi_name() === 'cli') {
    try {
        // Bootstrap Laravel
        $app = require_once __DIR__ . '/../bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        
        $optimizer = new SystemOptimizer();
        $optimizer->optimize();
        
        echo "\n" . str_repeat('=', 50) . "\n";
        echo "OPTIMIZATION COMPLETED SUCCESSFULLY\n";
        echo str_repeat('=', 50) . "\n";
        
        $stats = $optimizer->getStats();
        foreach ($stats as $key => $value) {
            echo ucwords(str_replace('_', ' ', $key)) . ": {$value}\n";
        }
        
    } catch (Exception $e) {
        echo "\033[31mOptimization failed: " . $e->getMessage() . "\033[0m\n";
        exit(1);
    }
}