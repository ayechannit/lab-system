const PointSetting = require('../models/pointSettingModel');

const getAllSettings = async (req, res) => {
  try {
    const settings = await PointSetting.getAll();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSetting = async (req, res) => {
  try {
    const setting = await PointSetting.create(req.body, req.user?.id);
    res.status(201).json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateSetting = async (req, res) => {
  try {
    const setting = await PointSetting.update(req.params.id, req.body, req.user?.id);
    if (!setting) return res.status(404).json({ message: 'Point setting not found' });
    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteSetting = async (req, res) => {
  try {
    const success = await PointSetting.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Point setting not found' });
    res.json({ message: 'Point setting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllSettings,
  createSetting,
  updateSetting,
  deleteSetting
};