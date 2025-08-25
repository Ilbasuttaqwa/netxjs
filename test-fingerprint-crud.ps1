# AFMS Fingerprint CRUD Testing Script
# Script untuk testing operasi Create, Read, Update, Delete fingerprint data

Write-Host "=== AFMS Fingerprint CRUD Testing ===" -ForegroundColor Green
Write-Host "Testing Create, Read, Update, Delete operations untuk fingerprint data" -ForegroundColor Yellow
Write-Host ""

# Configuration
$API_BASE_URL = "http://localhost:8001/api"
$NEXTJS_BASE_URL = "http://localhost:3002/api"
$TEST_LOG_FILE = "fingerprint-crud-test.log"
$API_TOKEN = "your-secure-api-token"  # Update sesuai dengan .env

# Test data
$testEmployee = @{
    nama_pegawai = "Test Employee CRUD"
    email = "test.crud@afms.local"
    device_user_id = "999"
    cabang_id = 1
    jabatan_id = 1
    status = $true
}

$testFingerprintData = @{
    device_id = "TEST_DEVICE_001"
    user_id = "999"
    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    verify_type = 1  # fingerprint
    in_out_mode = 0  # check-in
    work_code = 0
}

# Function untuk logging
function Write-TestLog {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$TestCase = ""
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $(if($TestCase){"[$TestCase] "})$Message"
    Write-Host $logMessage
    Add-Content -Path $TEST_LOG_FILE -Value $logMessage
}

# Function untuk HTTP request dengan error handling
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = @{},
        [hashtable]$Headers = @{},
        [string]$TestCase = ""
    )
    
    try {
        $requestParams = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
            TimeoutSec = 30
        }
        
        if ($Method -ne "GET" -and $Body.Count -gt 0) {
            $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
            $requestParams.Headers["Content-Type"] = "application/json"
        }
        
        Write-TestLog "Making $Method request to: $Url" "DEBUG" $TestCase
        
        $response = Invoke-WebRequest @requestParams
        
        $result = @{
            Success = $true
            StatusCode = $response.StatusCode
            Content = $response.Content
            Data = $null
        }
        
        # Try to parse JSON response
        try {
            $result.Data = $response.Content | ConvertFrom-Json
        } catch {
            Write-TestLog "Response is not valid JSON" "WARNING" $TestCase
        }
        
        Write-TestLog "Request successful. Status: $($response.StatusCode)" "SUCCESS" $TestCase
        return $result
        
    } catch {
        Write-TestLog "Request failed: $($_.Exception.Message)" "ERROR" $TestCase
        
        $result = @{
            Success = $false
            StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { 0 }
            Content = $_.Exception.Message
            Data = $null
        }
        
        return $result
    }
}

# Function untuk test CREATE operation
function Test-CreateFingerprint {
    Write-TestLog "=== Testing CREATE Operation ===" "INFO" "CREATE"
    
    $testResults = @{
        CreateEmployee = $false
        CreateFingerprintData = $false
        ValidateCreatedData = $false
    }
    
    # Step 1: Create test employee first
    Write-TestLog "Step 1: Creating test employee" "INFO" "CREATE"
    $headers = @{ "Authorization" = "Bearer $API_TOKEN" }
    
    $employeeResponse = Invoke-ApiRequest -Url "$API_BASE_URL/employees" -Method "POST" -Body $testEmployee -Headers $headers -TestCase "CREATE"
    
    if ($employeeResponse.Success -and $employeeResponse.StatusCode -eq 201) {
        Write-TestLog "✅ Test employee created successfully" "SUCCESS" "CREATE"
        $testResults.CreateEmployee = $true
        $script:createdEmployeeId = $employeeResponse.Data.data.id
    } else {
        Write-TestLog "❌ Failed to create test employee" "ERROR" "CREATE"
        return $testResults
    }
    
    # Step 2: Create fingerprint attendance data
    Write-TestLog "Step 2: Creating fingerprint attendance data" "INFO" "CREATE"
    
    $fingerprintResponse = Invoke-ApiRequest -Url "$NEXTJS_BASE_URL/fingerprint/realtime" -Method "POST" -Body $testFingerprintData -Headers $headers -TestCase "CREATE"
    
    if ($fingerprintResponse.Success -and $fingerprintResponse.StatusCode -eq 200) {
        Write-TestLog "✅ Fingerprint data created successfully" "SUCCESS" "CREATE"
        $testResults.CreateFingerprintData = $true
        $script:createdFingerprintId = $fingerprintResponse.Data.data.id
    } else {
        Write-TestLog "❌ Failed to create fingerprint data" "ERROR" "CREATE"
    }
    
    # Step 3: Validate created data
    Write-TestLog "Step 3: Validating created data" "INFO" "CREATE"
    
    if ($script:createdFingerprintId) {
        Start-Sleep -Seconds 2  # Wait for data to be processed
        
        $validateResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances?user_id=$($script:createdEmployeeId)" -Headers $headers -TestCase "CREATE"
        
        if ($validateResponse.Success -and $validateResponse.Data.data.data.Count -gt 0) {
            Write-TestLog "✅ Created fingerprint data validated successfully" "SUCCESS" "CREATE"
            $testResults.ValidateCreatedData = $true
        } else {
            Write-TestLog "❌ Failed to validate created fingerprint data" "ERROR" "CREATE"
        }
    }
    
    return $testResults
}

