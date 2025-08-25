import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { ApiResponse } from '../../../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestFingerprintData {
  device_id: string;
  user_id: string;
  timestamp: string;
  verify_type: number;
  in_out_mode: number;
  work_code?: number;
  test_mode?: boolean;
}

interface TestResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse<ApiResponse<any>>) => {
  try {
    switch (req.method) {
      case 'POST':
        return await handleCreate(req, res);
      case 'GET':
        return await handleRead(req, res);
      case 'PUT':
        return await handleUpdate(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method tidak diizinkan'
        });
    }
  } catch (error: any) {
    console.error('Test CRUD Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
};

// CREATE Operation Test
async function handleCreate(req: AuthenticatedRequest, res: NextApiResponse) {
  const testResults: TestResult[] = [];
  
  try {
    const testData: TestFingerprintData = {
      device_id: req.body.device_id || 'TEST_DEVICE_001',
      user_id: req.body.user_id || '999',
      timestamp: req.body.timestamp || new Date().toISOString(),
      verify_type: req.body.verify_type || 1,
      in_out_mode: req.body.in_out_mode || 0,
      work_code: req.body.work_code || 0,
      test_mode: true
    };

    // Test 1: Create basic fingerprint record
    try {
      const basicRecord = await prisma.fingerprintAttendance.create({
        data: {
          user_id: parseInt(testData.user_id),
          device_user_id: testData.user_id,
          device_id: testData.device_id,
          attendance_time: new Date(testData.timestamp),
          attendance_type: testData.in_out_mode,
          verification_type: getVerifyMethod(testData.verify_type),
          is_realtime: false,
          processing_status: 'test_mode',
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      testResults.push({
        operation: 'CREATE_BASIC',
        success: true,
        data: basicRecord,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'CREATE_BASIC',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Create with validation
    try {
      const validatedRecord = await prisma.fingerprintAttendance.create({
        data: {
          user_id: parseInt(testData.user_id),
          device_user_id: testData.user_id,
          device_id: testData.device_id,
          attendance_time: new Date(testData.timestamp),
          attendance_type: testData.in_out_mode,
          verification_type: getVerifyMethod(testData.verify_type),
          is_realtime: true,
          processing_status: 'validated',
          work_code: testData.work_code,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      testResults.push({
        operation: 'CREATE_VALIDATED',
        success: true,
        data: validatedRecord,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'CREATE_VALIDATED',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Bulk create
    try {
      const bulkData = [];
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes() + i);
        
        bulkData.push({
          user_id: parseInt(testData.user_id) + i,
          device_user_id: (parseInt(testData.user_id) + i).toString(),
          device_id: testData.device_id,
          attendance_time: timestamp,
          attendance_type: i % 2, // Alternate between check-in and check-out
          verification_type: getVerifyMethod(testData.verify_type),
          is_realtime: false,
          processing_status: 'bulk_test',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const bulkResult = await prisma.fingerprintAttendance.createMany({
        data: bulkData
      });

      testResults.push({
        operation: 'CREATE_BULK',
        success: true,
        data: { count: bulkResult.count },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'CREATE_BULK',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'CREATE operations test completed',
      data: {
        test_results: testResults,
        summary: {
          total_tests: testResults.length,
          passed: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length
        }
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'CREATE test failed',
      error: error.message
    });
  }
}

// READ Operation Test
async function handleRead(req: AuthenticatedRequest, res: NextApiResponse) {
  const testResults: TestResult[] = [];
  
  try {
    // Test 1: Read all records
    try {
      const allRecords = await prisma.fingerprintAttendance.findMany({
        take: 10,
        orderBy: { created_at: 'desc' }
      });

      testResults.push({
        operation: 'READ_ALL',
        success: true,
        data: { count: allRecords.length, records: allRecords },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'READ_ALL',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Read with filters
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filteredRecords = await prisma.fingerprintAttendance.findMany({
        where: {
          attendance_time: {
            gte: today,
            lt: tomorrow
          },
          processing_status: {
            in: ['test_mode', 'validated', 'bulk_test']
          }
        },
        include: {
          user: {
            select: {
              id: true,
              nama_pegawai: true,
              device_user_id: true
            }
          }
        }
      });

      testResults.push({
        operation: 'READ_FILTERED',
        success: true,
        data: { count: filteredRecords.length, records: filteredRecords },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'READ_FILTERED',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Read by device
    try {
      const deviceRecords = await prisma.fingerprintAttendance.findMany({
        where: {
          device_id: 'TEST_DEVICE_001'
        },
        orderBy: { attendance_time: 'desc' },
        take: 5
      });

      testResults.push({
        operation: 'READ_BY_DEVICE',
        success: true,
        data: { count: deviceRecords.length, records: deviceRecords },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'READ_BY_DEVICE',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 4: Read with pagination
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const skip = (page - 1) * limit;

      const paginatedRecords = await prisma.fingerprintAttendance.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        where: {
          processing_status: {
            in: ['test_mode', 'validated', 'bulk_test']
          }
        }
      });

      const totalCount = await prisma.fingerprintAttendance.count({
        where: {
          processing_status: {
            in: ['test_mode', 'validated', 'bulk_test']
          }
        }
      });

      testResults.push({
        operation: 'READ_PAGINATED',
        success: true,
        data: {
          records: paginatedRecords,
          pagination: {
            page,
            limit,
            total: totalCount,
            total_pages: Math.ceil(totalCount / limit)
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'READ_PAGINATED',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'READ operations test completed',
      data: {
        test_results: testResults,
        summary: {
          total_tests: testResults.length,
          passed: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length
        }
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'READ test failed',
      error: error.message
    });
  }
}

// UPDATE Operation Test
async function handleUpdate(req: AuthenticatedRequest, res: NextApiResponse) {
  const testResults: TestResult[] = [];
  
  try {
    // Test 1: Update single record
    try {
      const recordToUpdate = await prisma.fingerprintAttendance.findFirst({
        where: {
          processing_status: {
            in: ['test_mode', 'validated', 'bulk_test']
          }
        }
      });

      if (recordToUpdate) {
        const updatedRecord = await prisma.fingerprintAttendance.update({
          where: { id: recordToUpdate.id },
          data: {
            processing_status: 'updated_test',
            verification_type: 'fingerprint_updated',
            updated_at: new Date()
          }
        });

        testResults.push({
          operation: 'UPDATE_SINGLE',
          success: true,
          data: updatedRecord,
          timestamp: new Date().toISOString()
        });
      } else {
        testResults.push({
          operation: 'UPDATE_SINGLE',
          success: false,
          error: 'No test record found to update',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      testResults.push({
        operation: 'UPDATE_SINGLE',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Bulk update
    try {
      const bulkUpdateResult = await prisma.fingerprintAttendance.updateMany({
        where: {
          processing_status: 'bulk_test'
        },
        data: {
          processing_status: 'bulk_updated',
          updated_at: new Date()
        }
      });

      testResults.push({
        operation: 'UPDATE_BULK',
        success: true,
        data: { count: bulkUpdateResult.count },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'UPDATE_BULK',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Conditional update
    try {
      const conditionalUpdate = await prisma.fingerprintAttendance.updateMany({
        where: {
          device_id: 'TEST_DEVICE_001',
          attendance_type: 0, // Check-in records
          processing_status: {
            in: ['test_mode', 'validated']
          }
        },
        data: {
          processing_status: 'conditional_updated',
          updated_at: new Date()
        }
      });

      testResults.push({
        operation: 'UPDATE_CONDITIONAL',
        success: true,
        data: { count: conditionalUpdate.count },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'UPDATE_CONDITIONAL',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'UPDATE operations test completed',
      data: {
        test_results: testResults,
        summary: {
          total_tests: testResults.length,
          passed: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length
        }
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'UPDATE test failed',
      error: error.message
    });
  }
}

// DELETE Operation Test
async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse) {
  const testResults: TestResult[] = [];
  
  try {
    // Test 1: Delete single record
    try {
      const recordToDelete = await prisma.fingerprintAttendance.findFirst({
        where: {
          processing_status: {
            in: ['updated_test', 'conditional_updated']
          }
        }
      });

      if (recordToDelete) {
        const deletedRecord = await prisma.fingerprintAttendance.delete({
          where: { id: recordToDelete.id }
        });

        testResults.push({
          operation: 'DELETE_SINGLE',
          success: true,
          data: { deleted_id: deletedRecord.id },
          timestamp: new Date().toISOString()
        });
      } else {
        testResults.push({
          operation: 'DELETE_SINGLE',
          success: false,
          error: 'No test record found to delete',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      testResults.push({
        operation: 'DELETE_SINGLE',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 2: Bulk delete
    try {
      const bulkDeleteResult = await prisma.fingerprintAttendance.deleteMany({
        where: {
          processing_status: {
            in: ['bulk_updated', 'conditional_updated', 'updated_test']
          }
        }
      });

      testResults.push({
        operation: 'DELETE_BULK',
        success: true,
        data: { count: bulkDeleteResult.count },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'DELETE_BULK',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Test 3: Conditional delete
    try {
      const conditionalDelete = await prisma.fingerprintAttendance.deleteMany({
        where: {
          device_id: 'TEST_DEVICE_001',
          processing_status: {
            in: ['test_mode', 'validated']
          }
        }
      });

      testResults.push({
        operation: 'DELETE_CONDITIONAL',
        success: true,
        data: { count: conditionalDelete.count },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      testResults.push({
        operation: 'DELETE_CONDITIONAL',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'DELETE operations test completed',
      data: {
        test_results: testResults,
        summary: {
          total_tests: testResults.length,
          passed: testResults.filter(r => r.success).length,
          failed: testResults.filter(r => !r.success).length
        }
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'DELETE test failed',
      error: error.message
    });
  }
}

function getVerifyMethod(verifyType: number): string {
  switch (verifyType) {
    case 1:
      return 'fingerprint';
    case 15:
      return 'face';
    case 2:
      return 'card';
    default:
      return 'fingerprint';
  }
}

export default withAuth(handler);