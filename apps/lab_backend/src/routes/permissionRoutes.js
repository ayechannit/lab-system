const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const permissionController = require('../controllers/permissionController');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Per-role module access control for lab_admin_web
 */

/**
 * @swagger
 * /api/permissions/me:
 *   get:
 *     summary: Get the signed-in staff member's allowed module keys
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Allowed module keys for the current account
 */
router.get('/me', permissionController.getMyPermissions);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get the full role/module permission matrix
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full permission matrix
 *       403:
 *         description: Forbidden (admin only)
 */
router.get('/', roleMiddleware(['admin']), permissionController.getPermissionMatrix);

/**
 * @swagger
 * /api/permissions:
 *   put:
 *     summary: Bulk update the role/module permission matrix
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entries
 *             properties:
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [manager, reception, lab_technician, collector]
 *                     module_key:
 *                       type: string
 *                     is_allowed:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Updated permission matrix
 *       403:
 *         description: Forbidden (admin only)
 */
router.put('/', roleMiddleware(['admin']), permissionController.updatePermissionMatrix);

module.exports = router;
