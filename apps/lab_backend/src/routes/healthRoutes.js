const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health and status checks
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 database:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/', healthController.getHealthStatus);

module.exports = router;
