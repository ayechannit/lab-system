const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AiService {
  static async generate({ config, systemPrompt, message, history = [], stream = false, res }) {
    if (config.type === 'openai') {
      return this._generateOpenAI({ config, systemPrompt, message, history, stream, res });
    } else if (config.type === 'gemini') {
      return this._generateGemini({ config, systemPrompt, message, history, stream, res });
    } else {
      throw new Error('Unsupported AI type');
    }
  }

  static async _generateOpenAI({ config, systemPrompt, message, history, stream, res }) {
    const openai = new OpenAI({ apiKey: config.api_key });
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Add history (assuming standard format: { role: 'user' | 'assistant', content: '...' })
    if (history && history.length > 0) {
      messages.push(...history);
    }
    
    messages.push({ role: 'user', content: message });

    if (stream) {
      const response = await openai.chat.completions.create({
        model: config.model_name,
        messages: messages,
        stream: true,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = await openai.chat.completions.create({
        model: config.model_name,
        messages: messages,
      });
      return response.choices[0].message.content;
    }
  }

  static async _generateGemini({ config, systemPrompt, message, history, stream, res }) {
    const genAI = new GoogleGenerativeAI(config.api_key);
    
    // Pass system instructions if using gemini-1.5 or compatible models
    const modelOptions = { model: config.model_name };
    if (systemPrompt) {
      modelOptions.systemInstruction = systemPrompt;
    }
    
    const model = genAI.getGenerativeModel(modelOptions);

    // Map standard history to Gemini format
    const geminiHistory = (history || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: geminiHistory,
    });

    if (stream) {
      const result = await chat.sendMessageStream(message);
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await chat.sendMessage(message);
      return result.response.text();
    }
  }
}

module.exports = AiService;
