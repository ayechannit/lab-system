-- Conversation History and Notification Schema
-- This schema defines the database structure for AI conversations and system-wide notifications.

-- ==========================================================
-- 0. END-USER ROLE / EMAIL REMOVAL (users table simplification)
-- ==========================================================
-- The end-user role concept, email identity, license numbers, and staff-approval
-- gating have been removed system-wide. Login/signup now use phone only.
-- These guarded blocks defensively drop the old columns (and their constraints)
-- from a DB that may have already run the old base schema.sql, and add the
-- UNIQUE(phone) constraint that replaces email as the user identifier.

-- Drop any CHECK constraint on users.role, then drop the column, if present
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'role')
BEGIN
    DECLARE @ck_role NVARCHAR(200);
    SELECT @ck_role = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE cc.parent_object_id = OBJECT_ID(N'[dbo].[users]') AND c.name = N'role';

    IF @ck_role IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.users DROP CONSTRAINT [' + @ck_role + ']');
    END

    ALTER TABLE dbo.users DROP COLUMN role;
END

-- Drop any UNIQUE constraint/index on users.email, then drop the column, if present
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'email')
BEGIN
    DECLARE @uq_email NVARCHAR(200);
    SELECT @uq_email = i.name
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'[dbo].[users]') AND i.is_unique_constraint = 1 AND c.name = N'email';

    IF @uq_email IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.users DROP CONSTRAINT [' + @uq_email + ']');
    END

    ALTER TABLE dbo.users DROP COLUMN email;
END

-- Drop any CHECK constraint on users.license_number (none expected, but check defensively), then drop the column, if present
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'license_number')
BEGIN
    DECLARE @ck_license NVARCHAR(200);
    SELECT @ck_license = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE cc.parent_object_id = OBJECT_ID(N'[dbo].[users]') AND c.name = N'license_number';

    IF @ck_license IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.users DROP CONSTRAINT [' + @ck_license + ']');
    END

    ALTER TABLE dbo.users DROP COLUMN license_number;
END

-- Drop any CHECK/DEFAULT constraint on users.is_approved, then drop the column, if present
-- (is_approved BIT DEFAULT 1 has a system-named DEFAULT constraint that SQL Server
-- requires to be dropped before the column itself can be dropped.)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'is_approved')
BEGIN
    DECLARE @ck_approved NVARCHAR(200);
    SELECT @ck_approved = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE cc.parent_object_id = OBJECT_ID(N'[dbo].[users]') AND c.name = N'is_approved';

    IF @ck_approved IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.users DROP CONSTRAINT [' + @ck_approved + ']');
    END

    DECLARE @df_approved NVARCHAR(200);
    SELECT @df_approved = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_column_id = c.column_id AND dc.parent_object_id = c.object_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[dbo].[users]') AND c.name = N'is_approved';

    IF @df_approved IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.users DROP CONSTRAINT [' + @df_approved + ']');
    END

    ALTER TABLE dbo.users DROP COLUMN is_approved;
END

-- Add UNIQUE(phone) index, now that phone is the sole user identifier. Filtered to
-- active rows only (WHERE is_deleted = 0), since a plain unique constraint would
-- permanently block a phone number from being reused once its old account is
-- soft-deleted.
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'UQ_users_phone' AND object_id = OBJECT_ID(N'[dbo].[users]'))
BEGIN
    CREATE UNIQUE INDEX UQ_users_phone ON dbo.users(phone) WHERE is_deleted = 0;
END

-- ==========================================================
-- 1. CONVERSATION HISTORY TABLES
-- ==========================================================

-- Create conversation_history table to store user messages and AI responses as pairs
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[conversation_history]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.conversation_history (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        user_message NVARCHAR(MAX) NOT NULL,
        ai_response NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        is_deleted BIT DEFAULT 0
    );
END

-- Create index on conversation_history(user_id) for faster retrieval of a user's chat history
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_ConversationHistory_UserId' AND object_id = OBJECT_ID(N'[dbo].[conversation_history]'))
BEGIN
    CREATE INDEX IX_ConversationHistory_UserId ON dbo.conversation_history(user_id);
END


