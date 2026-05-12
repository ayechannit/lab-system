const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const promptController = require('../controllers/promptController');

// Ensure all routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Prompt:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         prompt_text:
 *           type: string
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
 *   name: Prompts
 *   description: Management of AI prompts
 */

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: Get all AI prompts
 *     tags: [Prompts]
 *     responses:
 *       200:
 *         description: List of AI prompts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prompt'
 */

/**
 * @swagger
 * /api/prompts/{id}:
 *   get:
 *     summary: Get a specific AI prompt by id
 *     tags: [Prompts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI prompt details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prompt'
 *       404:
 *         description: Prompt not found
 */

/**
 * @swagger
 * /api/prompts:
 *   post:
 *     summary: Create a new AI prompt
 *     tags: [Prompts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - prompt_text
 *             properties:
 *               name:
 *                 type: string
 *               prompt_text:
 *                 type: string
 *     responses:
 *       201:
 *         description: AI prompt created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prompt'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/prompts/{id}:
 *   put:
 *     summary: Update an AI prompt
 *     tags: [Prompts]
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
 *               - prompt_text
 *             properties:
 *               name:
 *                 type: string
 *               prompt_text:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI prompt updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prompt'
 *       404:
 *         description: Prompt not found
 */

/**
 * @swagger
 * /api/prompts/{id}:
 *   delete:
 *     summary: Soft delete an AI prompt
 *     tags: [Prompts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI prompt deleted
 *       404:
 *         description: Prompt not found
 */

router.get('/', promptController.getAllPrompts);
router.get('/:id', promptController.getPromptById);
router.post('/', promptController.createPrompt);
router.put('/:id', promptController.updatePrompt);
router.delete('/:id', promptController.deletePrompt);

module.exports = router;
