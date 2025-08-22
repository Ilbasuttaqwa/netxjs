# Script untuk memperbaiki import path alias

# Fungsi untuk menghitung relative path
function Get-RelativePath {
    param(
        [string]$From,
        [string]$To
    )
    
    $fromParts = $From.Split('\') | Where-Object { $_ -ne '' }
    $toParts = $To.Split('\') | Where-Object { $_ -ne '' }
    
    # Hitung berapa level naik
    $upLevels = ($fromParts.Count - 1)
    
    # Buat relative path
    $relativePath = '../' * $upLevels + ($toParts -join '/')
    
    return $relativePath
}

# Daftar file yang perlu diperbaiki
$files = @(
    'pages\dashboard.tsx',
    'pages\absensi.tsx',
    'pages\attendance.tsx',
    'pages\login.tsx',
    'pages\users.tsx',
    'pages\admin\payroll-rules.tsx',
    'pages\admin\payroll.tsx',
    'pages\admin\settings.tsx',
    'pages\admin\karyawan.tsx',
    'pages\admin\jabatan.tsx',
    'pages\admin\absensi.tsx',
    'pages\admin\monitoring.tsx',
    'lib\api.ts',
    'pages\api\payroll\deductions.ts',
    'pages\api\payroll\rules.ts'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing imports in: $file"
        
        $content = Get-Content $file -Raw
        
        # Tentukan relative path berdasarkan lokasi file
        $fileDir = Split-Path $file -Parent
        $levels = ($fileDir.Split('\') | Where-Object { $_ -ne '' }).Count
        
        if ($levels -eq 0) {
            $prefix = './'
        } else {
            $prefix = '../' * $levels
        }
        
        # Replace imports
        $content = $content -replace "from '@/types';", "from '${prefix}types';"
        $content = $content -replace "from '@/lib/api';", "from '${prefix}lib/api';"
        $content = $content -replace "from '@/contexts/AuthContext';", "from '${prefix}contexts/AuthContext';"
        $content = $content -replace "from '@/contexts/ToastContext';", "from '${prefix}contexts/ToastContext';"
        $content = $content -replace "from '@/components/layouts/DashboardLayout';", "from '${prefix}components/layouts/DashboardLayout';"
        $content = $content -replace "from '@/components/ui/([^']+)';", "from '${prefix}components/ui/`$1';"
        $content = $content -replace "from '@/components/dashboard/([^']+)';", "from '${prefix}components/dashboard/`$1';"
        $content = $content -replace "from '@/components/monitoring/([^']+)';", "from '${prefix}components/monitoring/`$1';"
        $content = $content -replace "from '@/utils/cn';", "from '${prefix}utils/cn';"
        $content = $content -replace "from '@/hooks/([^']+)';", "from '${prefix}hooks/`$1';"
        $content = $content -replace "from '@/middleware/auth';", "from '${prefix}middleware/auth';"
        
        Set-Content $file $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "All imports fixed!"