<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('fingerprint_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('fingerprint_devices')->onDelete('cascade');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->string('device_user_id')->comment('ID user di fingerprint device');
            $table->timestamp('attendance_time');
            $table->tinyInteger('attendance_type')->comment('0=check_in, 1=check_out');
            $table->tinyInteger('verification_type')->default(1)->comment('1=fingerprint, 2=password, 3=card');
            $table->string('work_code')->nullable();
            $table->json('raw_data')->nullable()->comment('Data mentah dari device');
            $table->enum('status', ['pending', 'processed', 'failed'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['device_user_id']);
            $table->index(['attendance_time']);
            $table->index(['attendance_type']);
            $table->index(['status']);
            $table->index(['device_id', 'attendance_time']);
            $table->index(['employee_id', 'attendance_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fingerprint_attendances');
    }
};