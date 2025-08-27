import { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../../middleware/auth';
import { ApiResponse } from '../../../types/index';
import ExcelJS from 'exceljs';

interface FilterData {
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  cabang_id?: string;
  karyawan_id?: string;
  status?: string;
}

// Mock data untuk demo - dalam implementasi nyata, ambil dari database
const mockAbsensi = [
  {
    id: 1,
    karyawan_id: 1,
    nama_karyawan: 'John Doe',
    cabang: 'Kantor Pusat',
    tanggal: '2024-01-15',
    jam_masuk: '08:00:00',
    jam_keluar: '17:00:00',
    status: 'hadir',
    keterangan: '',
  },
  {
    id: 2,
    karyawan_id: 2,
    nama_karyawan: 'Jane Smith',
    cabang: 'Kantor Pusat',
    tanggal: '2024-01-15',
    jam_masuk: '08:30:00',
    jam_keluar: '17:00:00',
    status: 'terlambat',
    keterangan: 'Terlambat 30 menit',
  },
  {
    id: 3,
    karyawan_id: 3,
    nama_karyawan: 'Bob Johnson',
    cabang: 'Cabang A',
    tanggal: '2024-01-15',
    jam_masuk: undefined,
    jam_keluar: undefined,
    status: 'alpha',
    keterangan: 'Tidak hadir tanpa keterangan',
  },
  {
    id: 4,
    karyawan_id: 1,
    nama_karyawan: 'John Doe',
    cabang: 'Kantor Pusat',
    tanggal: '2024-01-14',
    jam_masuk: '08:00:00',
    jam_keluar: '17:00:00',
    status: 'hadir',
    keterangan: '',
  },
  {
    id: 5,
    karyawan_id: 4,
    nama_karyawan: 'Alice Brown',
    cabang: 'Cabang B',
    tanggal: '2024-01-14',
    jam_masuk: '08:00:00',
    jam_keluar: '16:00:00',
    status: 'izin',
    keterangan: 'Izin pulang cepat',
  },
];

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const {
      tanggal_mulai,
      tanggal_selesai,
      cabang_id,
      karyawan_id,
      status
    } = req.query as FilterData;

    // Filter data berdasarkan parameter
    let filteredData = [...mockAbsensi];

    if (tanggal_mulai) {
      filteredData = filteredData.filter(item => item.tanggal >= tanggal_mulai);
    }

    if (tanggal_selesai) {
      filteredData = filteredData.filter(item => item.tanggal <= tanggal_selesai);
    }

    if (karyawan_id) {
      filteredData = filteredData.filter(item => 
        item.karyawan_id === parseInt(karyawan_id)
      );
    }

    if (status) {
      filteredData = filteredData.filter(item => item.status === status);
    }

    // Siapkan data untuk Excel
    const excelData = filteredData.map((item, index) => ({
      'No': index + 1,
      'Nama Karyawan': item.nama_karyawan,
      'Cabang': item.cabang,
      'Tanggal': item.tanggal,
      'Jam Masuk': item.jam_masuk || '-',
      'Jam Keluar': item.jam_keluar || '-',
      'Status': item.status.charAt(0).toUpperCase() + item.status.slice(1),
      'Keterangan': item.keterangan || '-'
    }));

    // Buat workbook Excel dengan ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Absensi');

    // Set header kolom
    const headers = [
      'No', 'Nama Karyawan', 'Cabang', 'Tanggal', 
      'Jam Masuk', 'Jam Keluar', 'Status', 'Keterangan'
    ];
    worksheet.addRow(headers);

    // Tambahkan data
    excelData.forEach(row => {
      worksheet.addRow([
        row['No'],
        row['Nama Karyawan'],
        row['Cabang'],
        row['Tanggal'],
        row['Jam Masuk'],
        row['Jam Keluar'],
        row['Status'],
        row['Keterangan']
      ]);
    });

    // Set lebar kolom
    worksheet.columns = [
      { width: 5 },  // No
      { width: 20 }, // Nama Karyawan
      { width: 15 }, // Cabang
      { width: 12 }, // Tanggal
      { width: 12 }, // Jam Masuk
      { width: 12 }, // Jam Keluar
      { width: 12 }, // Status
      { width: 30 }  // Keterangan
    ];

    // Generate buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.from(buffer);

    // Set headers untuk download
    const filename = `laporan-absensi-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length.toString());

    // Kirim file Excel
    res.status(200).send(excelBuffer);

  } catch (error) {
    console.error('Export Excel error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengexport data ke Excel',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export default requireRole(['admin'])(handler);