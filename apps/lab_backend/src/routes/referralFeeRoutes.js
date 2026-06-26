const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const referralFeeController = require('../controllers/referralFeeController');

router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     ReferralFee:
 *       type: object
 *       required:
 *         - test_id
 *         - role
 *         - referral_percent
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         test_id:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [clinic, doctor, patient, phlebotomist]
 *         referral_percent:
 *           type: number
 *         is_active:
 *           type: boolean
 *         is_deleted:
 *           type: boolean
 *         test_name:
 *           type: string
 *         test_code:
 *           type: string
 *         original_price:
 *           type: number
 *         referral_fee_amount:
 *           type: number
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
 *   name: Referral Fees
 *   description: Test-specific role-based referral fee management
 */

/**
 * @swagger
 * /api/referral-fees:
 *   get:
 *     summary: Get all test-specific referral fees
 *     tags: [Referral Fees]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient, phlebotomist]
 *         description: Filter referral fees by role
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: test_name
 *         schema:
 *           type: string
 *         description: Search by partial test name
 *       - in: query
 *         name: test_code
 *         schema:
 *           type: string
 *         description: Search by partial test code
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
 *         description: Field to sort by (test_name, test_code, referral_percent, created_at)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of test-specific referral fees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReferralFee'
 */

/**
 * @swagger
 * /api/referral-fees/{test_id}:
 *   get:
 *     summary: Get all referral fee configurations for a specific test
 *     tags: [Referral Fees]
 *     parameters:
 *       - in: path
 *         name: test_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Referral fee configurations for the test
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReferralFee'
 */

/**
 * @swagger
 * /api/referral-fees/{test_id}/{role}:
 *   get:
 *     summary: Get a specific referral fee config for a test and role
 *     tags: [Referral Fees]
 *     parameters:
 *       - in: path
 *         name: test_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient, phlebotomist]
 *     responses:
 *       200:
 *         description: Referral fee configuration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReferralFee'
 *       404:
 *         description: Referral fee config not found
 */

/**
 * @swagger
 * /api/referral-fees:
 *   post:
 *     summary: Create or update a referral fee
 *     tags: [Referral Fees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - test_id
 *               - role
 *               - referral_percent
 *             properties:
 *               test_id:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [clinic, doctor, patient, phlebotomist, all]
 *               referral_percent:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: The created/updated referral fee config(s)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReferralFee'
 */

/**
 * @swagger
 * /api/referral-fees/bulk:
 *   post:
 *     summary: Bulk create or update multiple referral fee configurations
 *     tags: [Referral Fees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referral_fees
 *             properties:
 *               referral_fees:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - test_id
 *                     - role
 *                     - referral_percent
 *                   properties:
 *                     test_id:
 *                       type: string
 *                       format: uuid
 *                     role:
 *                       type: string
 *                       enum: [clinic, doctor, patient, phlebotomist, all]
 *                     referral_percent:
 *                       type: number
 *                     is_active:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: The created/updated referral fee configs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReferralFee'
 */

/**
 * @swagger
 * /api/referral-fees/{id}:
 *   delete:
 *     summary: Soft delete a specific referral fee entry
 *     tags: [Referral Fees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Referral fee deleted
 *       404:
 *         description: Referral fee entry not found
 */

router.get('/', referralFeeController.getAllReferralFees);
router.get('/:test_id', referralFeeController.getReferralFeesByTestId);
router.get('/:test_id/:role', referralFeeController.getReferralFeeByTestIdAndRole);
router.post('/bulk', referralFeeController.bulkUpsertReferralFees);
router.post('/', referralFeeController.upsertReferralFee);
router.delete('/:id', referralFeeController.deleteReferralFee);

module.exports = router;
