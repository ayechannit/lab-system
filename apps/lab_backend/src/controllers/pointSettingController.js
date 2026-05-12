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
    const { name, spend_amount_mmk, points_reward, start_date, end_date, is_active } = req.body;
    if (!name || spend_amount_mmk === undefined || points_reward === undefined) {
       return res.status(400).json({ message: 'name, spend_amount_mmk, and points_reward are required' });
    }
    const settingData = { name, spend_amount_mmk, points_reward, start_date, end_date, is_active };
    const setting = await PointSetting.create(settingData, req.user?.id);
    res.status(201).json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { name, spend_amount_mmk, points_reward, start_date, end_date, is_active } = req.body;
    const settingData = { name, spend_amount_mmk, points_reward, start_date, end_date, is_active };
    const setting = await PointSetting.update(req.params.id, settingData, req.user?.id);
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