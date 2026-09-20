-- Performance indexes identified in a full-system audit (2026-09-20).
-- Postgres does not auto-index foreign key columns (unlike MSSQL with clustered
-- FKs in some setups), so several hot join/filter columns were unindexed after
-- the MSSQL -> Postgres migration. All statements use IF NOT EXISTS, so this is
-- safe to re-run. Not CONCURRENTLY: the app connects through Supabase's pgbouncer
-- transaction pooler (port 6543), which CONCURRENTLY index builds don't tolerate
-- well; table sizes here are small enough that a brief lock during a plain
-- CREATE INDEX is a non-issue.

-- lab_orders: every list/report query filters "is_deleted = false" and sorts by
-- created_at DESC; status is filtered on its own and combined with is_deleted.
CREATE INDEX IF NOT EXISTS ix_lab_orders_active_created_at
    ON lab_orders (is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_lab_orders_active_status
    ON lab_orders (is_deleted, status);
CREATE INDEX IF NOT EXISTS ix_lab_orders_collector_id
    ON lab_orders (collector_id);

-- lab_order_items: order_id is already the leading column of uq_order_test, but
-- test_id (used to join test_referral_fees / lab_test_catalog / reporting
-- GROUP BY tc.category|tc.test_name) has no index at all.
CREATE INDEX IF NOT EXISTS ix_lab_order_items_test_id
    ON lab_order_items (test_id);

-- lab_test_catalog: is_deleted (+ is_active) is filtered on virtually every
-- catalog/order/report query; category is a common filter/group-by.
CREATE INDEX IF NOT EXISTS ix_lab_test_catalog_active
    ON lab_test_catalog (is_deleted, is_active);
CREATE INDEX IF NOT EXISTS ix_lab_test_catalog_category
    ON lab_test_catalog (category) WHERE is_deleted = false;

-- users: is_deleted filtered on every user query.
CREATE INDEX IF NOT EXISTS ix_users_active
    ON users (is_deleted);

-- lab_staff: is_deleted/role/is_active filtered on staff list + report joins
-- (e.g. collectors leaderboard by role).
CREATE INDEX IF NOT EXISTS ix_lab_staff_active
    ON lab_staff (is_deleted, role);

-- lab_results / ai_quality_checks: FK columns with zero indexes, hit on every
-- order detail page (getByOrderId) and AI quality-check listing.
CREATE INDEX IF NOT EXISTS ix_lab_results_order_id
    ON lab_results (order_id);
CREATE INDEX IF NOT EXISTS ix_ai_quality_checks_result_id
    ON ai_quality_checks (result_id);

-- order_ratings: user_id is filtered in the ratings list/report (order_id is
-- already unique-indexed).
CREATE INDEX IF NOT EXISTS ix_order_ratings_user_id
    ON order_ratings (user_id);

-- order_status_logs: reportModel groups "who changed status to collecting" by
-- changed_by; order_id is already indexed.
CREATE INDEX IF NOT EXISTS ix_order_status_logs_changed_by
    ON order_status_logs (changed_by);

-- test_referral_fees / test_specific_discounts: test_id already unique-indexed;
-- is_active/is_deleted are filtered together on every pricing lookup.
CREATE INDEX IF NOT EXISTS ix_test_referral_fees_active
    ON test_referral_fees (is_active, is_deleted);
CREATE INDEX IF NOT EXISTS ix_test_specific_discounts_active
    ON test_specific_discounts (is_active, is_deleted);

-- payments: status is filtered alongside order_id (already indexed) to sum
-- paid amounts; a composite lets that be an index-only scan.
CREATE INDEX IF NOT EXISTS ix_payments_order_id_status
    ON payments (order_id, status);

-- point_transactions: transaction_type is filtered alongside user_id.
CREATE INDEX IF NOT EXISTS ix_point_transactions_user_type
    ON point_transactions (user_id, transaction_type);
