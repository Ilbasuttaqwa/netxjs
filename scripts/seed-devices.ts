import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDevices() {
  try {
    // Create sample branches if they don't exist
    const branch1 = await prisma.cabang.upsert({
      where: { kode_cabang: 'HQ001' },
      update: {},
      create: {
        kode_cabang: 'HQ001',
        nama_cabang: 'Head Office',
        alamat_cabang: 'Jakarta Pusat',
        telepon_cabang: '021-1234567',
        email_cabang: 'hq@company.com'
      }
    });

    const branch2 = await prisma.cabang.upsert({
      where: { kode_cabang: 'BR001' },
      update: {},
      create: {
        kode_cabang: 'BR001',
        nama_cabang: 'Branch Office 1',
        alamat_cabang: 'Surabaya',
        telepon_cabang: '031-1234567',
        email_cabang: 'branch1@company.com'
      }
    });

    // Create sample devices
    const devices = [
      {
        device_id: 'FP001',
        nama: 'Fingerprint Scanner - Main Entrance',
        tipe: 'ZKTeco F18',
        cabang_id: branch1.id,
        ip_address: '192.168.1.100',
        port: 4370,
        status: 'online',
        lokasi: 'Main Entrance',
        keterangan: 'Primary entrance scanner',
        last_sync: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        firmware_version: 'v2.4.1'
      },
      {
        device_id: 'FP002',
        nama: 'Fingerprint Scanner - Back Office',
        tipe: 'ZKTeco F19',
        cabang_id: branch1.id,
        ip_address: '192.168.1.101',
        port: 4370,
        status: 'offline',
        lokasi: 'Back Office',
        keterangan: 'Back office scanner',
        last_sync: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        firmware_version: 'v2.4.0'
      },
      {
        device_id: 'FP003',
        nama: 'Fingerprint Scanner - Branch 1',
        tipe: 'ZKTeco F18',
        cabang_id: branch2.id,
        ip_address: '192.168.2.100',
        port: 4370,
        status: 'online',
        lokasi: 'Branch Main Door',
        keterangan: 'Branch office main scanner',
        last_sync: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        firmware_version: 'v2.4.1'
      },
      {
        device_id: 'FP004',
        nama: 'Fingerprint Scanner - Warehouse',
        tipe: 'ZKTeco F20',
        cabang_id: branch1.id,
        ip_address: '192.168.1.102',
        port: 4370,
        status: 'error',
        lokasi: 'Warehouse',
        keterangan: 'Warehouse entrance scanner',
        last_sync: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        firmware_version: 'v2.3.9'
      }
    ];

    for (const deviceData of devices) {
      const device = await prisma.device.upsert({
        where: { device_id: deviceData.device_id },
        update: deviceData,
        create: deviceData
      });

      // Create sample status logs
      await prisma.deviceStatusLog.create({
        data: {
          device_id: device.id,
          status: deviceData.status,
          firmware_version: deviceData.firmware_version,
          employee_count: Math.floor(Math.random() * 100) + 50,
          storage_usage: Math.floor(Math.random() * 80) + 10,
          error_message: deviceData.status === 'error' ? 'Connection timeout' : null,
          timestamp: new Date()
        }
      });

      console.log(`✅ Created device: ${device.nama} (${deviceData.device_id})`);
    }

    console.log('✅ Sample devices and data created successfully!');
    console.log(`Created ${devices.length} devices with sample data`);
    
  } catch (error) {
    console.error('❌ Error seeding devices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDevices();