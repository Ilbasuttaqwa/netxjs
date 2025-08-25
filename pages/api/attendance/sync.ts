import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AttendanceLogData {
  device_id: string;
  device_user_id: string;
  attendance_time: string;
  fingerprint_id?: string;
  verification_type?: string;
}

interface SyncRequest {
  device_id: string;
  logs: AttendanceLogData[];
  timestamp: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow CORS for device communication
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const syncData: SyncRequest = req.body;
    
    if (!syncData.device_id || !syncData.logs) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and logs are required'
      });
    }

    // Find the device
    const device = await prisma.device.findUnique({
      where: { device_id: syncData.device_id },
      include: {
        cabang: true
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const processedLogs = [];
    const errors = [];

    // Process each attendance log
    for (const log of syncData.logs) {
      try {
        // Find user by device_user_id
        const user = await prisma.user.findFirst({
          where: {
            device_user_id: log.device_user_id,
            id_cabang: device.cabang_id
          }
        });

        if (!user) {
          errors.push({
            device_user_id: log.device_user_id,
            error: 'User not found'
          });
          continue;
        }

        const attendanceTime = new Date(log.attendance_time);
        
        // Create fingerprint hash for deduplication
        const fingerprintHash = `${device.id}_${user.id}_${attendanceTime.getTime()}`;
        
        // Check for duplicate attendance within 5 minutes
        const existingAttendance = await prisma.attendanceDeduplication.findFirst({
          where: {
            deviceId: device.id.toString(),
            employeeId: user.id.toString(),
            timestamp: {
              gte: new Date(attendanceTime.getTime() - 5 * 60 * 1000), // 5 minutes before
              lte: new Date(attendanceTime.getTime() + 5 * 60 * 1000)  // 5 minutes after
            }
          }
        });

        if (existingAttendance) {
          console.log(`Duplicate attendance detected for user ${user.id} at ${attendanceTime}`);
          continue;
        }

        // Create attendance deduplication record
        await prisma.attendanceDeduplication.create({
          data: {
            deviceId: device.id.toString(),
            employeeId: user.id.toString(),
            fingerprintHash: fingerprintHash,
            timestamp: attendanceTime
          }
        });

        // Create fingerprint attendance record
        const fingerprintAttendance = await prisma.fingerprintAttendance.create({
          data: {
            user_id: user.id,
            device_user_id: log.device_user_id,
            attendance_time: attendanceTime,
            fingerprint_id: log.fingerprint_id || null,
            verification_type: log.verification_type || 'fingerprint',
            cabang_id: device.cabang_id,
            device_id: device.id.toString()
          }
        });

        // Determine attendance type based on time
        const hour = attendanceTime.getHours();
        let attendanceType = 'masuk';
        
        // Check if there's already a 'masuk' record for today
        const todayStart = new Date(attendanceTime);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(attendanceTime);
        todayEnd.setHours(23, 59, 59, 999);
        
        const todayAttendance = await prisma.absensi.findFirst({
          where: {
            id_user: user.id,
            tanggal: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        });

        if (todayAttendance && todayAttendance.jam_masuk) {
          attendanceType = 'keluar';
        }

        // Create or update attendance record
        const attendanceDate = new Date(attendanceTime);
        attendanceDate.setHours(0, 0, 0, 0);

        if (attendanceType === 'masuk') {
          const existingAttendance = await prisma.absensi.findFirst({
            where: {
              id_user: user.id,
              tanggal: attendanceDate
            }
          });

          if (existingAttendance) {
            await prisma.absensi.update({
              where: { id: existingAttendance.id },
              data: {
                jam_masuk: attendanceTime,
                status: 'hadir',
                updated_at: new Date()
              }
            });
          } else {
            await prisma.absensi.create({
              data: {
                id_user: user.id,
                tanggal: attendanceDate,
                jam_masuk: attendanceTime,
                status: 'hadir',
                id_cabang: device.cabang_id
              }
            });
          }
        } else {
          const existingAttendance = await prisma.absensi.findFirst({
            where: {
              id_user: user.id,
              tanggal: attendanceDate
            }
          });

          if (existingAttendance) {
            await prisma.absensi.update({
              where: { id: existingAttendance.id },
              data: {
                jam_keluar: attendanceTime,
                updated_at: new Date()
              }
            });
          }
        }

        processedLogs.push({
          device_user_id: log.device_user_id,
          user_id: user.id,
          attendance_time: attendanceTime,
          type: attendanceType,
          fingerprint_attendance_id: fingerprintAttendance.id
        });

      } catch (logError) {
        console.error(`Error processing log for user ${log.device_user_id}:`, logError);
        errors.push({
          device_user_id: log.device_user_id,
          error: logError instanceof Error ? logError.message : 'Unknown error'
        });
      }
    }

    // Update device last_sync
    await prisma.device.update({
      where: { id: device.id },
      data: {
        last_sync: new Date(),
        updated_at: new Date()
      }
    });

    // Update device status to online
    await prisma.deviceStatusLog.create({
      data: {
        device_id: device.id,
        status: 'online',
        firmware_version: device.firmware_version,
        employee_count: processedLogs.length,
        storage_usage: 0,
        timestamp: new Date()
      }
    });

    console.log(`Processed ${processedLogs.length} attendance logs from device ${syncData.device_id}`);

    res.status(200).json({
      success: true,
      message: `Successfully processed ${processedLogs.length} attendance logs`,
      data: {
        device_id: syncData.device_id,
        processed_count: processedLogs.length,
        error_count: errors.length,
        processed_logs: processedLogs,
        errors: errors,
        sync_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error syncing attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