-- ==========================================================
-- 2. NOTIFICATION AND FCM DEVICE TOKEN TABLES & ALTERS
-- ==========================================================

-- Add fcm_token column to users table if it does not exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'fcm_token')
BEGIN
    ALTER TABLE dbo.users ADD fcm_token NVARCHAR(500) NULL;
END

-- Add fcm_token column to lab_staff table if it does not exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[lab_staff]') AND name = N'fcm_token')
BEGIN
    ALTER TABLE dbo.lab_staff ADD fcm_token NVARCHAR(500) NULL;
END

-- Add profile_image_url column to lab_staff table if it does not exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[lab_staff]') AND name = N'profile_image_url')
BEGIN
    ALTER TABLE dbo.lab_staff ADD profile_image_url NVARCHAR(500) NULL;
END

-- Create notifications table to store notification inbox history for users and staff
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notifications]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.notifications (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        user_type NVARCHAR(50) NOT NULL DEFAULT 'user', -- 'user' or 'staff'
        title NVARCHAR(255) NOT NULL,
        body NVARCHAR(MAX) NOT NULL,
        data_payload NVARCHAR(MAX) NULL, -- JSON string for custom data payload
        is_read BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        is_deleted BIT DEFAULT 0
    );
END

-- Create index on notifications(user_id, is_read) for faster queries of unread messages for a user
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Notifications_UserId_IsRead' AND object_id = OBJECT_ID(N'[dbo].[notifications]'))
BEGIN
    CREATE INDEX IX_Notifications_UserId_IsRead ON dbo.notifications(user_id, is_read);
END


-- ==========================================================
-- 3. POINT TRANSACTIONS TABLE
-- ==========================================================

-- Create point_transactions table to store loyalty points history
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[point_transactions]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.point_transactions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        points INT NOT NULL,
        transaction_type NVARCHAR(50) NOT NULL, -- 'earn', 'redeem', 'adjustment'
        description NVARCHAR(255) NULL,
        reference_id UNIQUEIDENTIFIER NULL, -- e.g. order_id or payment_id
        created_at DATETIME2 DEFAULT GETDATE(),
        created_user UNIQUEIDENTIFIER NULL
    );
END

-- Create index on point_transactions(user_id) for faster retrieval of points history
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_PointTransactions_UserId' AND object_id = OBJECT_ID(N'[dbo].[point_transactions]'))
BEGIN
    CREATE INDEX IX_PointTransactions_UserId ON dbo.point_transactions(user_id);
END

-- Password self-service reset (100% email-based) has been removed; end users now
-- contact an administrator to reset, same as staff. Drop the table (and its index
-- along with it) if a prior deploy created it.
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[password_resets]') AND type in (N'U'))
BEGIN
    DROP TABLE dbo.password_resets;
END

-- Lab order item result PDF grouping (shared vs separate display)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[lab_order_items]') AND name = N'result_pdf_group_id')
BEGIN
    ALTER TABLE dbo.lab_order_items ADD result_pdf_group_id UNIQUEIDENTIFIER NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[lab_order_items]') AND name = N'result_pdf_display_solo')
BEGIN
    ALTER TABLE dbo.lab_order_items ADD result_pdf_display_solo BIT NOT NULL DEFAULT 0;
END

-- Create test_specific_discounts table if it does not exist (new no-role shape: a flat
-- per-test discount, one row per test_id).
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[test_specific_discounts]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.test_specific_discounts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        test_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_test_catalog(id),
        discount_percent DECIMAL(5, 2) NOT NULL,
        is_active BIT DEFAULT 1,
        start_date DATETIME2 NULL,
        end_date DATETIME2 NULL,
        created_user UNIQUEIDENTIFIER,
        updated_user UNIQUEIDENTIFIER,
        is_deleted BIT DEFAULT 0, -- Soft Delete
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_Test_Discount UNIQUE (test_id)
    );
END

