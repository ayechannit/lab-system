const express = require('express');
const router = express.Router();
const labResultController = require('../controllers/labResultController');
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: LabResults
 *   description: Laboratory result management and AI quality checks
 */

/**
 * @swagger
 * /api/lab-results:
 *   post:
 *     summary: Create a new lab result record
 *     tags: [LabResults]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id, result_summary]
 *             properties:
 *               order_id:
 *                 type: string
 *               result_summary:
 *                 type: string
 *               pdf_url:
 *                 type: string
 *               uploaded_by:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authMiddleware, modulePermission('results'), labResultController.createResult);

/**
 * @swagger
 * /api/lab-results/order/{orderId}:
 *   get:
 *     summary: Get lab result by order ID
 *     tags: [LabResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lab result data
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: "result-uuid"
 *                 order_id: "order-uuid"
 *                 result_summary: "Patient shows normal glucose levels."
 *                 pdf_url: "/uploads/result.pdf"
 *                 quality_checked: true
 *                 ai_checks:
 *                   verdict: "pass"
 *                   analysis_detail: "All values within normal range."
 */
router.get('/order/:orderId', authMiddleware, modulePermission('results'), labResultController.getResultByOrderId);

/**
 * @swagger
 * /api/lab-results/{id}/quality-check:
 *   patch:
 *     summary: Update quality check status
 *     tags: [LabResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quality_checked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch('/:id/quality-check', authMiddleware, modulePermission('results'), labResultController.updateQualityCheck);

/**
 * @swagger
 * /api/lab-results/{resultId}/ai-check:
 *   post:
 *     summary: Add an AI quality check to a result
 *     tags: [LabResults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verdict, analysis_detail]
 *             properties:
 *               verdict:
 *                 type: string
 *                 enum: [pass, warning, fail]
 *               analysis_detail:
 *                 type: string
 *               raw_ai_response:
 *                 type: string
 *     responses:
 *       201:
 *         description: AI check added
 */
router.post('/:resultId/ai-check', authMiddleware, modulePermission('results'), labResultController.addAiQualityCheck);

module.exports = router;
