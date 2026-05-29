const LabResult = require('../models/labResultModel');
const AiQualityCheck = require('../models/aiQualityCheckModel');

exports.createResult = async (req, res, next) => {
  try {
    const result = await LabResult.create(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.getResultByOrderId = async (req, res, next) => {
  try {
    const result = await LabResult.getByOrderId(req.params.orderId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.updateQualityCheck = async (req, res, next) => {
  try {
    const success = await LabResult.updateQualityCheck(req.params.id, req.body.quality_checked, req.user.id);
    res.json({
      success,
      message: success ? 'Quality check updated' : 'Update failed'
    });
  } catch (error) {
    next(error);
  }
};

exports.addAiQualityCheck = async (req, res, next) => {
  try {
    const aiCheck = await AiQualityCheck.create({
      ...req.body,
      result_id: req.params.resultId
    }, req.user.id);
    res.status(201).json({
      success: true,
      data: aiCheck
    });
  } catch (error) {
    next(error);
  }
};
