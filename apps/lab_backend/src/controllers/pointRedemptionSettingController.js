const PointRedemptionSetting = require('../models/pointRedemptionSettingModel');

const getSetting = async (req, res) => {
  try {
    const setting = await PointRedemptionSetting.get();
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { mmk_per_point } = req.body;
    const mmkPerPoint = Number(mmk_per_point);
    if (mmk_per_point === undefined || mmk_per_point === null || !Number.isFinite(mmkPerPoint) || mmkPerPoint < 0) {
      return res.status(400).json({ message: 'mmk_per_point must be a finite number >= 0' });
    }

    const setting = await PointRedemptionSetting.update(mmkPerPoint, req.user?.id);
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSetting,
  updateSetting,
};
