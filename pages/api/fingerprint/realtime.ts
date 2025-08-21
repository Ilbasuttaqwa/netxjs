import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../middleware/auth';
import { ApiResponse } from '../../../types';

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

// Mock data untuk simulasi
let realtimeRecords: AttendanceRecord[] = [];
let connectedClients: any[] = [];

const handler = async (req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) => {
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
    console.log(`Client ${clientId} connected. Total clients: ${connectedClients.length}`);

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
      console.log(`Client ${clientId} disconnected. Total clients: ${connectedClients.length}`);
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

      // Store record (in real implementation, save to database)
      realtimeRecords.push(attendanceRecord);
      
      // Keep only last 100 records in memory
      if (realtimeRecords.length > 100) {
        realtimeRecords = realtimeRecords.slice(-100);
      }

      // Broadcast to all connected clients
      broadcastToClients({
        type: 'attendance_record',
        data: attendanceRecord,
      });

      console.log('New attendance record:', attendanceRecord);

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
    }
  }

  if (req.method === 'DELETE') {
    // Clear all records (for testing)
    realtimeRecords = [];
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

// Simulate fingerprint data for testing
setInterval(() => {
  if (connectedClients.length > 0) {
    const mockData: FingerprintRealtimeData = {
      device_id: 'FP001',
      user_id: Math.floor(Math.random() * 10 + 1).toString(),
      timestamp: new Date().toISOString(),
      verify_type: Math.random() > 0.5 ? 1 : 15,
      in_out_mode: Math.random() > 0.5 ? 0 : 1,
      work_code: 0,
    };
    
    // Process mock data
    const attendanceRecord: AttendanceRecord = {
      id: Date.now(),
      karyawan_id: parseInt(mockData.user_id),
      device_id: mockData.device_id,
      timestamp: mockData.timestamp,
      type: mockData.in_out_mode === 0 ? 'masuk' : 'keluar',
      verify_method: getVerifyMethod(mockData.verify_type),
      status: calculateAttendanceStatus(mockData),
      created_at: new Date().toISOString(),
    };
    
    realtimeRecords.push(attendanceRecord);
    
    broadcastToClients({
      type: 'attendance_record',
      data: attendanceRecord,
    });
  }
}, 10000); // Send mock data every 10 seconds

export default withAuth(handler, ['admin']);