-- Migrate an existing test_specific_discounts table (created by a prior deploy with the
-- old role-keyed shape) to the new no-role shape: drop the old UQ_Test_Discount_Role
-- constraint (looked up dynamically, since SQL Server may have auto-named it),
-- drop the role column, then add the new UQ_Test_Discount(test_id) constraint.
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[test_specific_discounts]') AND name = N'role')
BEGIN
    DECLARE @uq_discount_role NVARCHAR(200);
    SELECT @uq_discount_role = kc.name
    FROM sys.key_constraints kc
    JOIN sys.indexes i ON i.object_id = kc.parent_object_id AND i.index_id = kc.unique_index_id
    WHERE kc.parent_object_id = OBJECT_ID(N'[dbo].[test_specific_discounts]') AND kc.type = 'UQ'
      AND EXISTS (
          SELECT 1 FROM sys.index_columns ic
          JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND c.name = N'role'
      );

    IF @uq_discount_role IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.test_specific_discounts DROP CONSTRAINT [' + @uq_discount_role + ']');
    END

    -- Also drop the CHECK constraint on the role column, if present
    DECLARE @ck_discount_role NVARCHAR(200);
    SELECT @ck_discount_role = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE cc.parent_object_id = OBJECT_ID(N'[dbo].[test_specific_discounts]') AND c.name = N'role';

    IF @ck_discount_role IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.test_specific_discounts DROP CONSTRAINT [' + @ck_discount_role + ']');
    END

    ALTER TABLE dbo.test_specific_discounts DROP COLUMN role;
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'UQ_Test_Discount' AND object_id = OBJECT_ID(N'[dbo].[test_specific_discounts]'))
BEGIN
    ALTER TABLE dbo.test_specific_discounts ADD CONSTRAINT UQ_Test_Discount UNIQUE (test_id);
END

-- Create test_referral_fees table if it does not exist (new no-role shape: a flat
-- per-test referral fee, one row per test_id).
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[test_referral_fees]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.test_referral_fees (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        test_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_test_catalog(id),
        referral_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_user UNIQUEIDENTIFIER,
        updated_user UNIQUEIDENTIFIER,
        is_deleted BIT DEFAULT 0, -- Soft Delete
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_Referral_Test UNIQUE (test_id)
    );
END

-- Migrate an existing test_referral_fees table (created by a prior deploy with the
-- old role-keyed shape) to the new no-role shape: drop the old UQ_Referral_Test_Role
-- constraint (looked up dynamically, since SQL Server may have auto-named it),
-- drop the role column, then add the new UQ_Referral_Test(test_id) constraint.
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[test_referral_fees]') AND name = N'role')
BEGIN
    DECLARE @uq_referral_role NVARCHAR(200);
    SELECT @uq_referral_role = kc.name
    FROM sys.key_constraints kc
    JOIN sys.indexes i ON i.object_id = kc.parent_object_id AND i.index_id = kc.unique_index_id
    WHERE kc.parent_object_id = OBJECT_ID(N'[dbo].[test_referral_fees]') AND kc.type = 'UQ'
      AND EXISTS (
          SELECT 1 FROM sys.index_columns ic
          JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND c.name = N'role'
      );

    IF @uq_referral_role IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.test_referral_fees DROP CONSTRAINT [' + @uq_referral_role + ']');
    END

    -- Also drop the CHECK constraint on the role column, if present
    DECLARE @ck_referral_role NVARCHAR(200);
    SELECT @ck_referral_role = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
    WHERE cc.parent_object_id = OBJECT_ID(N'[dbo].[test_referral_fees]') AND c.name = N'role';

    IF @ck_referral_role IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE dbo.test_referral_fees DROP CONSTRAINT [' + @ck_referral_role + ']');
    END

    ALTER TABLE dbo.test_referral_fees DROP COLUMN role;
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'UQ_Referral_Test' AND object_id = OBJECT_ID(N'[dbo].[test_referral_fees]'))
BEGIN
    ALTER TABLE dbo.test_referral_fees ADD CONSTRAINT UQ_Referral_Test UNIQUE (test_id);
END

-- Add collector_id column to lab_orders table if it does not exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[lab_orders]') AND name = N'collector_id')
BEGIN
    ALTER TABLE dbo.lab_orders ADD collector_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES lab_staff(id);
END

