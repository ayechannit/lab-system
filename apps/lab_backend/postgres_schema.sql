-- PostgreSQL schema for lab_backend, reconstructed from the application's query
-- layer while migrating off Microsoft SQL Server (mssql). Unlike the old
-- schema.sql (a stream of incremental T-SQL deltas applied to a base schema that
-- was never checked into this repo), this file defines the full desired final
-- state directly, since we're creating a fresh Postgres database rather than
-- patching an existing one.
--
-- IMPORTANT: this was reconstructed from src/models/*.js query usage, not from
-- a live introspection of the production MSSQL database (it wasn't reachable
-- from this environment). Before running the real data migration, reconcile
-- this against scripts/introspectMssqlSchema.js's output from the actual
-- production database and adjust column types/constraints/defaults as needed.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ==========================================================
-- USERS (patient / end-user accounts)
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255),
    phone varchar(50),
    password_hash varchar(255),
    address text,
    latitude double precision,
    longitude double precision,
    total_points int NOT NULL DEFAULT 0,
    total_spent_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    profile_image_url varchar(500),
    fcm_token varchar(500),
    is_active boolean NOT NULL DEFAULT true,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users (phone) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS ix_users_active ON users (is_deleted);

-- ==========================================================
-- LAB STAFF (admin_web accounts)
-- ==========================================================
CREATE TABLE IF NOT EXISTS lab_staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255),
    email varchar(255),
    password_hash varchar(255),
    role varchar(20) CHECK (role IN ('admin', 'manager', 'reception', 'lab_technician', 'collector')),
    is_active boolean NOT NULL DEFAULT true,
    profile_image_url varchar(500),
    fcm_token varchar(500),
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_staff_email ON lab_staff (email) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS ix_lab_staff_active ON lab_staff (is_deleted, role);

-- ==========================================================
-- ROLE PERMISSIONS (per-role module access matrix)
-- ==========================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role varchar(20) NOT NULL CHECK (role IN ('manager', 'reception', 'lab_technician', 'collector')),
    module_key varchar(50) NOT NULL,
    is_allowed boolean NOT NULL DEFAULT false,
    updated_user uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_permissions_role_module UNIQUE (role, module_key)
);

-- ==========================================================
-- LAB TEST CATALOG
-- ==========================================================
CREATE TABLE IF NOT EXISTS lab_test_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name varchar(255) NOT NULL,
    test_code varchar(100),
    description text,
    base_price_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    category varchar(255),
    is_package boolean NOT NULL DEFAULT false,
    package_items text, -- JSON-encoded array of sub-test ids, when is_package is true
    is_active boolean NOT NULL DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_lab_test_catalog_active ON lab_test_catalog (is_deleted, is_active);
CREATE INDEX IF NOT EXISTS ix_lab_test_catalog_category ON lab_test_catalog (category) WHERE is_deleted = false;

-- ==========================================================
-- SERVICE GEOFENCES (location-based service fee zones)
-- ==========================================================
CREATE TABLE IF NOT EXISTS service_geofences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    west_longitude numeric(18, 15) NOT NULL,
    east_longitude numeric(18, 15) NOT NULL,
    north_latitude numeric(18, 15) NOT NULL,
    south_latitude numeric(18, 15) NOT NULL,
    service_fee_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    priority int NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_service_geofences_active ON service_geofences (is_active, is_deleted);

-- ==========================================================
-- MATERIAL FEES
-- ==========================================================
CREATE TABLE IF NOT EXISTS material_fees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    amount_mmk numeric(18, 2) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_material_fees_active ON material_fees (is_active, is_deleted);

-- ==========================================================
-- MEMBERSHIP TIERS (lifetime-spend based customer tiering)
-- ==========================================================
CREATE TABLE IF NOT EXISTS membership_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    min_spend_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    discount_percent numeric(5, 2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO membership_tiers (name, min_spend_mmk, discount_percent)
SELECT * FROM (VALUES
    ('Normal', 0::numeric, 0::numeric),
    ('Silver', 100000::numeric, 3::numeric),
    ('Gold', 500000::numeric, 5::numeric)
) AS seed(name, min_spend_mmk, discount_percent)
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers);

-- ==========================================================
-- LOYALTY POINTS (earn rules, redemption rate, transaction ledger)
-- ==========================================================
CREATE TABLE IF NOT EXISTS point_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255),
    spend_amount_mmk numeric(18, 2) NOT NULL,
    points_reward int NOT NULL,
    start_date timestamptz,
    end_date timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS point_redemption_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mmk_per_point numeric(18, 2) NOT NULL DEFAULT 0,
    updated_user uuid,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO point_redemption_settings (mmk_per_point)
SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM point_redemption_settings);

CREATE TABLE IF NOT EXISTS point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    points int NOT NULL,
    transaction_type varchar(50) NOT NULL, -- 'earn', 'redeem', 'adjustment'
    description varchar(255),
    reference_id uuid, -- e.g. order_id or payment_id
    created_user uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_point_transactions_user_id ON point_transactions (user_id);
CREATE INDEX IF NOT EXISTS ix_point_transactions_user_type ON point_transactions (user_id, transaction_type);

-- ==========================================================
-- ADVERTISEMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS advertisements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(255) NOT NULL,
    description text,
    image_url varchar(2048),
    start_date timestamptz,
    end_date timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================
-- THEME / SYSTEM SETTINGS (singleton row)
-- ==========================================================
CREATE TABLE IF NOT EXISTS theme_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_name varchar(255),
    mode varchar(20),
    logo_url varchar(2048),
    primary_color varchar(50),
    secondary_color varchar(50),
    custom_colors text,
    latitude double precision,
    longitude double precision,
    address text,
    contact_phone varchar(50),
    contact_email varchar(255),
    ui_locale varchar(5) NOT NULL DEFAULT 'my',
    updated_user uuid,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================================
-- LAB ORDERS
-- ==========================================================
CREATE TABLE IF NOT EXISTS lab_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users (id),
    collector_id uuid REFERENCES lab_staff (id),
    description text,
    priority varchar(20),
    patient_name varchar(255),
    patient_age int,
    patient_phone varchar(50),
    address text,
    latitude double precision,
    longitude double precision,
    status varchar(30) NOT NULL DEFAULT 'pending',
    report_delivery_method varchar(50),
    original_price_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    discount_percent numeric(5, 2) NOT NULL DEFAULT 0,
    final_price_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    material_fee_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    service_geofence_id uuid REFERENCES service_geofences (id),
    service_fee_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    prescription_url varchar(2048),
    is_tests_assigned boolean NOT NULL DEFAULT false,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_lab_orders_user_id ON lab_orders (user_id);
CREATE INDEX IF NOT EXISTS ix_lab_orders_status ON lab_orders (status);
CREATE INDEX IF NOT EXISTS ix_lab_orders_active_created_at ON lab_orders (is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_lab_orders_active_status ON lab_orders (is_deleted, status);
CREATE INDEX IF NOT EXISTS ix_lab_orders_collector_id ON lab_orders (collector_id);

-- ==========================================================
-- LAB ORDER ITEMS
-- ==========================================================
CREATE TABLE IF NOT EXISTS lab_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES lab_orders (id),
    test_id uuid NOT NULL REFERENCES lab_test_catalog (id),
    quantity int NOT NULL DEFAULT 1,
    unit_price_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    subtotal_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    result_file_url varchar(2048),
    result_pdf_group_id uuid,
    result_pdf_display_solo boolean NOT NULL DEFAULT false,
    ai_verdict varchar(50),
    ai_raw_response text,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_test UNIQUE (order_id, test_id)
);

CREATE INDEX IF NOT EXISTS ix_lab_order_items_test_id ON lab_order_items (test_id);

-- ==========================================================
-- ORDER SCHEDULES (1:1 with lab_orders)
-- ==========================================================
CREATE TABLE IF NOT EXISTS order_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES lab_orders (id),
    collecting_person varchar(255),
    collection_time timestamptz,
    running_time timestamptz,
    report_out_time timestamptz,
    accepted_by_user boolean NOT NULL DEFAULT false,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_schedules_order_id UNIQUE (order_id)
);

-- ==========================================================
-- ORDER STATUS LOGS
-- ==========================================================
CREATE TABLE IF NOT EXISTS order_status_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES lab_orders (id),
    changed_by uuid REFERENCES lab_staff (id),
    old_status varchar(30),
    new_status varchar(30),
    note text,
    created_user uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_order_status_logs_order_id ON order_status_logs (order_id);
CREATE INDEX IF NOT EXISTS ix_order_status_logs_changed_by ON order_status_logs (changed_by);

-- ==========================================================
-- PAYMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES lab_orders (id),
    amount_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'received', -- pending | received | verified | rejected
    method varchar(50),
    reference_no varchar(255),
    points_redeemed int NOT NULL DEFAULT 0,
    points_value_mmk numeric(18, 2) NOT NULL DEFAULT 0,
    paid_at timestamptz,
    verified_by uuid REFERENCES lab_staff (id),
    verified_at timestamptz,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS ix_payments_order_id_status ON payments (order_id, status);

-- ==========================================================
-- ORDER RATINGS (1:1 with lab_orders)
-- ==========================================================
CREATE TABLE IF NOT EXISTS order_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES lab_orders (id),
    user_id uuid NOT NULL REFERENCES users (id),
    rating int NOT NULL,
    remark text,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_ratings_order_id UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS ix_order_ratings_user_id ON order_ratings (user_id);

-- ==========================================================
-- TEST-SPECIFIC DISCOUNTS / REFERRAL FEES (one row per test)
-- ==========================================================
CREATE TABLE IF NOT EXISTS test_specific_discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES lab_test_catalog (id),
    discount_percent numeric(5, 2) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    start_date timestamptz,
    end_date timestamptz,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_test_discount UNIQUE (test_id)
);

CREATE INDEX IF NOT EXISTS ix_test_specific_discounts_active ON test_specific_discounts (is_active, is_deleted);

CREATE TABLE IF NOT EXISTS test_referral_fees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid NOT NULL REFERENCES lab_test_catalog (id),
    referral_percent numeric(5, 2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_user uuid,
    updated_user uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_referral_test UNIQUE (test_id)
);

CREATE INDEX IF NOT EXISTS ix_test_referral_fees_active ON test_referral_fees (is_active, is_deleted);

-- ==========================================================
-- LAB RESULTS / AI QUALITY CHECKS
-- ==========================================================
CREATE TABLE IF NOT EXISTS lab_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES lab_orders (id),
    result_summary text,
    pdf_url varchar(2048),
    uploaded_by uuid REFERENCES lab_staff (id),
    quality_checked boolean NOT NULL DEFAULT false,
    sent_to_user_at timestamptz,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_lab_results_order_id ON lab_results (order_id);

CREATE TABLE IF NOT EXISTS ai_quality_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id uuid NOT NULL REFERENCES lab_results (id),
    verdict varchar(20),
    analysis_detail text,
    raw_ai_response text,
    created_user uuid,
    checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ai_quality_checks_result_id ON ai_quality_checks (result_id);

-- ==========================================================
-- NOTIFICATIONS / CONVERSATION HISTORY
-- ==========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_type varchar(50) NOT NULL DEFAULT 'user', -- 'user' or 'staff'
    title varchar(255) NOT NULL,
    body text NOT NULL,
    data_payload text, -- JSON string for custom data payload
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_id_is_read ON notifications (user_id, is_read);

CREATE TABLE IF NOT EXISTS conversation_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    user_message text NOT NULL,
    ai_response text NOT NULL,
    user_type varchar(50) NOT NULL DEFAULT 'user',
    created_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS ix_conversation_history_user_id ON conversation_history (user_id);

-- ==========================================================
-- AI CONFIGS / PROMPTS (admin-managed AI settings)
-- ==========================================================
CREATE TABLE IF NOT EXISTS ai_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name varchar(255),
    api_key text,
    type varchar(50),
    is_deleted boolean NOT NULL DEFAULT false,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255),
    prompt_text text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_user uuid,
    updated_user uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
