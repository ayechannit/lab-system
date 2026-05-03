const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const validate = require('../middlewares/validate');
const { testSchema } = require('../utils/validators');

/**
 * @swagger
 * components:
 *   schemas:
 *     LabTest:
 *       type: object
 *       required:
 *         - test_name
 *         - test_code
 *         - base_price_mmk
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         test_name:
 *           type: string
 *         test_code:
 *           type: string
 *         description:
 *           type: string
 *         base_price_mmk:
 *           type: number
 *         category:
 *           type: string
 *         is_active:
 *           type: boolean
 *         is_deleted:
 *           type: boolean
 *         discount_percent:
 *           type: number
 *         discounted_price_mmk:
 *           type: number
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: Lab test catalog management
 */

/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: Returns the list of all lab tests
 *     tags: [Tests]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [clinic, doctor, patient]
 *         description: User role to calculate specific discounts
 *     responses:
 *       200:
 *         description: The list of tests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LabTest'
 */

/**
 * @swagger
 * /api/tests/{id}:
 *   get:
 *     summary: Get a test by id
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: The test description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LabTest'
 *       404:
 *         description: Test not found
 */

/**
 * @swagger
 * /api/tests:
 *   post:
 *     summary: Create a new lab test
 *     tags: [Tests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LabTest'
 *     responses:
 *       201:
 *         description: The test was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LabTest'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/tests/{id}:
 *   put:
 *     summary: Update an existing test
 *     tags: [Tests]
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
 *             $ref: '#/components/schemas/LabTest'
 *     responses:
 *       200:
 *         description: The test was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LabTest'
 *       404:
 *         description: Test not found
 */

/**
 * @swagger
 * /api/tests/{id}:
 *   delete:
 *     summary: Soft delete a test
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Test deleted
 *       404:
 *         description: Test not found
 */

router.get('/', testController.getAllTests);
router.get('/:id', testController.getTestById);
router.post('/', validate(testSchema), testController.createTest);
router.put('/:id', validate(testSchema), testController.updateTest);
router.delete('/:id', testController.deleteTest);

module.exports = router;
