const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const advertisementController = require('../controllers/advertisementController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Advertisement:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         image_url:
 *           type: string
 *         action_url:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
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
 *   name: Advertisements
 *   description: Promotional advertisements and mobile app banner management
 */

/**
 * @swagger
 * /api/advertisements:
 *   get:
 *     summary: Retrieve all active and scheduled advertisements
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Search by partial title
 *       - in: query
 *         name: current_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date to filter advertisements running on (start_date <= current_date <= end_date)
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, start_date, end_date, created_at, is_active]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of advertisements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Advertisement'
 */

/**
 * @swagger
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get details of a specific advertisement
 *     tags: [Advertisements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Advertisement'
 *       404:
 *         description: Advertisement not found
 */

/**
 * @swagger
 * /api/advertisements:
 *   post:
 *     summary: Create a new advertisement (Admin/Staff only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *               action_url:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Advertisement created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Advertisement'
 */

/**
 * @swagger
 * /api/advertisements/{id}:
 *   put:
 *     summary: Update an advertisement (Admin/Staff only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *               action_url:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Advertisement updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Advertisement'
 *       404:
 *         description: Advertisement not found
 */

/**
 * @swagger
 * /api/advertisements/{id}:
 *   delete:
 *     summary: Soft delete an advertisement (Admin/Staff only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement deleted
 *       404:
 *         description: Advertisement not found
 */

router.get('/', advertisementController.getAllAdvertisements);
router.get('/:id', advertisementController.getAdvertisementById);

// Secured routes
router.post('/', authMiddleware, advertisementController.createAdvertisement);
router.put('/:id', authMiddleware, advertisementController.updateAdvertisement);
router.delete('/:id', authMiddleware, advertisementController.deleteAdvertisement);

module.exports = router;
