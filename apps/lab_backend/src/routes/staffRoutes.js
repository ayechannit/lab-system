const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const staffController = require('../controllers/staffController');
const validate = require('../middlewares/validate');
const { staffSchema } = require('../utils/validators');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Staff:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password_hash
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         password_hash:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, lab_technician, reception, manager]
 *         is_active:
 *           type: boolean
 *         is_deleted:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Lab staff management
 */

/**
 * @swagger
 * /api/staff:
 *   get:
 *     summary: Get all staff members
 *     tags: [Staff]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, lab_technician, reception, manager]
 *         description: Filter staff by role
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by partial name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page for pagination
 *     responses:
 *       200:
 *         description: List of all staff
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Staff'
 */

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     summary: Get staff member by id
 *     tags: [Staff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Staff not found
 */

/**
 * @swagger
 * /api/staff:
 *   post:
 *     summary: Create a new staff member
 *     tags: [Staff]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Staff'
 *     responses:
 *       201:
 *         description: Staff created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/staff/{id}:
 *   put:
 *     summary: Update staff member details
 *     tags: [Staff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Staff'
 *     responses:
 *       200:
 *         description: Staff updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Staff not found
 */

/**
 * @swagger
 * /api/staff/{id}:
 *   delete:
 *     summary: Soft delete a staff member
 *     tags: [Staff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff member deleted
 *       404:
 *         description: Staff not found
 */

router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.post('/', validate(staffSchema), staffController.createStaff);
router.put('/:id', validate(staffSchema), staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
