const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const conversationController = require('../controllers/conversationController');

// Ensure all routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: AI chat and conversations supporting streaming and non-streaming responses
 */

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Send a message to an AI model and get a response
 *     tags: [Conversations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ai_config_id
 *               - message
 *             properties:
 *               ai_config_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the AI Config to use (API Key, Model Name, Type)
 *               prompt_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional ID of the Prompt to use as system context
 *               message:
 *                 type: string
 *                 description: The user's input message
 *               history:
 *                 type: array
 *                 description: Optional conversation history
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               stream:
 *                 type: boolean
 *                 description: If true, returns a Server-Sent Events (SSE) stream. If false, returns a standard JSON response.
 *                 default: false
 *     responses:
 *       200:
 *         description: Successful response. If stream=true, Content-Type is text/event-stream. If stream=false, returns JSON.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Validation error (missing ai_config_id or message)
 *       404:
 *         description: AI Config or Prompt not found
 */
router.post('/', conversationController.chat);

module.exports = router;