# Function untuk test READ operation
function Test-ReadFingerprint {
    Write-TestLog "=== Testing READ Operation ===" "INFO" "READ"
    
    $testResults = @{
        ReadAllAttendances = $false
        ReadSpecificAttendance = $false
        ReadWithFilters = $false
        ReadEmployeeAttendances = $false
    }
    
    $headers = @{ "Authorization" = "Bearer $API_TOKEN" }
    
    # Step 1: Read all attendances
    Write-TestLog "Step 1: Reading all attendances" "INFO" "READ"
    
    $allAttendancesResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances" -Headers $headers -TestCase "READ"
    
    if ($allAttendancesResponse.Success -and $allAttendancesResponse.StatusCode -eq 200) {
        Write-TestLog "✅ Successfully retrieved all attendances" "SUCCESS" "READ"
        $testResults.ReadAllAttendances = $true
        
        $attendanceCount = $allAttendancesResponse.Data.data.data.Count
        Write-TestLog "Found $attendanceCount attendance records" "INFO" "READ"
    } else {
        Write-TestLog "❌ Failed to retrieve all attendances" "ERROR" "READ"
    }
    
    # Step 2: Read specific attendance (if we have created one)
    if ($script:createdFingerprintId) {
        Write-TestLog "Step 2: Reading specific attendance record" "INFO" "READ"
        
        $specificResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances/$($script:createdFingerprintId)" -Headers $headers -TestCase "READ"
        
        if ($specificResponse.Success -and $specificResponse.StatusCode -eq 200) {
            Write-TestLog "✅ Successfully retrieved specific attendance" "SUCCESS" "READ"
            $testResults.ReadSpecificAttendance = $true
        } else {
            Write-TestLog "❌ Failed to retrieve specific attendance" "ERROR" "READ"
        }
    }
    
    # Step 3: Read with filters (today's data)
    Write-TestLog "Step 3: Reading with date filter (today)" "INFO" "READ"
    
    $today = Get-Date -Format "yyyy-MM-dd"
    $filteredResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances?start_date=$today&end_date=$today" -Headers $headers -TestCase "READ"
    
    if ($filteredResponse.Success -and $filteredResponse.StatusCode -eq 200) {
        Write-TestLog "✅ Successfully retrieved filtered attendances" "SUCCESS" "READ"
        $testResults.ReadWithFilters = $true
        
        $todayCount = $filteredResponse.Data.data.data.Count
        Write-TestLog "Found $todayCount attendance records for today" "INFO" "READ"
    } else {
        Write-TestLog "❌ Failed to retrieve filtered attendances" "ERROR" "READ"
    }
    
    # Step 4: Read employee-specific attendances
    if ($script:createdEmployeeId) {
        Write-TestLog "Step 4: Reading employee-specific attendances" "INFO" "READ"
        
        $employeeResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances?employee_id=$($script:createdEmployeeId)" -Headers $headers -TestCase "READ"
        
        if ($employeeResponse.Success -and $employeeResponse.StatusCode -eq 200) {
            Write-TestLog "✅ Successfully retrieved employee attendances" "SUCCESS" "READ"
            $testResults.ReadEmployeeAttendances = $true
        } else {
            Write-TestLog "❌ Failed to retrieve employee attendances" "ERROR" "READ"
        }
    }
    
    return $testResults
}

# Function untuk test UPDATE operation
function Test-UpdateFingerprint {
    Write-TestLog "=== Testing UPDATE Operation ===" "INFO" "UPDATE"
    
    $testResults = @{
        UpdateAttendanceRecord = $false
        UpdateEmployeeInfo = $false
        ValidateUpdatedData = $false
    }
    
    $headers = @{ "Authorization" = "Bearer $API_TOKEN" }
    
    # Step 1: Update attendance record (if exists)
    if ($script:createdFingerprintId) {
        Write-TestLog "Step 1: Updating attendance record" "INFO" "UPDATE"
        
        $updateData = @{
            verification_type = "fingerprint_updated"
            processing_status = "completed"
        }
        
        $updateResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances/$($script:createdFingerprintId)" -Method "PUT" -Body $updateData -Headers $headers -TestCase "UPDATE"
        
        if ($updateResponse.Success -and ($updateResponse.StatusCode -eq 200 -or $updateResponse.StatusCode -eq 204)) {
            Write-TestLog "✅ Attendance record updated successfully" "SUCCESS" "UPDATE"
            $testResults.UpdateAttendanceRecord = $true
        } else {
            Write-TestLog "❌ Failed to update attendance record" "ERROR" "UPDATE"
        }
    }
    
    # Step 2: Update employee information
    if ($script:createdEmployeeId) {
        Write-TestLog "Step 2: Updating employee information" "INFO" "UPDATE"
        
        $updateEmployeeData = @{
            nama_pegawai = "Test Employee CRUD - Updated"
            email = "test.crud.updated@afms.local"
        }
        
        $updateEmployeeResponse = Invoke-ApiRequest -Url "$API_BASE_URL/employees/$($script:createdEmployeeId)" -Method "PUT" -Body $updateEmployeeData -Headers $headers -TestCase "UPDATE"
        
        if ($updateEmployeeResponse.Success -and ($updateEmployeeResponse.StatusCode -eq 200 -or $updateEmployeeResponse.StatusCode -eq 204)) {
            Write-TestLog "✅ Employee information updated successfully" "SUCCESS" "UPDATE"
            $testResults.UpdateEmployeeInfo = $true
        } else {
            Write-TestLog "❌ Failed to update employee information" "ERROR" "UPDATE"
        }
    }
    
    # Step 3: Validate updated data
    Write-TestLog "Step 3: Validating updated data" "INFO" "UPDATE"
    
    if ($script:createdEmployeeId) {
        Start-Sleep -Seconds 1  # Wait for update to be processed
        
        $validateResponse = Invoke-ApiRequest -Url "$API_BASE_URL/employees/$($script:createdEmployeeId)" -Headers $headers -TestCase "UPDATE"
        
        if ($validateResponse.Success -and $validateResponse.StatusCode -eq 200) {
            $updatedEmployee = $validateResponse.Data.data
            if ($updatedEmployee.nama_pegawai -eq "Test Employee CRUD - Updated") {
                Write-TestLog "✅ Updated data validated successfully" "SUCCESS" "UPDATE"
                $testResults.ValidateUpdatedData = $true
            } else {
                Write-TestLog "❌ Updated data validation failed" "ERROR" "UPDATE"
            }
        } else {
            Write-TestLog "❌ Failed to validate updated data" "ERROR" "UPDATE"
        }
    }
    
    return $testResults
}

# Function untuk test DELETE operation
function Test-DeleteFingerprint {
    Write-TestLog "=== Testing DELETE Operation ===" "INFO" "DELETE"
    
    $testResults = @{
        DeleteAttendanceRecord = $false
        DeleteEmployeeRecord = $false
        ValidateDeletedData = $false
    }
    
    $headers = @{ "Authorization" = "Bearer $API_TOKEN" }
    
    # Step 1: Delete attendance record
    if ($script:createdFingerprintId) {
        Write-TestLog "Step 1: Deleting attendance record" "INFO" "DELETE"
        
        $deleteAttendanceResponse = Invoke-ApiRequest -Url "$API_BASE_URL/attendances/$($script:createdFingerprintId)" -Method "DELETE" -Headers $headers -TestCase "DELETE"
        
        if ($deleteAttendanceResponse.Success -and ($deleteAttendanceResponse.StatusCode -eq 200 -or $deleteAttendanceResponse.StatusCode -eq 204)) {
            Write-TestLog "✅ Attendance record deleted successfully" "SUCCESS" "DELETE"
            $testResults.DeleteAttendanceRecord = $true
        } else {
            Write-TestLog "❌ Failed to delete attendance record" "ERROR" "DELETE"
        }
    }
    
    # Step 2: Delete employee record
    if ($script:createdEmployeeId) {
        Write-TestLog "Step 2: Deleting employee record" "INFO" "DELETE"
        
        $deleteEmployeeResponse = Invoke-ApiRequest -Url "$API_BASE_URL/employees/$($script:createdEmployeeId)" -Method "DELETE" -Headers $headers -TestCase "DELETE"
        
        if ($deleteEmployeeResponse.Success -and ($deleteEmployeeResponse.StatusCode -eq 200 -or $deleteEmployeeResponse.StatusCode -eq 204)) {
            Write-TestLog "✅ Employee record deleted successfully" "SUCCESS" "DELETE"
            $testResults.DeleteEmployeeRecord = $true
        } else {
            Write-TestLog "❌ Failed to delete employee record" "ERROR" "DELETE"
        }
    }
    
    # Step 3: Validate deleted data
    Write-TestLog "Step 3: Validating deleted data" "INFO" "DELETE"
    
    if ($script:createdEmployeeId) {
        Start-Sleep -Seconds 1  # Wait for deletion to be processed
        
        $validateResponse = Invoke-ApiRequest -Url "$API_BASE_URL/employees/$($script:createdEmployeeId)" -Headers $headers -TestCase "DELETE"
        
        if ($validateResponse.StatusCode -eq 404 -or $validateResponse.StatusCode -eq 410) {
            Write-TestLog "✅ Deleted data validation successful (record not found)" "SUCCESS" "DELETE"
            $testResults.ValidateDeletedData = $true
        } else {
            Write-TestLog "❌ Deleted data validation failed (record still exists)" "ERROR" "DELETE"
        }
    }
    
    return $testResults
}

# Function untuk generate comprehensive test report
function Generate-CrudTestReport {
    param(
        [hashtable]$CreateResults,
        [hashtable]$ReadResults,
        [hashtable]$UpdateResults,
        [hashtable]$DeleteResults
    )
    
    Write-Host ""
    Write-Host "=== FINGERPRINT CRUD TEST REPORT ===" -ForegroundColor Cyan
    Write-Host ""
    
    $allResults = @{
        "CREATE Operations" = $CreateResults
        "READ Operations" = $ReadResults
        "UPDATE Operations" = $UpdateResults
        "DELETE Operations" = $DeleteResults
    }
    
    $overallSuccess = $true
    $totalTests = 0
    $passedTests = 0
    
    foreach ($category in $allResults.Keys) {
        Write-Host "$category:" -ForegroundColor Yellow
        
        foreach ($test in $allResults[$category].Keys) {
            $totalTests++
            $status = if ($allResults[$category][$test]) { 
                $passedTests++
                "✅ PASS" 
            } else { 
                $overallSuccess = $false
                "❌ FAIL" 
            }
            $color = if ($allResults[$category][$test]) { "Green" } else { "Red" }
            
            Write-Host "  $test : $status" -ForegroundColor $color
        }
        Write-Host ""
    }
    
    # Summary
    Write-Host "SUMMARY:" -ForegroundColor Cyan
    Write-Host "Total Tests: $totalTests" -ForegroundColor White
    Write-Host "Passed: $passedTests" -ForegroundColor Green
    Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor Red
    Write-Host "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor White
    
    Write-Host ""
    if ($overallSuccess) {
        Write-Host "🎉 ALL CRUD OPERATIONS: SUCCESSFUL" -ForegroundColor Green
        Write-TestLog "All CRUD operations completed successfully" "SUCCESS" "SUMMARY"
    } else {
        Write-Host "⚠️ SOME CRUD OPERATIONS: FAILED" -ForegroundColor Yellow
        Write-TestLog "Some CRUD operations failed. Check logs for details" "WARNING" "SUMMARY"
    }
    
    Write-Host ""
    Write-Host "Detailed log: $TEST_LOG_FILE" -ForegroundColor Gray
}

