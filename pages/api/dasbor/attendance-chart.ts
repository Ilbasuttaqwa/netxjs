import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const generateMockChartData = (period: string) => {
  const now = new Date();
  let labels: string[] = [];
  let hadirData: number[] = [];
  let terlambatData: number[] = [];
  let alphaData: number[] = [];

  switch (period) {
    case '7days':
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));
        hadirData.push(Math.floor(Math.random() * 20) + 15);
        terlambatData.push(Math.floor(Math.random() * 5) + 1);
        alphaData.push(Math.floor(Math.random() * 3));
      }
      break;
    case '30days':
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.getDate().toString());
        hadirData.push(Math.floor(Math.random() * 25) + 20);
        terlambatData.push(Math.floor(Math.random() * 8) + 2);
        alphaData.push(Math.floor(Math.random() * 5));
      }
      break;
    case '3months':
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('id-ID', { month: 'short' }));
        hadirData.push(Math.floor(Math.random() * 500) + 400);
        terlambatData.push(Math.floor(Math.random() * 100) + 50);
        alphaData.push(Math.floor(Math.random() * 50) + 10);
      }
      break;
    default:
      // Default to 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));
        hadirData.push(Math.floor(Math.random() * 20) + 15);
        terlambatData.push(Math.floor(Math.random() * 5) + 1);
        alphaData.push(Math.floor(Math.random() * 3));
      }
  }

  return {
    labels,
    datasets: [
      {
        label: 'Hadir',
        data: hadirData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Terlambat',
        data: terlambatData,
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Alpha',
        data: alphaData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { period = '7days' } = req.query;
    
    // Validate period parameter
    const validPeriods = ['7days', '30days', '3months'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period parameter. Valid values: 7days, 30days, 3months',
      });
    }

    // In a real application, you would fetch this data from your database
    // For now, we'll return mock data
    const chartData = generateMockChartData(period as string);

    return res.status(200).json({
      success: true,
      message: 'Data grafik kehadiran berhasil diambil',
      data: chartData,
    });
  } catch (error: any) {
    console.error('Attendance chart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message,
    });
  }
}

export default withAuth(handler);