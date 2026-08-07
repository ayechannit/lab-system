const ReferralFee = require('../models/referralFeeModel');

const getAllReferralFees = async (req, res) => {
  try {
    const fees = await ReferralFee.getAll(req.query);
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** Authenticated patients + staff — active rates for live order pricing (not staff CRUD). */
const getActiveReferralRates = async (req, res) => {
  try {
    const rates = await ReferralFee.getActive();
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReferralFeeReport = async (req, res) => {
  try {
    const report = await ReferralFee.getOrderReport(req.query);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReferralFeesByTestId = async (req, res) => {
  try {
    const fees = await ReferralFee.getByTestId(req.params.test_id);
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upsertReferralFee = async (req, res) => {
  try {
    const { test_id, referral_percent, is_active } = req.body;
    if (!test_id || referral_percent === undefined) {
      return res.status(400).json({ message: 'test_id and referral_percent are required' });
    }
    const referralData = { test_id, referral_percent, is_active };
    const result = await ReferralFee.upsert(referralData, req.user?.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUpsertReferralFees = async (req, res) => {
  try {
    const { referral_fees } = req.body;

    if (!Array.isArray(referral_fees) || referral_fees.length === 0) {
      return res.status(400).json({ message: 'A non-empty referral_fees array is required' });
    }

    // Basic validation for each item
    for (const r of referral_fees) {
      if (!r.test_id || r.referral_percent === undefined) {
        return res.status(400).json({ message: 'Each referral fee must have test_id and referral_percent' });
      }
    }

    const result = await ReferralFee.bulkUpsert(referral_fees, req.user?.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteReferralFee = async (req, res) => {
  try {
    const success = await ReferralFee.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Referral fee entry not found' });
    res.json({ message: 'Referral fee entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllReferralFees,
  getActiveReferralRates,
  getReferralFeeReport,
  getReferralFeesByTestId,
  upsertReferralFee,
  bulkUpsertReferralFees,
  deleteReferralFee,
};
