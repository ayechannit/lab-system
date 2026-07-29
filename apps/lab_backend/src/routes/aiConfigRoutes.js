const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');
const aiConfigController = require('../controllers/aiConfigController');

// AI configuration (API keys, models) is an admin-only feature
router.use(authMiddleware, roleMiddleware(['admin']));

/**
 * @swagger
 * components:
 *   schemas:
 *     AiConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         model_name:
 *           type: string
 *         api_key:
 *           type: string
 *         type:
 *           type: string
 *           enum: [gemini, openai]
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
 *   name: AiConfigs
 *   description: Management of AI models and API keys
 */

/**
 * @swagger
 * /api/ai-configs:
 *   get:
 *     summary: Get all AI configurations
 *     tags: [AiConfigs]
 *     responses:
 *       200:
 *         description: List of AI configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AiConfig'
 */

/**
 * @swagger
 * /api/ai-configs/{id}:
 *   get:
 *     summary: Get a specific AI configuration by id
 *     tags: [AiConfigs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI configuration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiConfig'
 *       404:
 *         description: AI Config not found
 */

/**
 * @swagger
 * /api/ai-configs:
 *   post:
 *     summary: Create a new AI configuration
 *     tags: [AiConfigs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_name
 *               - api_key
 *               - type
 *             properties:
 *               model_name:
 *                 type: string
 *               api_key:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [gemini, openai]
 *     responses:
 *       201:
 *         description: AI configuration created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiConfig'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/ai-configs/{id}:
 *   put:
 *     summary: Update an AI configuration
 *     tags: [AiConfigs]
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
 *               - model_name
 *               - api_key
 *               - type
 *             properties:
 *               model_name:
 *                 type: string
 *               api_key:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [gemini, openai]
 *     responses:
 *       200:
 *         description: AI configuration updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiConfig'
 *       404:
 *         description: AI Config not found
 */

/**
 * @swagger
 * /api/ai-configs/{id}:
 *   delete:
 *     summary: Soft delete an AI configuration
 *     tags: [AiConfigs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI configuration deleted
 *       404:
 *         description: AI Config not found
 */

router.get('/', aiConfigController.getAllConfigs);
router.get('/:id', aiConfigController.getConfigById);
router.post('/', aiConfigController.createConfig);
router.put('/:id', aiConfigController.updateConfig);
router.delete('/:id', aiConfigController.deleteConfig);

module.exports = router;
