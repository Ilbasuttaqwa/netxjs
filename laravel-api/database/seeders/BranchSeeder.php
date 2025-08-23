<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = [
            [
                'name' => 'Kantor Pusat',
                'address' => 'Jl. Sudirman No. 123, Jakarta Pusat',
                'phone' => '021-12345678',
                'email' => 'pusat@afms.com',
                'code' => 'HQ001',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Cabang Jakarta Selatan',
                'address' => 'Jl. Gatot Subroto No. 456, Jakarta Selatan',
                'phone' => '021-87654321',
                'email' => 'jaksel@afms.com',
                'code' => 'JKS001',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Cabang Bandung',
                'address' => 'Jl. Asia Afrika No. 789, Bandung',
                'phone' => '022-11223344',
                'email' => 'bandung@afms.com',
                'code' => 'BDG001',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('branches')->insert($branches);
    }
}