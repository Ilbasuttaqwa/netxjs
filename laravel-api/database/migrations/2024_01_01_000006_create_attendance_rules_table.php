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
        Schema::create('attendance_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['deduction', 'allowance', 'overtime']);
            $table->enum('category', ['attendance', 'late', 'early_departure', 'overtime', 'absence']);
            $table->enum('calculation_method', ['fixed', 'percentage', 'hourly', 'daily']);
            $table->decimal('amount', 10, 2)->default(0);
            $table->json('conditions')->nullable()->comment('Kondisi untuk penerapan rule');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['type']);
            $table->index(['category']);
            $table->index(['is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_rules');
    }
};