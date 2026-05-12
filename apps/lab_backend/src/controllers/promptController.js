const Prompt = require('../models/promptModel');

const getAllPrompts = async (req, res) => {
  try {
    const prompts = await Prompt.getAll();
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPromptById = async (req, res) => {
  try {
    const prompt = await Prompt.getById(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createPrompt = async (req, res) => {
  try {
    const { name, prompt_text } = req.body;
    
    if (!name || !prompt_text) {
      return res.status(400).json({ message: 'name and prompt_text are required' });
    }

    const promptData = { name, prompt_text };
    const prompt = await Prompt.create(promptData, req.user?.id);
    
    res.status(201).json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePrompt = async (req, res) => {
  try {
    const { name, prompt_text } = req.body;

    if (!name || !prompt_text) {
      return res.status(400).json({ message: 'name and prompt_text are required' });
    }

    const promptData = { name, prompt_text };
    const prompt = await Prompt.update(req.params.id, promptData, req.user?.id);
    
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deletePrompt = async (req, res) => {
  try {
    const success = await Prompt.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Prompt not found' });
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllPrompts,
  getPromptById,
  createPrompt,
  updatePrompt,
  deletePrompt,
};
