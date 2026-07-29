const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');

const manageReports = modulePermission('reports');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytical reports and dashboard data
 */

/**
 * @swagger
 * /api/reports/dashboard-kpis:
 *   get:
 *     summary: Get high-level KPI data for the dashboard
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the reporting period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the reporting period
 *     responses:
 *       200:
 *         description: Dashboard KPI data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 kpis:
 *                   total_revenue: 1500000.00
 *                   total_orders: 125
 *                   urgent_orders: 45
 *                   total_users: 320
 *                   ai_pass_count: 110
 *                   ai_issue_count: 15
 *                 revenueTrend:
 *                   - date: "2024-05-15"
 *                     revenue: 250000.00
 *                     order_count: 18
 *                   - date: "2024-05-16"
 *                     revenue: 310000.00
 *                     order_count: 22
 */
router.get('/dashboard-kpis', authMiddleware, manageReports, reportController.getDashboardKpis);

/**
 * @swagger
 * /api/reports/test-categories:
 *   get:
 *     summary: Get distribution of tests by category
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by a specific test category
 *     responses:
 *       200:
 *         description: Test category distribution data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - category: "Blood Work"
 *                   test_count: 85
 *                   total_revenue: 850000.00
 *                 - category: "Imaging"
 *                   test_count: 12
 *                   total_revenue: 1200000.00
 */
router.get('/test-categories', authMiddleware, manageReports, reportController.getTestCategoryDistribution);

/**
 * @swagger
 * /api/reports/tat:
 *   get:
 *     summary: Get Turnaround Time (TAT) report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [urgent, elective]
 *     responses:
 *       200:
 *         description: TAT report data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - order_id: "uuid-1"
 *                   patient_name: "John Doe"
 *                   priority: "urgent"
 *                   collection_time: "2024-05-20T10:00:00Z"
 *                   report_out_time: "2024-05-20T14:30:00Z"
 *                   tat_minutes: 270
 */
router.get('/tat', authMiddleware, manageReports, reportController.getTurnaroundTimeReport);

/**
 * @swagger
 * /api/reports/revenue-by-channel:
 *   get:
 *     summary: Get revenue breakdown by user role (channel)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Revenue by channel data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - role: "clinic"
 *                   revenue: 5000000.00
 *                   order_count: 40
 *                 - role: "patient"
 *                   revenue: 1200000.00
 *                   order_count: 15
 */
router.get('/revenue-by-channel', authMiddleware, manageReports, reportController.getRevenueByChannel);

/**
 * @swagger
 * /api/reports/pending-queue:
 *   get:
 *     summary: Get list of pending orders that require action
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [urgent, elective]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, scheduled, collecting, running, completed]
 *     responses:
 *       200:
 *         description: Pending results queue data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - order_id: "uuid-1"
 *                   patient_name: "Jane Smith"
 *                   status: "collecting"
 *                   priority: "urgent"
 *                   hours_elapsed: 5
 */
router.get('/pending-queue', authMiddleware, manageReports, reportController.getPendingResultsQueue);

/**
 * @swagger
 * /api/reports/staff-activity:
 *   get:
 *     summary: Get staff performance and activity audit
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff activity data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - staff_name: "Alice Tech"
 *                   staff_role: "lab_technician"
 *                   actions_performed: 450
 *                   last_action_at: "2024-05-22T09:00:00Z"
 */
router.get('/staff-activity', authMiddleware, manageReports, reportController.getStaffActivityAudit);

/**
 * @swagger
 * /api/reports/collection-report:
 *   get:
 *     summary: Get sample collection performance report (for collectors)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Collection report data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - staff_id: "uuid"
 *                   staff_name: "John Collector"
 *                   collections_count: 50
 *                   avg_assignment_to_collection_minutes: 45.5
 */
router.get('/collection-report', authMiddleware, manageReports, reportController.getCollectionReport);

/**
 * @swagger
 * /api/reports/discount-impact:
 *   get:
 *     summary: Get financial analysis of discounts given
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient]
 *     responses:
 *       200:
 *         description: Discount impact data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 total_original_value: 5000000.00
 *                 total_final_revenue: 4500000.00
 *                 total_discount_given: 500000.00
 *                 effective_discount_percent: 10.0
 */
router.get('/discount-impact', authMiddleware, manageReports, reportController.getDiscountImpactAnalysis);

/**
 * @swagger
 * /api/reports/ratings-summary:
 *   get:
 *     summary: Get customer satisfaction summary and latest reviews
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *     responses:
 *       200:
 *         description: Ratings summary data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 stats:
 *                   average_rating: 4.7
 *                   total_reviews: 150
 *                   positive_reviews: 135
 *                   negative_reviews: 5
 *                 latestReviews:
 *                   - rating: 5
 *                     remark: "Very fast service!"
 *                     user_name: "Bob Client"
 *                     created_at: "2024-05-21T15:00:00Z"
 */
router.get('/ratings-summary', authMiddleware, manageReports, reportController.getRatingsSummary);

/**
 * @swagger
 * /api/reports/user-summary:
 *   get:
 *     summary: Get summary metrics and analytics for the logged-in user
 *     description: Returns personalized KPIs (total orders, spent, points, order statuses), daily spend trends, and top ordered lab tests for the authenticated user/client.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Personalized user report data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     kpis:
 *                       type: object
 *                       properties:
 *                         total_spent:
 *                           type: number
 *                         total_orders:
 *                           type: integer
 *                         completed_orders:
 *                           type: integer
 *                         pending_orders:
 *                           type: integer
 *                         loyalty_points:
 *                           type: integer
 *                     spendTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           spent:
 *                             type: number
 *                           order_count:
 *                             type: integer
 *                     topTests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           test_name:
 *                             type: string
 *                           test_code:
 *                             type: string
 *                           category:
 *                             type: string
 *                           order_count:
 *                             type: integer
 *                           total_spent:
 *                             type: number
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/user-summary', authMiddleware, reportController.getUserReport);

module.exports = router;
