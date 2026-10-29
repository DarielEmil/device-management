-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL,
    `first_name` VARCHAR(80) NOT NULL,
    `last_name` VARCHAR(80) NOT NULL,
    `national_id` VARCHAR(20) NOT NULL,
    `department` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ux_employees_national_id`(`national_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `brand` VARCHAR(60) NULL,
    `model` VARCHAR(60) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Disponible',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ux_devices_code`(`code`),
    INDEX `ix_devices_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NOT NULL,
    `device_id` CHAR(36) NOT NULL,
    `registered_by_id` CHAR(36) NOT NULL,
    `returned_by_id` CHAR(36) NULL,
    `loan_date` DATE NOT NULL,
    `expected_return_date` DATE NOT NULL,
    `actual_return_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `notes` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ix_loans_status_expected_return`(`status`, `expected_return_date`),
    INDEX `ix_loans_employee`(`employee_id`),
    INDEX `ix_loans_device`(`device_id`),
    INDEX `ix_loans_registered_by`(`registered_by_id`),
    INDEX `ix_loans_returned_by`(`returned_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `employee_id` CHAR(36) NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `role` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Activo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ux_users_employee`(`employee_id`),
    UNIQUE INDEX `ux_users_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `last_activity_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `ix_sessions_user`(`user_id`),
    INDEX `ix_sessions_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loans_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loans_device` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loans_registered_by` FOREIGN KEY (`registered_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loans_returned_by` FOREIGN KEY (`returned_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------------
-- SQL manual: Prisma no modela CHECK ni columnas generadas (ver README).
-- ---------------------------------------------------------------------------

-- Estados y roles: valores en español, el contrato con el frontend.
ALTER TABLE `devices`
    ADD CONSTRAINT `ck_devices_status` CHECK (`status` IN ('Disponible', 'Prestado'));

ALTER TABLE `users`
    ADD CONSTRAINT `ck_users_role` CHECK (`role` IN ('Encargado', 'Empleado')),
    ADD CONSTRAINT `ck_users_status` CHECK (`status` IN ('Activo', 'Inactivo', 'Invitado'));

ALTER TABLE `loans`
    ADD CONSTRAINT `ck_loans_status` CHECK (`status` IN ('Activo', 'Devuelto')),
    ADD CONSTRAINT `ck_loans_expected_return_date` CHECK (`expected_return_date` >= `loan_date`),
    ADD CONSTRAINT `ck_loans_actual_return_date` CHECK (`actual_return_date` IS NULL OR `actual_return_date` >= `loan_date`),
    -- 'Devuelto' si y solo si hay fecha real de devolución.
    ADD CONSTRAINT `ck_loans_returned_state` CHECK ((`status` = 'Devuelto') = (`actual_return_date` IS NOT NULL));

-- Un solo préstamo activo por equipo. MySQL no tiene índices únicos parciales
-- (WHERE status = 'Activo'): la columna vale device_id solo mientras el préstamo
-- está Activo y NULL después, y UNIQUE admite varios NULL.
ALTER TABLE `loans`
    ADD COLUMN `active_device_id` CHAR(36)
        GENERATED ALWAYS AS (CASE WHEN `status` = 'Activo' THEN `device_id` END) VIRTUAL,
    ADD UNIQUE INDEX `ux_loans_device_active` (`active_device_id`);
