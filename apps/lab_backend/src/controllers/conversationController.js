const AiConfig = require('../models/aiConfigModel');
const Prompt = require('../models/promptModel');
const AiService = require('../services/aiService');
const fs = require('fs');

const chat = async (req, res) => {
  let filePath = null;
  try {
    let { ai_config_id, prompt_id, message, history, stream } = req.body;
    const file = req.file;
    if (file) filePath = file.path;

    // When using multipart/form-data, boolean and array fields might come as strings
    if (typeof stream === 'string') stream = stream === 'true';
    if (typeof history === 'string') {
      try {
        history = JSON.parse(history);
      } catch (e) {
        history = [];
      }
    }

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

    if (stream) {
      // In stream mode, the service handles writing and closing the response directly via SSE.
      await AiService.generate({ config, systemPrompt, message, history, stream: true, res, file });
    } else {
      // In normal mode, we wait for the full response and return it as JSON.
      const reply = await AiService.generate({ config, systemPrompt, message, history, stream: false, file });
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

module.exports = {
  chat
};
