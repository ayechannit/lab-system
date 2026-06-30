const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const materialFeeController = require('../controllers/materialFeeController');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     MaterialFee:
 *       type: object
 *       required:
 *         - name
 *         - amount_mmk
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         amount_mmk:
 *           type: number
 *         is_active:
 *           type: boolean
 *         is_deleted:
 *           type: boolean
 *         created_user:
 *           type: string
 *           format: uuid
 *         updated_user:
 *           type: string
 *           format: uuid
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
 *   name: MaterialFees
 *   description: Material Fee Configuration Management
 */

/**
 * @swagger
 * /api/material-fees:
 *   get:
 *     summary: Get all material fee configurations
 *     tags: [MaterialFees]
 *     responses:
 *       200:
 *         description: List of all material fee configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MaterialFee'
 */

/**
 * @swagger
 * /api/material-fees/active:
 *   get:
 *     summary: Get all active material fee configurations
 *     tags: [MaterialFees]
 *     responses:
 *       200:
 *         description: List of active material fee configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MaterialFee'
 */

/**
 * @swagger
 * /api/material-fees/{id}:
 *   get:
 *     summary: Get a material fee configuration by ID
 *     tags: [MaterialFees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Material fee configuration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialFee'
 *       404:
 *         description: Material fee not found
 */

/**
 * @swagger
 * /api/material-fees:
 *   post:
 *     summary: Create a new material fee configuration
 *     tags: [MaterialFees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - amount_mmk
 *             properties:
 *               name:
 *                 type: string
 *               amount_mmk:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Material fee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialFee'
 */

/**
 * @swagger
 * /api/material-fees/{id}:
 *   put:
 *     summary: Update an existing material fee configuration
 *     tags: [MaterialFees]
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
 *             type: object
 *             required:
 *               - name
 *               - amount_mmk
 *             properties:
 *               name:
 *                 type: string
 *               amount_mmk:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Material fee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialFee'
 *       404:
 *         description: Material fee not found
 */

/**
 * @swagger
 * /api/material-fees/{id}:
 *   delete:
 *     summary: Soft delete a material fee configuration
 *     tags: [MaterialFees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Material fee deleted successfully
 *       404:
 *         description: Material fee not found
 */

router.get('/', materialFeeController.getAllFees);
router.get('/active', materialFeeController.getActiveFees);
router.get('/:id', materialFeeController.getFeeById);
router.post('/', materialFeeController.createFee);
router.put('/:id', materialFeeController.updateFee);
router.delete('/:id', materialFeeController.deleteFee);

module.exports = router;
