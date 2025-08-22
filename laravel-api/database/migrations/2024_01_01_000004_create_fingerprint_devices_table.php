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
        Schema::create('fingerprint_devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_id')->unique();
            $table->string('name');
            $table->string('ip_address');
            $table->integer('port')->default(4370);
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->string('location')->nullable();
            $table->enum('status', ['online', 'offline', 'error'])->default('offline');
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamp('last_ping_at')->nullable();
            $table->json('sync_info')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['device_id']);
            $table->index(['ip_address']);
            $table->index(['status']);
            $table->index(['is_active']);
            $table->index(['last_sync_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fingerprint_devices');
    }
};