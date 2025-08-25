-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama_pegawai" TEXT NOT NULL,
    "tempat_lahir" TEXT,
    "tanggal_lahir" DATETIME,
    "jenis_kelamin" TEXT,
    "alamat" TEXT,
    "tanggal_masuk" DATETIME,
    "gaji" INTEGER DEFAULT 0,
    "status_pegawai" BOOLEAN DEFAULT false,
    "password" TEXT NOT NULL,
    "remember_token" TEXT,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    "role" TEXT DEFAULT 'user',
    "id_jabatan" INTEGER,
    "id_cabang" INTEGER,
    "jam_istirahat_mulai" DATETIME,
    "jam_istirahat_selesai" DATETIME,
    "device_user_id" TEXT,
    CONSTRAINT "users_id_cabang_fkey" FOREIGN KEY ("id_cabang") REFERENCES "cabang" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "users_id_jabatan_fkey" FOREIGN KEY ("id_jabatan") REFERENCES "jabatans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jabatans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama_jabatan" TEXT NOT NULL,
    "jam_masuk" DATETIME,
    "jam_masuk_siang" DATETIME,
    "jatah_libur_per_bulan" INTEGER NOT NULL DEFAULT 2,
    "denda_per_hari_libur" REAL NOT NULL DEFAULT 50000.00,
    "bonus_tidak_libur" REAL NOT NULL DEFAULT 25000.00,
    "gaji_pokok" REAL,
    "created_at" DATETIME,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "cabang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama_cabang" TEXT NOT NULL,
    "alamat_cabang" TEXT,
    "telepon_cabang" TEXT,
    "kode_cabang" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "absensis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_user" INTEGER NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "jam_masuk" DATETIME,
    "jam_keluar" DATETIME,
    "jam_istirahat_mulai" DATETIME,
    "jam_istirahat_selesai" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'hadir',
    "keterangan" TEXT,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    "id_cabang" INTEGER,
    CONSTRAINT "absensis_id_cabang_fkey" FOREIGN KEY ("id_cabang") REFERENCES "cabang" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "absensis_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fingerprint_attendances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "device_user_id" TEXT,
    "cabang_id" INTEGER,
    "device_id" TEXT,
    "attendance_time" DATETIME NOT NULL,
    "attendance_type" INTEGER NOT NULL DEFAULT 1,
    "verification_type" TEXT,
    "fingerprint_id" TEXT,
    "device_ip" TEXT,
    "device_name" TEXT,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processing_status" TEXT DEFAULT 'pending',
    "sync_batch_id" TEXT,
    "is_realtime" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "fingerprint_attendances_cabang_id_fkey" FOREIGN KEY ("cabang_id") REFERENCES "cabang" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fingerprint_attendances_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("device_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fingerprint_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "metadata" TEXT,
    "version" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT
);

-- CreateTable
CREATE TABLE "read_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "requestHash" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "attendance_deduplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fingerprintHash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ruleId" TEXT,
    "appliedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payrollId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "device_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "cabang_id" INTEGER NOT NULL,
    "ip_address" TEXT,
    "port" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "lokasi" TEXT,
    "keterangan" TEXT,
    "last_sync" DATETIME,
    "firmware_version" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "devices_cabang_id_fkey" FOREIGN KEY ("cabang_id") REFERENCES "cabang" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "device_status_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "device_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "firmware_version" TEXT,
    "error_message" TEXT,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "storage_usage" INTEGER NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_status_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fingerprint_backups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "device_id" INTEGER NOT NULL,
    "backup_name" TEXT NOT NULL,
    "backup_data" TEXT NOT NULL,
    "template_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fingerprint_backups_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fingerprint_backups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fingerprint_restores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "backup_id" INTEGER NOT NULL,
    "target_device_id" INTEGER NOT NULL,
    "restored_template_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "restore_data" TEXT,
    "restored_by" INTEGER NOT NULL,
    "restored_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fingerprint_restores_backup_id_fkey" FOREIGN KEY ("backup_id") REFERENCES "fingerprint_backups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fingerprint_restores_target_device_id_fkey" FOREIGN KEY ("target_device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fingerprint_restores_restored_by_fkey" FOREIGN KEY ("restored_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE INDEX "fingerprint_backups_device_index" ON "fingerprint_backups"("device_id");

-- CreateIndex
CREATE INDEX "fingerprint_backups_created_index" ON "fingerprint_backups"("created_at");

-- CreateIndex
CREATE INDEX "fingerprint_restores_backup_index" ON "fingerprint_restores"("backup_id");

-- CreateIndex
CREATE INDEX "fingerprint_restores_device_index" ON "fingerprint_restores"("target_device_id");

-- CreateIndex
CREATE INDEX "fingerprint_restores_restored_index" ON "fingerprint_restores"("restored_at");
