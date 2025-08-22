<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class EmployeeController extends Controller
{
    /**
     * Get all employees
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Employee::with(['branch', 'position']);

            // Filter by branch
            if ($request->has('branch_id')) {
                $query->where('branch_id', $request->branch_id);
            }

            // Filter by position
            if ($request->has('position_id')) {
                $query->where('position_id', $request->position_id);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter active only
            if ($request->boolean('active_only')) {
                $query->active();
            }

            // Search by name or employee_id
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            $employees = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $employees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employees',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store new employee
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'employee_id' => 'required|string|unique:employees',
                'name' => 'required|string|max:255',
                'email' => 'nullable|email|unique:employees',
                'phone' => 'nullable|string|max:20',
                'device_user_id' => 'nullable|string',
                'branch_id' => 'nullable|exists:branches,id',
                'position_id' => 'nullable|exists:positions,id',
                'department' => 'nullable|string|max:255',
                'hire_date' => 'nullable|date',
                'status' => 'string|in:active,inactive,terminated'
            ]);

            $employee = Employee::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Employee created successfully',
                'data' => $employee->load(['branch', 'position'])
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create employee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show specific employee
     */
    public function show(Employee $employee): JsonResponse
    {
        try {
            $employee->load(['branch', 'position', 'attendances' => function($query) {
                $query->latest()->limit(10);
            }]);

            // Add today's attendance status
            $todayAttendance = [
                'check_in' => $employee->getTodayCheckIn(),
                'check_out' => $employee->getTodayCheckOut(),
                'is_checked_in' => $employee->isCurrentlyCheckedIn()
            ];

            return response()->json([
                'success' => true,
                'data' => array_merge($employee->toArray(), [
                    'today_attendance' => $todayAttendance
                ])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update employee
     */
    public function update(Request $request, Employee $employee): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'string|max:255',
                'email' => 'nullable|email|unique:employees,email,' . $employee->id,
                'phone' => 'nullable|string|max:20',
                'device_user_id' => 'nullable|string',
                'branch_id' => 'nullable|exists:branches,id',
                'position_id' => 'nullable|exists:positions,id',
                'department' => 'nullable|string|max:255',
                'hire_date' => 'nullable|date',
                'status' => 'string|in:active,inactive,terminated',
                'is_active' => 'boolean'
            ]);

            $employee->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully',
                'data' => $employee->load(['branch', 'position'])
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update employee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete employee
     */
    public function destroy(Employee $employee): JsonResponse
    {
        try {
            $employee->delete();

            return response()->json([
                'success' => true,
                'message' => 'Employee deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete employee',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee attendances
     */
    public function getAttendances(Request $request, Employee $employee): JsonResponse
    {
        try {
            $query = $employee->attendances()->with(['device']);

            // Filter by date range
            if ($request->has('start_date')) {
                $query->whereDate('attendance_time', '>=', $request->start_date);
            }
            if ($request->has('end_date')) {
                $query->whereDate('attendance_time', '<=', $request->end_date);
            }

            // Filter by attendance type
            if ($request->has('attendance_type')) {
                $query->where('attendance_type', $request->attendance_type);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $attendances = $query->latest('attendance_time')
                ->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $attendances
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employee attendances',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}