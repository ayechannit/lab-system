/*
=============================================================================
LAB SYSTEM - SQL SERVER DATABASE SCHEMA (SOFT DELETE ENABLED)
=============================================================================
Description: Optimized T-SQL script for MSSQL Server.
Features: 
- Proper Data Types (UniqueIdentifier for UUIDs)
- Primary and Foreign Key Constraints
- Check Constraints for "Enums"
- Strategic Indexing (Filtered for Soft Delete)
- Soft Delete Support (is_deleted BIT)
=============================================================================
*/

-- USERS
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    phone NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(MAX) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('clinic', 'doctor', 'patient', 'phlebotomist')),
    address NVARCHAR(MAX),
    latitude FLOAT,
    longitude FLOAT,
    total_points INT DEFAULT 0,
    license_number NVARCHAR(100) NULL,
    is_approved BIT DEFAULT 1,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- LAB STAFF
CREATE TABLE lab_staff (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(MAX) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'lab_technician', 'reception', 'manager', 'collector')),
    is_active BIT DEFAULT 1,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    profile_image_url NVARCHAR(500) NULL
);

-- LAB TEST CATALOG
CREATE TABLE lab_test_catalog (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_name NVARCHAR(255) NOT NULL,
    test_code NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    base_price_mmk DECIMAL(18, 2) NOT NULL,
    category NVARCHAR(100),
    is_package BIT DEFAULT 0,
    package_items NVARCHAR(MAX) NULL, -- JSON array of test IDs if this is a package
    is_active BIT DEFAULT 1,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- LAB ORDERS
CREATE TABLE lab_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES users(id),
    collector_id UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES lab_staff(id),
    description NVARCHAR(MAX),
    priority NVARCHAR(20) NOT NULL CHECK (priority IN ('urgent', 'elective')),
    patient_name NVARCHAR(255) NOT NULL,
    patient_age INT NOT NULL,
    patient_phone NVARCHAR(50) NOT NULL,
    address NVARCHAR(MAX) NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'collecting', 'running', 'completed', 'delivered')),
    original_price_mmk DECIMAL(18, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    final_price_mmk DECIMAL(18, 2) NOT NULL,
    report_delivery_method VARCHAR(20) NOT NULL,
    prescription_url NVARCHAR(2048),
    is_tests_assigned BIT DEFAULT 0,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- LAB ORDER ITEMS
CREATE TABLE lab_order_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_orders(id),
    test_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_test_catalog(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price_mmk DECIMAL(18, 2) NOT NULL,
    subtotal_mmk DECIMAL(18, 2) NOT NULL,
    result_file_url VARCHAR(500) NULL,
    result_pdf_group_id UNIQUEIDENTIFIER NULL,
    result_pdf_display_solo BIT NOT NULL DEFAULT 0,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Order_Test UNIQUE (order_id, test_id)
);

-- ORDER SCHEDULES
CREATE TABLE order_schedules (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES lab_orders(id),
    collecting_person NVARCHAR(255),
    collection_time DATETIME2,
    running_time DATETIME2,
    report_out_time DATETIME2,
    accepted_by_user BIT DEFAULT 0,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- ORDER STATUS LOGS
CREATE TABLE order_status_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_orders(id),
    changed_by UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_staff(id),
    old_status NVARCHAR(20),
    new_status NVARCHAR(20) NOT NULL,
    note NVARCHAR(MAX),
    created_user UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- PAYMENTS
CREATE TABLE payments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_orders(id),
    amount_mmk DECIMAL(18, 2) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'failed')),
    method NVARCHAR(20) CHECK (method IN ('cash', 'bank_transfer', 'mobile_pay')),
    reference_no NVARCHAR(255),
    verified_by UNIQUEIDENTIFIER FOREIGN KEY REFERENCES lab_staff(id),
    paid_at DATETIME2,
    verified_at DATETIME2,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- TEST SPECIFIC DISCOUNTS
CREATE TABLE test_specific_discounts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_test_catalog(id),
    role NVARCHAR(20) NOT NULL CHECK (role IN ('clinic', 'doctor', 'patient', 'phlebotomist')),
    discount_percent DECIMAL(5, 2) NOT NULL,
    is_active BIT DEFAULT 1,
    start_date DATETIME2 NULL,
    end_date DATETIME2 NULL,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Test_Role UNIQUE (test_id, role)
);

