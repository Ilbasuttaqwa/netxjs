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

import { prisma } from '../../../lib/prisma';

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

    // Query database dengan filter
    const whereClause: {
      tanggal?: {
        gte?: Date;
        lte?: Date;
      };
      karyawan_id?: number;
      status?: string;
      karyawan?: {
        cabang_id: number;
      };
    } = {};

    if (tanggal_mulai || tanggal_selesai) {
      whereClause.tanggal = {};
      if (tanggal_mulai) whereClause.tanggal.gte = new Date(tanggal_mulai);
      if (tanggal_selesai) whereClause.tanggal.lte = new Date(tanggal_selesai);
    }

    if (karyawan_id) {
      whereClause.karyawan_id = parseInt(karyawan_id);
    }

    if (status) {
      whereClause.status = status;
    }

    if (cabang_id) {
      whereClause.karyawan = {
        cabang_id: parseInt(cabang_id)
      };
    }

    const absensiData = await prisma.absensi.findMany({
      where: whereClause,
      include: {
        karyawan: {
          include: {
            cabang: true
          }
        }
      },
      orderBy: {
        tanggal: 'desc'
      }
    });

    const filteredData = absensiData.map(item => ({
      id: item.id,
      karyawan_id: item.karyawan_id,
      nama_karyawan: item.karyawan.nama,
      cabang: item.karyawan.cabang.nama,
      tanggal: item.tanggal.toISOString().split('T')[0],
      jam_masuk: item.jam_masuk,
      jam_keluar: item.jam_keluar,
      status: item.status,
      keterangan: item.keterangan || ''
    }));

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