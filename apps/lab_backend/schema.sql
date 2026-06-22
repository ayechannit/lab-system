-- Conversation History and Notification Schema
-- This schema defines the database structure for AI conversations and system-wide notifications.

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

-- Create password_resets table to store short-lived password reset tokens
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[password_resets]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.password_resets (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL,
        token NVARCHAR(100) NOT NULL,
        user_type NVARCHAR(50) NOT NULL, -- 'user' or 'staff'
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
END

-- Create index on password_resets(email, token) for faster verification
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_PasswordResets_Email_Token' AND object_id = OBJECT_ID(N'[dbo].[password_resets]'))
BEGIN
    CREATE INDEX IX_PasswordResets_Email_Token ON dbo.password_resets(email, token);
END

