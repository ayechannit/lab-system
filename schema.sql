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
    role NVARCHAR(20) NOT NULL CHECK (role IN ('clinic', 'doctor', 'patient')),
    address NVARCHAR(MAX),
    latitude FLOAT,
    longitude FLOAT,
    total_points INT DEFAULT 0,
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
    role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'lab_technician', 'reception', 'manager')),
    is_active BIT DEFAULT 1,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- LAB TEST CATALOG
CREATE TABLE lab_test_catalog (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_name NVARCHAR(255) NOT NULL,
    test_code NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    base_price_mmk DECIMAL(18, 2) NOT NULL,
    category NVARCHAR(100),
    is_active BIT DEFAULT 1,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE()
);

-- LAB ORDERS
CREATE TABLE lab_orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES users(id),
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
    created_at DATETIME2 DEFAULT GETDATE(),
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
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- TEST SPECIFIC DISCOUNTS
CREATE TABLE test_specific_discounts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    test_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_test_catalog(id),
    role NVARCHAR(20) NOT NULL CHECK (role IN ('clinic', 'doctor', 'patient')),
    discount_percent DECIMAL(5, 2) NOT NULL,
    is_active BIT DEFAULT 1,
    is_deleted BIT DEFAULT 0, -- Soft Delete
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_Test_Role UNIQUE (test_id, role)
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
    checked_at DATETIME2 DEFAULT GETDATE()
);

-- RATINGS & REVIEWS
CREATE TABLE ratings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES lab_orders(id),
    user_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES users(id),
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    remark NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

/* =============================================================================
   INDEX MANAGEMENT
   ============================================================================= */

-- 1. Index Foreign Keys (Essential for Join Performance)
CREATE INDEX IX_Orders_User ON lab_orders(user_id) WHERE is_deleted = 0;
CREATE INDEX IX_OrderItems_Order ON lab_order_items(order_id);
CREATE INDEX IX_OrderItems_Test ON lab_order_items(test_id);
CREATE INDEX IX_Payments_Order ON payments(order_id);
CREATE INDEX IX_StatusLogs_Order ON order_status_logs(order_id);
CREATE INDEX IX_Ratings_Order ON ratings(order_id);
CREATE INDEX IX_Ratings_User ON ratings(user_id);

-- 2. Index Common Filter/Search Columns (Filtered to skip deleted records)
CREATE INDEX IX_Users_Role ON users(role) WHERE is_deleted = 0;
CREATE INDEX IX_Orders_Status ON lab_orders(status) WHERE is_deleted = 0;
CREATE INDEX IX_Orders_CreatedAt ON lab_orders(created_at) WHERE is_deleted = 0;
CREATE INDEX IX_Tests_Category ON lab_test_catalog(category) WHERE is_deleted = 0;
CREATE INDEX IX_Staff_Active ON lab_staff(is_active) WHERE is_deleted = 0;

-- 3. Covering Indexes for Discount Lookups
CREATE INDEX IX_SpecificDiscounts_Lookup ON test_specific_discounts(role, is_active, is_deleted) INCLUDE (test_id, discount_percent);




ALTER TABLE lab_orders 
ADD report_delivery_method VARCHAR(20) NOT NULL;


ALTER TABLE lab_order_items 
ADD result_file_url VARCHAR(500) NULL;



CREATE TABLE order_ratings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    remark TEXT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Rating_Order FOREIGN KEY (order_id) REFERENCES lab_orders(id),
    CONSTRAINT FK_Rating_User FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IX_Order_Rating ON order_ratings(order_id);


CREATE TABLE point_settings (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NULL,
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);