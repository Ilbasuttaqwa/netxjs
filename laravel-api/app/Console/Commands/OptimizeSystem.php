<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\FingerprintAttendance;
use App\Models\Employee;
use App\Models\FingerprintDevice;
use Exception;

class OptimizeSystem extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'system:optimize 
                            {--duplicates : Remove duplicate attendance records only}
                            {--orphaned : Clean orphaned records only}
                            {--cache : Clear and rebuild caches only}
                            {--indexes : Optimize database indexes only}
                            {--logs : Cleanup old logs only}
                            {--tables : Optimize database tables only}
                            {--report : Generate report only}
                            {--dry-run : Show what would be done without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Optimize the fingerprint attendance system by removing duplicates, cleaning orphaned records, and optimizing performance';

    private $stats = [
        'duplicates_removed' => 0,
        'orphaned_records_cleaned' => 0,
        'cache_operations' => 0,
        'indexes_optimized' => 0,
        'logs_cleaned' => 0,
        'tables_optimized' => 0
    ];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Starting System Optimization...');
        $this->newLine();

        try {
            // Check if specific operations are requested
            $specificOperation = $this->option('duplicates') || 
                               $this->option('orphaned') || 
                               $this->option('cache') || 
                               $this->option('indexes') || 
                               $this->option('logs') || 
                               $this->option('tables') || 
                               $this->option('report');

            if ($specificOperation) {
                $this->runSpecificOperations();
            } else {
                $this->runFullOptimization();
            }

            $this->displayResults();
            $this->info('✅ System optimization completed successfully!');
            
            return Command::SUCCESS;
            
        } catch (Exception $e) {
            $this->error('❌ Optimization failed: ' . $e->getMessage());
            Log::error('System optimization failed', ['error' => $e->getMessage()]);
            
            return Command::FAILURE;
        }
    }

    /**
     * Run specific operations based on options
     */
    private function runSpecificOperations()
    {
        if ($this->option('duplicates')) {
            $this->removeDuplicateAttendance();
        }

        if ($this->option('orphaned')) {
            $this->cleanOrphanedRecords();
        }

        if ($this->option('cache')) {
            $this->optimizeCaches();
        }

        if ($this->option('indexes')) {
            $this->optimizeIndexes();
        }

        if ($this->option('logs')) {
            $this->cleanupLogs();
        }

        if ($this->option('tables')) {
            $this->optimizeTables();
        }

        if ($this->option('report')) {
            $this->generateReport();
        }
    }

    /**
     * Run full optimization process
     */
    private function runFullOptimization()
    {
        $this->removeDuplicateAttendance();
        $this->cleanOrphanedRecords();
        $this->optimizeIndexes();
        $this->optimizeCaches();
        $this->cleanupLogs();
        $this->optimizeTables();
        $this->generateReport();
    }

    /**
     * Remove duplicate attendance records
     */
    private function removeDuplicateAttendance()
    {
        $this->info('🔍 Checking for duplicate attendance records...');
        
        if ($this->option('dry-run')) {
            $duplicates = DB::select("
                SELECT 
                    device_id, 
                    device_user_id, 
                    attendance_time,
                    COUNT(*) as count
                FROM fingerprint_attendances 
                GROUP BY device_id, device_user_id, attendance_time 
                HAVING COUNT(*) > 1
            ");
            
            $totalDuplicates = array_sum(array_column($duplicates, 'count')) - count($duplicates);
            $this->warn("[DRY RUN] Would remove {$totalDuplicates} duplicate records");
            return;
        }

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
        $progressBar = $this->output->createProgressBar(count($duplicates));
        $progressBar->start();

        foreach ($duplicates as $duplicate) {
            $ids = explode(',', $duplicate->ids);
            $idsToRemove = array_slice($ids, 1);
            
            if (!empty($idsToRemove)) {
                FingerprintAttendance::whereIn('id', $idsToRemove)->delete();
                $removedCount += count($idsToRemove);
            }
            
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();
        
        $this->stats['duplicates_removed'] = $removedCount;
        $this->info("✅ Removed {$removedCount} duplicate attendance records");
    }

    /**
     * Clean orphaned records
     */
    private function cleanOrphanedRecords()
    {
        $this->info('🧹 Cleaning orphaned records...');
        
        if ($this->option('dry-run')) {
            $orphanedAttendance = FingerprintAttendance::whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                      ->from('fingerprint_devices')
                      ->whereColumn('fingerprint_devices.device_id', 'fingerprint_attendances.device_id');
            })->count();
            
            $orphanedEmployeeAttendance = FingerprintAttendance::whereNotNull('employee_id')
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                          ->from('employees')
                          ->whereColumn('employees.id', 'fingerprint_attendances.employee_id');
                })->count();
            
            $this->warn("[DRY RUN] Would clean {$orphanedAttendance} orphaned attendance records");
            $this->warn("[DRY RUN] Would clean {$orphanedEmployeeAttendance} attendance records with invalid employee references");
            return;
        }

        // Clean attendance records for non-existent devices
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
        }

        // Clean attendance records for non-existent employees
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
        }

        $this->stats['orphaned_records_cleaned'] = $orphanedAttendance + $orphanedEmployeeAttendance;
        $this->info("✅ Cleaned {$this->stats['orphaned_records_cleaned']} orphaned records");
    }

    /**
     * Optimize database indexes
     */
    private function optimizeIndexes()
    {
        $this->info('📊 Optimizing database indexes...');
        
        if ($this->option('dry-run')) {
            $this->warn('[DRY RUN] Would optimize database indexes');
            return;
        }

        $indexes = [
            'CREATE INDEX IF NOT EXISTS idx_attendance_device_time ON fingerprint_attendances(device_id, attendance_time)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_employee_time ON fingerprint_attendances(employee_id, attendance_time)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_status ON fingerprint_attendances(status)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_type ON fingerprint_attendances(attendance_type)',
            'CREATE INDEX IF NOT EXISTS idx_employee_device_user ON employees(device_user_id)',
            'CREATE INDEX IF NOT EXISTS idx_employee_branch ON employees(branch_id)',
            'CREATE INDEX IF NOT EXISTS idx_employee_active ON employees(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_device_status ON fingerprint_devices(status)',
            'CREATE INDEX IF NOT EXISTS idx_device_branch ON fingerprint_devices(branch_id)',
            'CREATE INDEX IF NOT EXISTS idx_device_active ON fingerprint_devices(is_active)',
        ];

        $progressBar = $this->output->createProgressBar(count($indexes));
        $progressBar->start();

        foreach ($indexes as $index) {
            try {
                DB::statement($index);
                $this->stats['indexes_optimized']++;
            } catch (Exception $e) {
                $this->warn("Failed to create index: {$e->getMessage()}");
            }
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();
        $this->info("✅ Optimized {$this->stats['indexes_optimized']} database indexes");
    }

    /**
     * Optimize caches
     */
    private function optimizeCaches()
    {
        $this->info('💾 Optimizing caches...');
        
        if ($this->option('dry-run')) {
            $this->warn('[DRY RUN] Would clear and rebuild caches');
            return;
        }

        // Clear all caches
        Cache::flush();
        $this->stats['cache_operations']++;

        // Rebuild important caches
        $this->rebuildEmployeeCache();
        $this->rebuildDeviceCache();
        $this->rebuildStatsCache();

        $this->info('✅ Caches optimized successfully');
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
        
        $this->stats['cache_operations']++;
        $this->line("  → Rebuilt cache for {$employees->count()} employees");
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
        
        $this->stats['cache_operations']++;
        $this->line("  → Rebuilt cache for {$devices->count()} devices");
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
        $this->stats['cache_operations']++;
        $this->line('  → Rebuilt system statistics cache');
    }

    /**
     * Cleanup old logs
     */
    private function cleanupLogs()
    {
        $this->info('📝 Cleaning up old logs...');
        
        if ($this->option('dry-run')) {
            $logPath = storage_path('logs');
            $files = glob($logPath . '/*.log');
            $oldFiles = 0;
            
            foreach ($files as $file) {
                if (filemtime($file) < strtotime('-30 days')) {
                    $oldFiles++;
                }
            }
            
            $this->warn("[DRY RUN] Would clean up {$oldFiles} old log files");
            return;
        }

        $logPath = storage_path('logs');
        $files = glob($logPath . '/*.log');
        $cleaned = 0;

        foreach ($files as $file) {
            if (filemtime($file) < strtotime('-30 days')) {
                unlink($file);
                $cleaned++;
            }
        }

        $this->stats['logs_cleaned'] = $cleaned;
        $this->info("✅ Cleaned up {$cleaned} old log files");
    }

    /**
     * Optimize database tables
     */
    private function optimizeTables()
    {
        $this->info('🗄️ Optimizing database tables...');
        
        if ($this->option('dry-run')) {
            $this->warn('[DRY RUN] Would optimize database tables');
            return;
        }

        $tables = [
            'fingerprint_attendances',
            'employees',
            'fingerprint_devices',
            'attendance_rules',
            'branches',
            'positions'
        ];

        $progressBar = $this->output->createProgressBar(count($tables));
        $progressBar->start();

        foreach ($tables as $table) {
            try {
                DB::statement("OPTIMIZE TABLE {$table}");
                $this->stats['tables_optimized']++;
            } catch (Exception $e) {
                $this->warn("Failed to optimize table {$table}: {$e->getMessage()}");
            }
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine();
        $this->info("✅ Optimized {$this->stats['tables_optimized']} database tables");
    }

    /**
     * Generate optimization report
     */
    private function generateReport()
    {
        $this->info('📊 Generating optimization report...');
        
        $report = [
            'timestamp' => now()->toDateTimeString(),
            'statistics' => $this->stats,
            'database_stats' => [
                'total_attendances' => FingerprintAttendance::count(),
                'total_employees' => Employee::count(),
                'total_devices' => FingerprintDevice::count(),
                'active_employees' => Employee::active()->count(),
                'active_devices' => FingerprintDevice::active()->count(),
            ]
        ];
        
        if (!$this->option('dry-run')) {
            $reportPath = storage_path('logs/optimization_report_' . date('Y-m-d_H-i-s') . '.json');
            file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT));
            $this->info("📄 Report saved to: {$reportPath}");
        } else {
            $this->warn('[DRY RUN] Report would be generated');
        }
    }

    /**
     * Display optimization results
     */
    private function displayResults()
    {
        $this->newLine();
        $this->info('📈 Optimization Results:');
        $this->table(
            ['Operation', 'Count'],
            [
                ['Duplicates Removed', $this->stats['duplicates_removed']],
                ['Orphaned Records Cleaned', $this->stats['orphaned_records_cleaned']],
                ['Cache Operations', $this->stats['cache_operations']],
                ['Indexes Optimized', $this->stats['indexes_optimized']],
                ['Logs Cleaned', $this->stats['logs_cleaned']],
                ['Tables Optimized', $this->stats['tables_optimized']],
            ]
        );
    }
}