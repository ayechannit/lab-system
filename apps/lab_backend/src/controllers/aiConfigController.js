const AiConfig = require('../models/aiConfigModel');

const getAllConfigs = async (req, res) => {
  try {
    const configs = await AiConfig.getAll();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getConfigById = async (req, res) => {
  try {
    const config = await AiConfig.getById(req.params.id);
    if (!config) return res.status(404).json({ message: 'AI Config not found' });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createConfig = async (req, res) => {
  try {
    const { model_name, api_key, type } = req.body;
    
    if (!model_name || !api_key || !type) {
      return res.status(400).json({ message: 'model_name, api_key, and type are required' });
    }

    if (type !== 'gemini' && type !== 'openai') {
      return res.status(400).json({ message: 'type must be either "gemini" or "openai"' });
    }

    const configData = { model_name, api_key, type };
    const config = await AiConfig.create(configData, req.user?.id);
    
    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { model_name, api_key, type } = req.body;

    if (!model_name || !api_key || !type) {
      return res.status(400).json({ message: 'model_name, api_key, and type are required' });
    }

    if (type !== 'gemini' && type !== 'openai') {
      return res.status(400).json({ message: 'type must be either "gemini" or "openai"' });
    }

    const configData = { model_name, api_key, type };
    const config = await AiConfig.update(req.params.id, configData, req.user?.id);
    
    if (!config) return res.status(404).json({ message: 'AI Config not found' });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteConfig = async (req, res) => {
  try {
    const success = await AiConfig.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'AI Config not found' });
    res.json({ message: 'AI Config deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
};
