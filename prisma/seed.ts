import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create Cabang (Branches)
  const cabang1 = await prisma.cabang.upsert({
    where: { kode_cabang: 'KP001' },
    update: {},
    create: {
      nama_cabang: 'Kantor Pusat',
      alamat_cabang: 'Jl. Sudirman No. 123, Jakarta',
      telepon_cabang: '021-12345678',
      kode_cabang: 'KP001',
      status: true,
    },
  })

  const cabang2 = await prisma.cabang.upsert({
    where: { kode_cabang: 'BDG001' },
    update: {},
    create: {
      nama_cabang: 'Cabang Bandung',
      alamat_cabang: 'Jl. Asia Afrika No. 456, Bandung',
      telepon_cabang: '022-87654321',
      kode_cabang: 'BDG001',
      status: true,
    },
  })

  // Create Jabatan (Positions)
  const jabatanAdmin = await prisma.jabatan.create({
    data: {
      nama_jabatan: 'Administrator',
      jam_masuk: new Date('1970-01-01T08:00:00Z'),
      gaji_pokok: 15000000,
    },
  })

  const jabatanManager = await prisma.jabatan.create({
    data: {
      nama_jabatan: 'Manager',
      jam_masuk: new Date('1970-01-01T08:00:00Z'),
      gaji_pokok: 12000000,
    },
  })

  const jabatanStaff = await prisma.jabatan.create({
    data: {
      nama_jabatan: 'Staff',
      jam_masuk: new Date('1970-01-01T08:00:00Z'),
      gaji_pokok: 8000000,
    },
  })

  // Hash password
  const hashedPassword = await bcrypt.hash('password', 10)

  // Create Users
  const adminUser = await prisma.user.create({
    data: {
      nama_pegawai: 'Administrator',
      password: hashedPassword,
      role: 'admin',
      status_pegawai: true,
      id_jabatan: jabatanAdmin.id,
      id_cabang: cabang1.id,
      tempat_lahir: 'Jakarta',
      tanggal_lahir: new Date('1990-01-01'),
      jenis_kelamin: 'Laki-laki',
      alamat: 'Jl. Admin No. 1, Jakarta',
      tanggal_masuk: new Date('2020-01-01'),
      gaji: 17000000,
      device_user_id: '1',
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      nama_pegawai: 'Manager Operasional',
      password: hashedPassword,
      role: 'user',
      status_pegawai: true,
      id_jabatan: jabatanManager.id,
      id_cabang: cabang1.id,
      tempat_lahir: 'Bandung',
      tanggal_lahir: new Date('1985-05-15'),
      jenis_kelamin: 'Perempuan',
      alamat: 'Jl. Manager No. 2, Jakarta',
      tanggal_masuk: new Date('2020-03-01'),
      gaji: 13500000,
      device_user_id: '2',
    },
  })

  const staffUser = await prisma.user.create({
    data: {
      nama_pegawai: 'Staff Operasional',
      password: hashedPassword,
      role: 'user',
      status_pegawai: true,
      id_jabatan: jabatanStaff.id,
      id_cabang: cabang2.id,
      tempat_lahir: 'Surabaya',
      tanggal_lahir: new Date('1995-08-20'),
      jenis_kelamin: 'Laki-laki',
      alamat: 'Jl. Staff No. 3, Bandung',
      tanggal_masuk: new Date('2021-01-15'),
      gaji: 9000000,
      device_user_id: '3',
    },
  })

  // Create Devices
  const device1 = await prisma.device.upsert({
    where: { device_id: 'FP001' },
    update: {
      last_sync: new Date(),
    },
    create: {
      device_id: 'FP001',
      nama: 'Fingerprint Scanner - Kantor Pusat',
      tipe: 'Fingerprint',
      cabang_id: cabang1.id,
      ip_address: '192.168.1.100',
      port: 4370,
      status: 'aktif',
      lokasi: 'Lantai 1 - Lobby',
      last_sync: new Date(),
      firmware_version: 'v2.1.5',
    },
  })

  const device2 = await prisma.device.upsert({
    where: { device_id: 'FP002' },
    update: {
      last_sync: new Date(Date.now() - 3600000),
    },
    create: {
      device_id: 'FP002',
      nama: 'Fingerprint Scanner - Cabang Bandung',
      tipe: 'Fingerprint',
      cabang_id: cabang2.id,
      ip_address: '192.168.1.101',
      port: 4370,
      status: 'aktif',
      lokasi: 'Lantai 2 - HR Department',
      last_sync: new Date(Date.now() - 3600000), // 1 hour ago
      firmware_version: 'v2.1.3',
    },
  })

  // Create Device Status Logs
  await prisma.deviceStatusLog.create({
    data: {
      device_id: device1.id,
      status: 'online',
      firmware_version: 'v2.1.5',
      employee_count: 150,
      storage_usage: 65,
    },
  })

  await prisma.deviceStatusLog.create({
    data: {
      device_id: device2.id,
      status: 'error',
      firmware_version: 'v2.1.3',
      employee_count: 75,
      storage_usage: 85,
      error_message: 'Network connection timeout. Device tidak dapat terhubung ke server.',
    },
  })

  // Create Sample Attendance Data
  const today = new Date()
  today.setHours(8, 0, 0, 0) // Set to 8 AM today

  await prisma.fingerprintAttendance.create({
    data: {
      device_user_id: adminUser.device_user_id!,
      device_id: device1.device_id,
      attendance_time: today,
      attendance_type: 1,
      verification_type: 'fingerprint',
      user_id: adminUser.id,
      cabang_id: cabang1.id,
      is_processed: true,
      processing_status: 'completed',
      created_at: today,
      updated_at: today,
    },
  })

  await prisma.fingerprintAttendance.create({
    data: {
      device_user_id: managerUser.device_user_id!,
      device_id: device1.device_id,
      attendance_time: new Date(today.getTime() + 30 * 60000), // 30 minutes later
      attendance_type: 1,
      verification_type: 'fingerprint',
      user_id: managerUser.id,
      cabang_id: cabang1.id,
      is_processed: true,
      processing_status: 'completed',
      created_at: new Date(today.getTime() + 30 * 60000),
      updated_at: new Date(today.getTime() + 30 * 60000),
    },
  })

  await prisma.fingerprintAttendance.create({
    data: {
      device_user_id: staffUser.device_user_id!,
      device_id: device2.device_id,
      attendance_time: new Date(today.getTime() + 45 * 60000), // 45 minutes later
      attendance_type: 1,
      verification_type: 'fingerprint',
      user_id: staffUser.id,
      cabang_id: cabang2.id,
      is_processed: true,
      processing_status: 'completed',
      created_at: new Date(today.getTime() + 45 * 60000),
      updated_at: new Date(today.getTime() + 45 * 60000),
    },
  })

  console.log('Seed data created successfully!')
  console.log('Users created:')
  console.log('- Admin:', adminUser.nama_pegawai, '(password: password)')
  console.log('- Manager:', managerUser.nama_pegawai, '(password: password)')
  console.log('- Staff:', staffUser.nama_pegawai, '(password: password)')
  console.log('Devices created:')
  console.log('- Device 1:', device1.nama, '(Status: Online)')
  console.log('- Device 2:', device2.nama, '(Status: Error)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })