const AiConfig = require('../models/aiConfigModel');
const Prompt = require('../models/promptModel');
const Conversation = require('../models/conversationModel');
const AiService = require('../services/aiService');
const fs = require('fs');

function extractFileKeyFromUrl(urlStr) {
  if (!urlStr) return null;
  const trimmed = urlStr.trim();
  try {
    const url = new URL(trimmed);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }
    if (pathname.startsWith('uploads/')) {
      return '/' + pathname;
    }
    return pathname;
  } catch {
    return trimmed;
  }
}

/**
 * Handle AI chat request, storing history in the database.
 */
const chat = async (req, res) => {
  let filePath = null;
  try {
    let { ai_config_id, prompt_id, message, stream, file_url } = req.body;
    let file = req.file;

    // If file is not uploaded via multipart but file_url is provided, download/open the file directly on the backend
    if (!file && file_url) {
      const StorageService = require('../utils/storageService');
      const opened = await StorageService.openFile(extractFileKeyFromUrl(file_url));
      if (opened) {
        const path = require('path');
        const os = require('os');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const tempPath = path.join(os.tmpdir(), 'conv-' + uniqueSuffix + '-' + opened.filename);
        
        // Write stream to temp file so it matches Multer's file structure
        const writeStream = fs.createWriteStream(tempPath);
        await new Promise((resolve, reject) => {
          opened.stream.pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        
        file = {
          path: tempPath,
          filename: opened.filename,
          mimetype: opened.contentType
        };
        filePath = tempPath;
      }
    }

    if (file && !filePath) filePath = file.path;

    // When using multipart/form-data, boolean fields might come as strings
    if (typeof stream === 'string') stream = stream === 'true';

    if (!ai_config_id || !message) {
      return res.status(400).json({ message: 'ai_config_id and message are required' });
    }

    const config = await AiConfig.getById(ai_config_id);
    if (!config) {
      return res.status(404).json({ message: 'AI Config not found' });
    }

    let systemPrompt = null;
    if (prompt_id) {
      const promptRecord = await Prompt.getById(prompt_id);
      if (!promptRecord) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      systemPrompt = promptRecord.prompt_text;
    }

    const userId = req.user.id;

    // Fetch previous chat history from the database
    const dbHistoryRecords = await Conversation.getHistoryByUserId(userId);
    const history = [];
    for (const record of dbHistoryRecords) {
      history.push({ role: 'user', content: record.user_message });
      history.push({ role: 'assistant', content: record.ai_response });
    }

    if (stream) {
      // In stream mode, the service handles writing and closing the response directly via SSE.
      // We pass an onComplete callback to store the conversation message pair in the database.
      await AiService.generate({
        config,
        systemPrompt,
        message,
        history,
        stream: true,
        res,
        file,
        onComplete: async (reply) => {
          await Conversation.create(userId, message, reply);
        }
      });
    } else {
      // In normal mode, we wait for the full response, save it to the database, and return it as JSON.
      const reply = await AiService.generate({
        config,
        systemPrompt,
        message,
        history,
        stream: false,
        file
      });

      await Conversation.create(userId, message, reply);
      res.json({ reply });
    }
  } catch (error) {
    if (req.body.stream === 'true' || req.body.stream === true) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    // Clean up uploaded file if it exists
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete temporary file:', err);
      }
    }
  }
};

/**
 * Get all conversation history for the logged-in user.
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const history = await Conversation.getHistoryByUserId(userId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Clear conversation history for the logged-in user.
 */
const clearHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    await Conversation.clearHistoryByUserId(userId);
    res.json({ message: 'Conversation history cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  chat,
  getHistory,
  clearHistory
};
