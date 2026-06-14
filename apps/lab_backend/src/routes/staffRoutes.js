const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadProfile } = require('../middlewares/upload');
const staffController = require('../controllers/staffController');

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
 *           enum: [admin, lab_technician, reception, manager, collector]
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
 *           enum: [admin, lab_technician, reception, manager, collector]
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
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, name, email, role]
 *         description: Sort field for staff
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *         description: Sort order (ASC or DESC)
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
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password_hash
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password_hash:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, lab_technician, reception, manager, collector]
 *               is_active:
 *                 type: boolean
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               is_active:
 *                 type: boolean
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

/**
 * @swagger
 * /api/staff/{id}/profile-image:
 *   post:
 *     summary: Upload profile image for a collector staff member
 *     description: |
 *       Allows uploading/updating a profile image (avatar) for a staff member of role `'collector'`.
 *       - Admins or Managers can upload for any collector staff member.
 *       - Collectors can upload for their own account.
 *     tags: [Staff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The staff member ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The profile image file (JPEG, PNG, GIF, WEBP)
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 staff:
 *                   $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Bad Request (not a collector, or no file uploaded)
 *       403:
 *         description: Forbidden (no permission to update this staff member)
 *       404:
 *         description: Staff member not found
 *       500:
 *         description: Server error
 */

router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);
router.post('/:id/profile-image', uploadProfile.single('image'), staffController.uploadProfileImage);

module.exports = router;
