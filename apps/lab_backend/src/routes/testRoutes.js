const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const testController = require('../controllers/testController');

router.use(authMiddleware);

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
 *         is_package:
 *           type: boolean
 *         package_items:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         is_active:
 *           type: boolean
 *         is_deleted:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         discounts:
 *           type: array
 *           description: List of active role-based discounts for this test
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *               discount_percent:
 *                 type: number
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
 *     summary: Returns the list of all lab tests with their associated discounts
 *     tags: [Tests]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by test category
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: is_package
 *         schema:
 *           type: boolean
 *         description: Filter by whether it is a package
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
 *             type: object
 *             required:
 *               - test_name
 *               - test_code
 *               - base_price_mmk
 *             properties:
 *               test_name:
 *                 type: string
 *               test_code:
 *                 type: string
 *               description:
 *                 type: string
 *               base_price_mmk:
 *                 type: number
 *               category:
 *                 type: string
 *               is_package:
 *                 type: boolean
 *               package_items:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               is_active:
 *                 type: boolean
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
 *             type: object
 *             properties:
 *               test_name:
 *                 type: string
 *               test_code:
 *                 type: string
 *               description:
 *                 type: string
 *               base_price_mmk:
 *                 type: number
 *               category:
 *                 type: string
 *               is_package:
 *                 type: boolean
 *               package_items:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               is_active:
 *                 type: boolean
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
router.post('/', testController.createTest);
router.put('/:id', testController.updateTest);
router.delete('/:id', testController.deleteTest);

module.exports = router;
