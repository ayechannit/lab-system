const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication for users and lab staff
 */

/**
 * @swagger
 * /api/auth/login/user:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post('/login/user', authController.loginUser);

/**
 * @swagger
 * /api/auth/login/staff:
 *   post:
 *     summary: Staff login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post('/login/staff', authController.loginStaff);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated account info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current account details
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