-- TEST SPECIFIC REFERRAL FEES
CREATE TABLE test_referral_fees (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_test_catalog(id),
    role NVARCHAR(20) NOT NULL CHECK (role IN ('clinic', 'doctor', 'patient', 'phlebotomist')),
    referral_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Referral_Test_Role UNIQUE (test_id, role)
);

-- ADVERTISEMENTS
CREATE TABLE advertisements (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    image_url NVARCHAR(2048),
    action_url NVARCHAR(2048),
    start_date DATETIME2,
    end_date DATETIME2,
    is_active BIT DEFAULT 1,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- LAB RESULTS
CREATE TABLE lab_results (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES lab_orders(id),
    result_summary NVARCHAR(MAX),
    pdf_url NVARCHAR(2048),
    uploaded_by UNIQUEIDENTIFIER FOREIGN KEY REFERENCES lab_staff(id),
    quality_checked BIT DEFAULT 0,
    sent_to_user_at DATETIME2,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- AI QUALITY CHECKS
CREATE TABLE ai_quality_checks (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    result_id UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES lab_results(id),
    verdict NVARCHAR(20) NOT NULL CHECK (verdict IN ('pass', 'warning', 'fail')),
    analysis_detail NVARCHAR(MAX),
    raw_ai_response NVARCHAR(MAX), 
    created_user UNIQUEIDENTIFIER,
    checked_at DATETIME2 DEFAULT GETDATE()
);

-- RATINGS & REVIEWS
CREATE TABLE ratings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_orders(id),
    user_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES users(id),
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    remark NVARCHAR(MAX),
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE order_ratings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    remark TEXT NULL,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Rating_Order FOREIGN KEY (order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_Rating_User FOREIGN KEY (user_id) REFERENCES users(id)
);

-- POINT SETTINGS (LOYALTY PROGRAM)
CREATE TABLE point_settings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    spend_amount_mmk DECIMAL(18, 2) NOT NULL,
    points_reward INT NOT NULL,
    start_date DATETIME2,
    end_date DATETIME2,
    is_active BIT DEFAULT 1,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Index Point Settings
CREATE INDEX IX_PointSettings_Active ON point_settings(is_active, is_deleted);

-- SEED DATA FOR POINT SETTINGS
INSERT INTO point_settings (name, spend_amount_mmk, points_reward, is_active)
VALUES 
('Standard Loyalty', 100000.00, 10, 1),
('Gold Member Promo', 50000.00, 15, 1);

-- AI CONFIGURATIONS
CREATE TABLE ai_configs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    model_name NVARCHAR(255) NOT NULL,
    api_key NVARCHAR(MAX) NOT NULL,
    type NVARCHAR(50) NOT NULL CHECK (type IN ('gemini', 'openai')),
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- AI PROMPTS
CREATE TABLE ai_prompts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    prompt_text NVARCHAR(MAX) NOT NULL,
    created_user UNIQUEIDENTIFIER,
    updated_user UNIQUEIDENTIFIER,
    is_deleted BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- THEMING & BRANDING
CREATE TABLE theme_settings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    lab_name NVARCHAR(255) NOT NULL DEFAULT 'MedLab Smart',
    mode NVARCHAR(20) NOT NULL DEFAULT 'light' CHECK (mode IN ('light', 'dark', 'custom')),
    primary_color NVARCHAR(50) DEFAULT '#0055ff',
    secondary_color NVARCHAR(50) DEFAULT '#00cc66',
    logo_url NVARCHAR(2048),
    custom_colors NVARCHAR(MAX), -- JSON string
    latitude FLOAT,
    longitude FLOAT,
    address NVARCHAR(MAX),
    contact_phone NVARCHAR(50),
    contact_email NVARCHAR(255),
    updated_user UNIQUEIDENTIFIER,
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- SEED INITIAL DATA
INSERT INTO theme_settings (lab_name, mode, primary_color, secondary_color, latitude, longitude, address)
VALUES ('MedLab Smart', 'light', '#0055ff', '#00cc66', 16.8661, 96.1951, 'Yangon, Myanmar');