-- Create advertisements table if it does not exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[advertisements]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.advertisements (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        image_url NVARCHAR(2048),
        start_date DATETIME2,
        end_date DATETIME2,
        is_active BIT DEFAULT 1,
        created_user UNIQUEIDENTIFIER,
        updated_user UNIQUEIDENTIFIER,
        is_deleted BIT DEFAULT 0, -- Soft Delete
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[advertisements]') AND name = N'action_url')
BEGIN
    ALTER TABLE dbo.advertisements DROP COLUMN action_url;
END

-- ==========================================================
-- 6. UI LOCALE (shared admin web + mobile app language)
-- ==========================================================

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[theme_settings]') AND name = N'ui_locale')
BEGIN
    ALTER TABLE dbo.theme_settings ADD ui_locale NVARCHAR(5) NOT NULL CONSTRAINT DF_theme_settings_ui_locale DEFAULT 'my';
END

-- ==========================================================
-- 7. USER PROFILE IMAGE (mobile app / patient accounts)
-- ==========================================================

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'profile_image_url')
BEGIN
    ALTER TABLE dbo.users ADD profile_image_url NVARCHAR(500) NULL;
END

-- ==========================================================
-- 8. LOYALTY POINTS REDEMPTION (redeem points against order payments)
-- ==========================================================

-- Add points_redeemed / points_value_mmk columns to payments, to record how many
-- loyalty points (and their MMK value) were applied to a given payment
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[payments]') AND name = N'points_redeemed')
BEGIN
    ALTER TABLE dbo.payments ADD points_redeemed INT NOT NULL CONSTRAINT DF_payments_points_redeemed DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[payments]') AND name = N'points_value_mmk')
BEGIN
    ALTER TABLE dbo.payments ADD points_value_mmk DECIMAL(18, 2) NOT NULL CONSTRAINT DF_payments_points_value_mmk DEFAULT 0;
END

-- Create point_redemption_settings table (singleton: global "1 point = X MMK" rate),
-- seeded with a single default row atomically on first creation.
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[point_redemption_settings]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.point_redemption_settings (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        mmk_per_point DECIMAL(18, 2) NOT NULL DEFAULT 0,
        updated_user UNIQUEIDENTIFIER,
        updated_at DATETIME2 DEFAULT GETDATE()
    );

    INSERT INTO dbo.point_redemption_settings (mmk_per_point) VALUES (0);
END

-- Defensive seed: if the table already existed (e.g. created by a prior partial run)
-- but has no row yet, seed it now, so re-running this script is always safe.
IF NOT EXISTS (SELECT 1 FROM dbo.point_redemption_settings)
BEGIN
    INSERT INTO dbo.point_redemption_settings (mmk_per_point) VALUES (0);
END

-- ==========================================================
-- 9. MEMBERSHIP TIERS (customer tiering based on lifetime verified-payment spend)
-- ==========================================================
-- Customers are auto-classified into staff-configurable tiers (Normal/Silver/Gold/...)
-- based on their lifetime verified-payment spend. This is a new, separate running
-- total from reportModel.js's existing report spend metric.

-- Add the incrementally-maintained running-total column to users, mirroring total_points
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'total_spent_mmk')
BEGIN
    ALTER TABLE dbo.users ADD total_spent_mmk DECIMAL(18, 2) NOT NULL CONSTRAINT DF_users_total_spent_mmk DEFAULT 0;
END

-- Create membership_tiers table, seeded with starter tiers atomically on first creation.
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[membership_tiers]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.membership_tiers (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        min_spend_mmk DECIMAL(18, 2) NOT NULL DEFAULT 0,
        discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_user UNIQUEIDENTIFIER,
        updated_user UNIQUEIDENTIFIER,
        is_deleted BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );

    INSERT INTO dbo.membership_tiers (name, min_spend_mmk, discount_percent) VALUES
        ('Normal', 0, 0),
        ('Silver', 500000, 3),
        ('Gold', 2000000, 5);
END

-- Defensive seed: if the table already existed (e.g. created by a prior partial run)
-- but has no rows yet, seed it now, so re-running this script is always safe.
IF NOT EXISTS (SELECT 1 FROM dbo.membership_tiers)
BEGIN
    INSERT INTO dbo.membership_tiers (name, min_spend_mmk, discount_percent) VALUES
        ('Normal', 0, 0),
        ('Silver', 500000, 3),
        ('Gold', 2000000, 5);
END

