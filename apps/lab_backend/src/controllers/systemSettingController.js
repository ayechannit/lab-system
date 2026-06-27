const SystemSetting = require('../models/systemSettingModel');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await SystemSetting.updateSettings(req.body, req.user?.id);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.resetToDefaults = async (req, res, next) => {
  try {
    const settings = await SystemSetting.updateSettings(
      SystemSetting.defaultUpdatePayload(),
      req.user?.id,
    );
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

exports.uploadLogo = async (req, res) => {
  res.status(403).json({ message: 'Lab logo cannot be changed.' });
};
