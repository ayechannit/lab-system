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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request verification code to reset password
 *     description: Validates user/staff email, generates a 15-minute 6-digit PIN code, and sends it via email.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: Registered email address
 *     responses:
 *       200:
 *         description: Code sent successfully
 *       400:
 *         description: Missing email address
 *       404:
 *         description: Account not found
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with 6-digit PIN
 *     description: Verifies the code against the registered email and updates the password.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - new_password
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: The 6-digit PIN code received in email
 *               new_password:
 *                 type: string
 *                 description: The new secure password to set
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired code
 *       404:
 *         description: Account not found
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;
