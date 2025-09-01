import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { ApiResponse } from '../../../types/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FingerprintRealtimeData {
  device_id: string;
  user_id: string;
  timestamp: string;
  verify_type: number; // 1: fingerprint, 15: face, etc.
  in_out_mode: number; // 0: check-in, 1: check-out
  work_code: number;
}

interface AttendanceRecord {
  id: number;
  karyawan_id: number;
  device_id: string;
  timestamp: string;
  type: 'masuk' | 'keluar';
  verify_method: 'fingerprint' | 'face' | 'card';
  status: 'hadir' | 'terlambat' | 'pulang_cepat';
  created_at: string;
}

// Real-time connections
let connectedClients: any[] = [];

const handler = async (req: AuthenticatedRequest, res: NextApiResponse<ApiResponse<any>>) => {
  if (req.method === 'GET') {
    // SSE endpoint untuk realtime monitoring
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const clientId = Date.now();
    const client = {
      id: clientId,
      response: res,
    };
    
    connectedClients.push(client);

    // Send initial data
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      connectedClients = connectedClients.filter(c => c.id !== clientId);
    });

    return;
  }

  if (req.method === 'POST') {
    try {
      const data: FingerprintRealtimeData = req.body;
      
      // Validate required fields
      if (!data.device_id || !data.user_id || !data.timestamp) {
        return res.status(400).json({
          success: false,
          message: 'Device ID, User ID, dan timestamp diperlukan',
        });
      }

      // Process fingerprint data
      const attendanceRecord: AttendanceRecord = {
        id: Date.now(),
        karyawan_id: parseInt(data.user_id),
        device_id: data.device_id,
        timestamp: data.timestamp,
        type: data.in_out_mode === 0 ? 'masuk' : 'keluar',
        verify_method: getVerifyMethod(data.verify_type),
        status: calculateAttendanceStatus(data),
        created_at: new Date().toISOString(),
      };

      // Save to database
      const savedRecord = await prisma.fingerprintAttendance.create({
        data: {
          user_id: attendanceRecord.karyawan_id,
          device_user_id: data.user_id,
          device_id: attendanceRecord.device_id,
          attendance_time: new Date(attendanceRecord.timestamp),
          attendance_type: data.in_out_mode,
          verification_type: attendanceRecord.verify_method,
          is_realtime: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              nama_pegawai: true,
              device_user_id: true,
              cabang: {
                select: {
                  id: true,
                  nama_cabang: true,
                }
              }
            }
          }
        }
      });

      // Broadcast to all connected clients
      broadcastToClients({
        type: 'attendance_record',
        data: savedRecord,
      });



      return res.status(200).json({
        success: true,
        message: 'Data kehadiran berhasil diproses',
        data: attendanceRecord,
      });
    } catch (error: any) {
      console.error('Error processing fingerprint data:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal memproses data fingerprint',
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  if (req.method === 'DELETE') {
    // Clear all records (for testing - use with caution in production)
    await prisma.fingerprintAttendance.deleteMany({});
    broadcastToClients({
      type: 'records_cleared',
      data: null,
    });
    
    return res.status(200).json({
      success: true,
      message: 'Semua rekaman berhasil dihapus',
    });
  }

  return res.status(405).json({
    success: false,
    message: 'Method tidak diizinkan',
  });
};

function getVerifyMethod(verifyType: number): 'fingerprint' | 'face' | 'card' {
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

function calculateAttendanceStatus(data: FingerprintRealtimeData): 'hadir' | 'terlambat' | 'pulang_cepat' {
  const timestamp = new Date(data.timestamp);
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();
  
  if (data.in_out_mode === 0) { // Check-in
    // Jam masuk standar: 08:00
    if (hour > 8 || (hour === 8 && minute > 0)) {
      return 'terlambat';
    }
    return 'hadir';
  } else { // Check-out
    // Jam pulang standar: 17:00
    if (hour < 17) {
      return 'pulang_cepat';
    }
    return 'hadir';
  }
}

function broadcastToClients(message: any) {
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;
  
  connectedClients.forEach((client, index) => {
    try {
      client.response.write(messageStr);
    } catch (error) {
      console.error(`Error sending to client ${client.id}:`, error);
      // Remove disconnected client
      connectedClients.splice(index, 1);
    }
  });
}

// Note: Mock data generator removed for production
// Real fingerprint devices will send data to this endpoint

// Wrapper to handle token from query parameter for SSE
const wrappedHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // For SSE, check token from query parameter if not in header
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  
  // Call the authenticated handler
  return withAuth(handler)(req, res);
};

export default wrappedHandler;