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
