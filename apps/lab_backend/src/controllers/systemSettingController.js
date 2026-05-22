const SystemSetting = require('../models/systemSettingModel');
const StorageService = require('../utils/storageService');

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

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo image uploaded.' });
    }

    const fileKey = await StorageService.uploadFile(req.file, 'branding');
    const fileUrl = (await StorageService.getFileUrl(fileKey)) || fileKey;
    const existing = await SystemSetting.getSettings();
    const data = existing
      ? { ...SystemSetting.toUpdatePayload(existing), logo_url: fileUrl }
      : SystemSetting.defaultUpdatePayload({ logo_url: fileUrl });

    const settings = await SystemSetting.updateSettings(data, req.user?.id);
    res.json(settings);
  } catch (error) {
    next(error);
  }
};
