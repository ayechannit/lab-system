const Report = require('../models/reportModel');

exports.getDashboardKpis = async (req, res, next) => {
  try {
    const data = await Report.getDashboardKpis(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getTestCategoryDistribution = async (req, res, next) => {
  try {
    const data = await Report.getTestCategoryDistribution(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getTurnaroundTimeReport = async (req, res, next) => {
  try {
    const data = await Report.getTurnaroundTimeReport(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getRevenueByChannel = async (req, res, next) => {
  try {
    const data = await Report.getRevenueByChannel(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingResultsQueue = async (req, res, next) => {
  try {
    const data = await Report.getPendingResultsQueue(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getStaffActivityAudit = async (req, res, next) => {
  try {
    const data = await Report.getStaffActivityAudit(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getDiscountImpactAnalysis = async (req, res, next) => {
  try {
    const data = await Report.getDiscountImpactAnalysis(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getRatingsSummary = async (req, res, next) => {
  try {
    const data = await Report.getRatingsSummary(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getCollectionReport = async (req, res, next) => {
  try {
    const data = await Report.getCollectionReport(req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await Report.getUserReport(userId, req.query);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
