const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const conversationController = require('../controllers/conversationController');
const upload = require('../middlewares/upload');

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
 *     summary: Send a message to an AI model and get a response (supports optional PDF or image upload)
 *     tags: [Conversations]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *                 type: string
 *                 description: Optional conversation history (JSON string)
 *               stream:
 *                 type: boolean
 *                 description: If true, returns a Server-Sent Events (SSE) stream. If false, returns a standard JSON response.
 *                 default: false
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional PDF or image file (JPEG, PNG, WEBP)
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
router.post('/', upload.single('file'), conversationController.chat);

/**
 * @swagger
 * /api/conversations/history:
 *   get:
 *     summary: Get conversation history for the logged-in user
 *     tags: [Conversations]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of conversation message pairs to retrieve
 *     responses:
 *       200:
 *         description: A list of conversation message pairs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   user_id:
 *                     type: string
 *                     format: uuid
 *                   user_message:
 *                     type: string
 *                   ai_response:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Clear conversation history for the logged-in user
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: Conversation history cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/history', conversationController.getHistory);
router.delete('/history', conversationController.clearHistory);

module.exports = router;
