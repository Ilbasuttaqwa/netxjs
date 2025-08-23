-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "nama_pegawai" VARCHAR(255) NOT NULL,
    "tempat_lahir" VARCHAR(255),
    "tanggal_lahir" DATE,
    "jenis_kelamin" VARCHAR(255),
    "alamat" TEXT,
    "tanggal_masuk" DATE,
    "gaji" INTEGER DEFAULT 0,
    "status_pegawai" BOOLEAN DEFAULT false,
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMP(6),
    "password" VARCHAR(255) NOT NULL,
    "remember_token" VARCHAR(100),
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),
    "role" VARCHAR(50) DEFAULT 'user',
    "id_jabatan" BIGINT,
    "id_cabang" BIGINT,
    "jam_istirahat_mulai" TIME(6),
    "jam_istirahat_selesai" TIME(6),
    "device_user_id" VARCHAR(50),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jabatans" (
    "id" BIGSERIAL NOT NULL,
    "nama_jabatan" VARCHAR(255) NOT NULL,
    "jam_masuk" TIME(6),
    "jam_masuk_siang" TIME(6),
    "jatah_libur_per_bulan" INTEGER NOT NULL DEFAULT 2,
    "denda_per_hari_libur" DECIMAL(10,2) NOT NULL DEFAULT 50000.00,
    "bonus_tidak_libur" DECIMAL(10,2) NOT NULL DEFAULT 25000.00,
    "gaji_pokok" DECIMAL(15,2),
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "jabatans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabang" (
    "id" BIGSERIAL NOT NULL,
    "nama_cabang" VARCHAR(255) NOT NULL,
    "alamat_cabang" TEXT,
    "telepon_cabang" VARCHAR(20),
    "email_cabang" VARCHAR(255),
    "kode_cabang" VARCHAR(10) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "cabang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensis" (
    "id" BIGSERIAL NOT NULL,
    "id_user" BIGINT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jam_masuk" TIME(6),
    "jam_keluar" TIME(6),
    "jam_istirahat_mulai" TIME(6),
    "jam_istirahat_selesai" TIME(6),
    "status" VARCHAR(50) NOT NULL DEFAULT 'hadir',
    "keterangan" TEXT,
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),
    "id_cabang" BIGINT,

    CONSTRAINT "absensis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fingerprint_attendances" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "device_user_id" VARCHAR(50),
    "cabang_id" BIGINT,
    "device_id" VARCHAR(100),
    "attendance_time" TIMESTAMP(6) NOT NULL,
    "attendance_type" INTEGER NOT NULL DEFAULT 1,
    "verification_type" VARCHAR(50),
    "fingerprint_id" VARCHAR(50),
    "device_ip" VARCHAR(45),
    "device_name" VARCHAR(100),
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processing_status" VARCHAR(50) DEFAULT 'pending',
    "sync_batch_id" VARCHAR(100),
    "is_realtime" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "fingerprint_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(255) NOT NULL,
    "aggregateId" VARCHAR(255) NOT NULL,
    "aggregateType" VARCHAR(255) NOT NULL,
    "eventData" JSONB NOT NULL,
    "metadata" JSONB,
    "version" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" VARCHAR(255),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_models" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "read_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(255) NOT NULL,
    "requestHash" VARCHAR(255) NOT NULL,
    "response" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "attendance_deduplication" (
    "id" TEXT NOT NULL,
    "deviceId" VARCHAR(255) NOT NULL,
    "employeeId" VARCHAR(255) NOT NULL,
    "fingerprintHash" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_deduplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdBy" VARCHAR(255) NOT NULL,
    "updatedBy" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" TEXT NOT NULL,
    "employeeId" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "ruleId" VARCHAR(255),
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payrollId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" BIGSERIAL NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "tipe" VARCHAR(50) NOT NULL,
    "cabang_id" BIGINT NOT NULL,
    "ip_address" VARCHAR(45),
    "port" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'aktif',
    "lokasi" VARCHAR(255),
    "keterangan" TEXT,
    "last_sync" TIMESTAMP(3),
    "firmware_version" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_status_logs" (
    "id" BIGSERIAL NOT NULL,
    "device_id" BIGINT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "firmware_version" VARCHAR(100),
    "error_message" TEXT,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "storage_usage" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role_cabang" ON "users"("role", "id_cabang");

-- CreateIndex
CREATE INDEX "idx_users_device_id" ON "users"("device_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cabang_kode_cabang_key" ON "cabang"("kode_cabang");

-- CreateIndex
CREATE INDEX "idx_absensi_user_tanggal" ON "absensis"("id_user", "tanggal");

-- CreateIndex
CREATE INDEX "idx_absensi_tanggal" ON "absensis"("tanggal");

-- CreateIndex
CREATE INDEX "idx_absensi_status" ON "absensis"("status");

-- CreateIndex
CREATE INDEX "fingerprint_attendances_device_user_id_device_ip_index" ON "fingerprint_attendances"("device_user_id", "device_ip");

-- CreateIndex
CREATE INDEX "fingerprint_attendances_attendance_time_index" ON "fingerprint_attendances"("attendance_time");

-- CreateIndex
CREATE INDEX "fingerprint_attendances_is_processed_index" ON "fingerprint_attendances"("is_processed");

-- CreateIndex
CREATE INDEX "fingerprint_attendances_user_id_index" ON "fingerprint_attendances"("user_id");

-- CreateIndex
CREATE INDEX "fingerprint_attendances_device_id_index" ON "fingerprint_attendances"("device_id");

-- CreateIndex
CREATE INDEX "events_aggregate_id_version_index" ON "events"("aggregateId", "version");

-- CreateIndex
CREATE INDEX "events_event_type_index" ON "events"("eventType");

-- CreateIndex
CREATE INDEX "events_timestamp_index" ON "events"("timestamp");

-- CreateIndex
CREATE INDEX "read_models_type_index" ON "read_models"("type");

-- CreateIndex
CREATE UNIQUE INDEX "read_models_type_id_unique" ON "read_models"("type", "id");

-- CreateIndex
CREATE INDEX "idempotency_keys_status_index" ON "idempotency_keys"("status");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_index" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "attendance_dedup_device_employee_index" ON "attendance_deduplication"("deviceId", "employeeId");

-- CreateIndex
CREATE INDEX "attendance_dedup_timestamp_index" ON "attendance_deduplication"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_dedup_unique" ON "attendance_deduplication"("deviceId", "employeeId", "fingerprintHash", "timestamp");

-- CreateIndex
CREATE INDEX "business_rules_category_active_index" ON "business_rules"("category", "isActive");

-- CreateIndex
CREATE INDEX "business_rules_validity_index" ON "business_rules"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "business_rules_priority_index" ON "business_rules"("priority");

-- CreateIndex
CREATE INDEX "payroll_deductions_employee_index" ON "payroll_deductions"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_deductions_date_index" ON "payroll_deductions"("appliedDate");

-- CreateIndex
CREATE INDEX "payroll_deductions_rule_index" ON "payroll_deductions"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_id_key" ON "devices"("device_id");

-- CreateIndex
CREATE INDEX "devices_device_id_index" ON "devices"("device_id");

-- CreateIndex
CREATE INDEX "devices_cabang_id_index" ON "devices"("cabang_id");

-- CreateIndex
CREATE INDEX "devices_status_index" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_tipe_index" ON "devices"("tipe");

-- CreateIndex
CREATE INDEX "device_status_logs_device_timestamp_index" ON "device_status_logs"("device_id", "timestamp");

-- CreateIndex
CREATE INDEX "device_status_logs_status_index" ON "device_status_logs"("status");

-- CreateIndex
CREATE INDEX "device_status_logs_timestamp_index" ON "device_status_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_id_jabatan_fkey" FOREIGN KEY ("id_jabatan") REFERENCES "jabatans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_id_cabang_fkey" FOREIGN KEY ("id_cabang") REFERENCES "cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensis" ADD CONSTRAINT "absensis_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensis" ADD CONSTRAINT "absensis_id_cabang_fkey" FOREIGN KEY ("id_cabang") REFERENCES "cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fingerprint_attendances" ADD CONSTRAINT "fingerprint_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fingerprint_attendances" ADD CONSTRAINT "fingerprint_attendances_cabang_id_fkey" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fingerprint_attendances" ADD CONSTRAINT "fingerprint_attendances_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("device_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_cabang_id_fkey" FOREIGN KEY ("cabang_id") REFERENCES "cabang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_status_logs" ADD CONSTRAINT "device_status_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
