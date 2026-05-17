const express = require('express');
const router = express.Router();
const systemSettingController = require('../controllers/systemSettingController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: SystemSettings
 *   description: System-wide theme and configuration settings
 */

/**
 * @swagger
 * /api/system-settings:
 *   get:
 *     summary: Get current system settings
 *     tags: [SystemSettings]
 *     responses:
 *       200:
 *         description: Current system settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 lab_name:
 *                   type: string
 *                 mode:
 *                   type: string
 *                 logo_url:
 *                   type: string
 *                 primary_color:
 *                   type: string
 *                 secondary_color:
 *                   type: string
 *                 custom_colors:
 *                   type: string
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 address:
 *                   type: string
 *                 contact_phone:
 *                   type: string
 *                 contact_email:
 *                   type: string
 */
router.get('/', systemSettingController.getSettings);

/**
 * @swagger
 * /api/system-settings:
 *   put:
 *     summary: Update system settings
 *     tags: [SystemSettings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lab_name:
 *                 type: string
 *               mode:
 *                 type: string
 *               logo_url:
 *                 type: string
 *               primary_color:
 *                 type: string
 *               secondary_color:
 *                 type: string
 *               custom_colors:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               contact_email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated system settings
 *       401:
 *         description: Unauthorized
 */
router.put('/', authMiddleware, systemSettingController.updateSettings);

module.exports = router;
