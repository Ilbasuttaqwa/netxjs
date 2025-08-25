import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('Mulai menghapus data...');
    
    // Hapus semua data User (akan menghapus data terkait karena cascade)
    console.log('Menghapus semua data pengguna...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`Berhasil menghapus ${deletedUsers.count} pengguna`);
    
    // Hapus semua data Jabatan
    console.log('Menghapus semua data jabatan...');
    const deletedJabatan = await prisma.jabatan.deleteMany({});
    console.log(`Berhasil menghapus ${deletedJabatan.count} jabatan`);
    
    // Hapus semua data Cabang (akan menghapus data terkait karena cascade)
    console.log('Menghapus semua data cabang...');
    const deletedCabang = await prisma.cabang.deleteMany({});
    console.log(`Berhasil menghapus ${deletedCabang.count} cabang`);
    
    console.log('Semua data berhasil dihapus!');
    
  } catch (error) {
    console.error('Error saat menghapus data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();