# Function untuk test prerequisites
function Test-Prerequisites {
    Write-TestLog "Checking prerequisites for CRUD testing..." "INFO" "PREREQ"
    
    $prereqResults = @{
        ApiConnection = $false
        NextJSConnection = $false
        DatabaseConnection = $false
    }
    
    # Test API connection
    try {
        $apiResponse = Invoke-WebRequest -Uri "$API_BASE_URL/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($apiResponse.StatusCode -eq 200) {
            $prereqResults.ApiConnection = $true
            Write-TestLog "✅ Laravel API is accessible" "SUCCESS" "PREREQ"
        }
    } catch {
        Write-TestLog "❌ Laravel API is not accessible" "ERROR" "PREREQ"
    }
    
    # Test NextJS connection
    try {
        $nextjsResponse = Invoke-WebRequest -Uri $NEXTJS_BASE_URL -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($nextjsResponse.StatusCode -eq 200 -or $nextjsResponse.StatusCode -eq 404) {
            $prereqResults.NextJSConnection = $true
            Write-TestLog "✅ NextJS API is accessible" "SUCCESS" "PREREQ"
        }
    } catch {
        Write-TestLog "❌ NextJS API is not accessible" "ERROR" "PREREQ"
    }
    
    # Test database connection (via API)
    try {
        $headers = @{ "Authorization" = "Bearer $API_TOKEN" }
        $dbResponse = Invoke-ApiRequest -Url "$API_BASE_URL/employees?per_page=1" -Headers $headers -TestCase "PREREQ"
        if ($dbResponse.Success) {
            $prereqResults.DatabaseConnection = $true
            Write-TestLog "✅ Database connection is working" "SUCCESS" "PREREQ"
        }
    } catch {
        Write-TestLog "❌ Database connection failed" "ERROR" "PREREQ"
    }
    
    $allPrereqsPassed = $prereqResults.Values | ForEach-Object { $_ } | Where-Object { $_ -eq $false } | Measure-Object | Select-Object -ExpandProperty Count
    
    if ($allPrereqsPassed -eq 0) {
        Write-TestLog "All prerequisites passed. Ready for CRUD testing" "SUCCESS" "PREREQ"
        return $true
    } else {
        Write-TestLog "Some prerequisites failed. Cannot proceed with CRUD testing" "ERROR" "PREREQ"
        return $false
    }
}

# Main execution
try {
    Write-TestLog "Starting AFMS Fingerprint CRUD Testing" "INFO" "MAIN"
    
    # Initialize global variables
    $script:createdEmployeeId = $null
    $script:createdFingerprintId = $null
    
    # Check prerequisites
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    if (-not (Test-Prerequisites)) {
        Write-Host "❌ Prerequisites check failed. Please ensure services are running." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Prerequisites passed. Starting CRUD tests..." -ForegroundColor Green
    Write-Host ""
    
    # Run CRUD tests
    $createResults = Test-CreateFingerprint
    $readResults = Test-ReadFingerprint
    $updateResults = Test-UpdateFingerprint
    $deleteResults = Test-DeleteFingerprint
    
    # Generate comprehensive report
    Generate-CrudTestReport -CreateResults $createResults -ReadResults $readResults -UpdateResults $updateResults -DeleteResults $deleteResults
    
    Write-TestLog "AFMS Fingerprint CRUD Testing completed" "INFO" "MAIN"
    
} catch {
    Write-TestLog "Critical error during CRUD testing: $($_.Exception.Message)" "ERROR" "MAIN"
    Write-Host "❌ Critical error occurred. Check $TEST_LOG_FILE for details." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Review test results above" -ForegroundColor White
Write-Host "2. Fix any failed operations" -ForegroundColor White
Write-Host "3. Run integration tests" -ForegroundColor White
Write-Host "4. Test security features" -ForegroundColor White
Write-Host "5. Validate feedback systems" -ForegroundColor White
Write-Host ""