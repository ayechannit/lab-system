const AiConfig = require('../models/aiConfigModel');
const Prompt = require('../models/promptModel');
const AiService = require('../services/aiService');

const chat = async (req, res) => {
  try {
    const { ai_config_id, prompt_id, message, history, stream } = req.body;

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
      await AiService.generate({ config, systemPrompt, message, history, stream: true, res });
    } else {
      // In normal mode, we wait for the full response and return it as JSON.
      const reply = await AiService.generate({ config, systemPrompt, message, history, stream: false });
      res.json({ reply });
    }
  } catch (error) {
    if (req.body.stream) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = {
  chat
};
