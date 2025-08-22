<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FingerprintController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\EmployeeController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Public routes for fingerprint device callbacks
Route::prefix('fingerprint')->group(function () {
    Route::post('/attendance', [FingerprintController::class, 'receiveAttendance']);
    Route::get('/device/{deviceId}/status', [FingerprintController::class, 'getDeviceStatus']);
    Route::post('/device/{deviceId}/sync', [FingerprintController::class, 'syncDevice']);
    Route::post('/device/{deviceId}/test', [FingerprintController::class, 'testConnection']);
});

// Protected API routes
Route::middleware(['auth:sanctum'])->group(function () {
    
    // Device management
    Route::prefix('devices')->group(function () {
        Route::get('/', [DeviceController::class, 'index']);
        Route::post('/', [DeviceController::class, 'store']);
        Route::get('/{device}', [DeviceController::class, 'show']);
        Route::put('/{device}', [DeviceController::class, 'update']);
        Route::delete('/{device}', [DeviceController::class, 'destroy']);
        Route::post('/{device}/sync', [DeviceController::class, 'sync']);
        Route::post('/{device}/test', [DeviceController::class, 'testConnection']);
        Route::get('/{device}/attendances', [DeviceController::class, 'getAttendances']);
    });
    
    // Employee management
    Route::prefix('employees')->group(function () {
        Route::get('/', [EmployeeController::class, 'index']);
        Route::post('/', [EmployeeController::class, 'store']);
        Route::get('/{employee}', [EmployeeController::class, 'show']);
        Route::put('/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/{employee}', [EmployeeController::class, 'destroy']);
        Route::get('/{employee}/attendances', [EmployeeController::class, 'getAttendances']);
    });
    
    // Attendance management
    Route::prefix('attendances')->group(function () {
        Route::get('/', [AttendanceController::class, 'index']);
        Route::get('/{attendance}', [AttendanceController::class, 'show']);
        Route::put('/{attendance}', [AttendanceController::class, 'update']);
        Route::delete('/{attendance}', [AttendanceController::class, 'destroy']);
        Route::post('/bulk-process', [AttendanceController::class, 'bulkProcess']);
        Route::get('/stats/daily', [AttendanceController::class, 'getDailyStats']);
        Route::get('/stats/monthly', [AttendanceController::class, 'getMonthlyStats']);
    });
    
    // Bridge endpoints for NextJS integration
    Route::prefix('bridge')->group(function () {
        Route::post('/nextjs/attendance', [FingerprintController::class, 'forwardToNextJS']);
        Route::get('/nextjs/sync-status', [FingerprintController::class, 'getSyncStatus']);
    });
});

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
        'version' => '1.0.0'
    ]);
});