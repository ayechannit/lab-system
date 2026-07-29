const express = require('express');
const router = express.Router();
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');
const { uploadProfile } = require('../middlewares/upload');
const userController = require('../controllers/userController');

/** Governs staff browsing/approving other end-users' accounts (Users page in lab_admin_web). */
const manageUsers = modulePermission('users');


/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
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
 *         phone:
 *           type: string
 *         password_hash:
 *           type: string
 *         role:
 *           type: string
 *           enum: [clinic, doctor, patient, phlebotomist]
 *         address:
 *           type: string
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *         total_points:
 *           type: integer
 *         license_number:
 *           type: string
 *         is_approved:
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
 *   name: Users
 *   description: User management (Clinics, Doctors, Patients)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient, phlebotomist]
 *         description: Filter users by role
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search by partial name
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Search by partial phone number
 *       - in: query
 *         name: is_approved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status
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
 *           enum: [created_at, updated_at, name, email, role, total_points]
 *         description: Sort field for users
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *         description: Sort order (ASC or DESC)
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password_hash
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password_hash:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [clinic, doctor, patient, phlebotomist]
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               license_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               license_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/{id}/approve:
 *   put:
 *     summary: Approve a pending doctor or clinic user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user to approve
 *     responses:
 *       200:
 *         description: User approved successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Soft delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/{id}/orders:
 *   get:
 *     summary: Get all orders for a specific user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the user
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, scheduled, collecting, running, completed, delivered]
 *         description: Filter user's orders by status
 *       - in: query
 *         name: exclude_status
 *         schema:
 *           type: string
 *           enum: [pending, scheduled, collecting, running, completed, delivered]
 *         description: Exclude orders with this status (e.g. delivered for active order lists)
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
 *         description: List of user's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       404:
 *         description: User not found
 */

router.get('/',authMiddleware, userController.getAllUsers);

router.get('/:id/orders',authMiddleware, userController.getOrdersByUser);
router.get('/:id',authMiddleware, manageUsers, userController.getUserById);

router.post('/', uploadProfile.single('image'), userController.createUser);

/**
 * @swagger
 * /api/users/fcm-token:
 *   put:
 *     summary: Register/update FCM token for notifications
 *     description: Registers or updates the Firebase Cloud Messaging (FCM) token for the currently authenticated user or staff.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcm_token
 *             properties:
 *               fcm_token:
 *                 type: string
 *                 description: The Firebase device token
 *     responses:
 *       200:
 *         description: FCM token registered successfully
 *       400:
 *         description: Validation error (missing fcm_token)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Account not found
 */
router.put('/fcm-token', authMiddleware, userController.registerFcmToken);
router.post('/:id/profile-image', authMiddleware, uploadProfile.single('image'), userController.uploadProfileImage);
router.put('/:id', authMiddleware, userController.updateUser);
router.put('/:id/approve', authMiddleware, manageUsers, userController.approveUser);
router.delete('/:id', authMiddleware, userController.deleteUser);

module.exports = router;
