const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

class AiService {
  static async generate({ config, systemPrompt, message, history = [], stream = false, res, file }) {
    if (config.type === 'openai') {
      return this._generateOpenAI({ config, systemPrompt, message, history, stream, res, file });
    } else if (config.type === 'gemini') {
      return this._generateGemini({ config, systemPrompt, message, history, stream, res, file });
    } else {
      throw new Error('Unsupported AI type');
    }
  }

  static async _generateOpenAI({ config, systemPrompt, message, history, stream, res, file }) {
    const openai = new OpenAI({ apiKey: config.api_key });
    
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Add history
    if (history && history.length > 0) {
      messages.push(...history);
    }
    
    let userContent = message;
    if (file) {
      if (file.mimetype.startsWith('image/')) {
        const base64Image = fs.readFileSync(file.path).toString('base64');
        userContent = [
          { type: 'text', text: message },
          {
            type: 'image_url',
            image_url: {
              url: `data:${file.mimetype};base64,${base64Image}`
            }
          }
        ];
      } else if (file.mimetype === 'application/pdf') {
        throw new Error('PDF upload is not directly supported for OpenAI chat completions. Please use Gemini for PDF analysis.');
      }
    }

    messages.push({ role: 'user', content: userContent });

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

  static async _generateGemini({ config, systemPrompt, message, history, stream, res, file }) {
    const genAI = new GoogleGenerativeAI(config.api_key);
    
    const modelOptions = { model: config.model_name };
    if (systemPrompt) {
      modelOptions.systemInstruction = systemPrompt;
    }
    
    const model = genAI.getGenerativeModel(modelOptions);

    const geminiHistory = (history || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: geminiHistory,
    });

    const messageParts = [message];
    if (file) {
      const fileData = {
        inlineData: {
          data: fs.readFileSync(file.path).toString('base64'),
          mimeType: file.mimetype
        }
      };
      messageParts.push(fileData);
    }

    if (stream) {
      const result = await chat.sendMessageStream(messageParts);
      
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
      const result = await chat.sendMessage(messageParts);
      return result.response.text();
    }
  }
}

module.exports = AiService;
