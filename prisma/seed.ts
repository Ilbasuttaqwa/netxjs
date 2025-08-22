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
      email_cabang: 'pusat@afms.com',
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
      email_cabang: 'bandung@afms.com',
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
      email: 'admin@afms.com',
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
      email: 'manager@afms.com',
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
      email: 'staff@afms.com',
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

  console.log('Seed data created successfully!')
  console.log('Users created:')
  console.log('- Admin:', adminUser.email, '(password: password)')
  console.log('- Manager:', managerUser.email, '(password: password)')
  console.log('- Staff:', staffUser.email, '(password: password)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })