const MembershipTier = require('../models/membershipTierModel');

function validateTierInput(body) {
  const { name, min_spend_mmk, discount_percent } = body;

  if (typeof name !== 'string' || name.trim() === '') {
    return 'name is required and must be a non-empty string';
  }

  const minSpend = Number(min_spend_mmk);
  if (min_spend_mmk === undefined || min_spend_mmk === null || !Number.isFinite(minSpend) || minSpend < 0) {
    return 'min_spend_mmk is required and must be a number >= 0';
  }

  const discountPercent = Number(discount_percent);
  if (
    discount_percent === undefined ||
    discount_percent === null ||
    !Number.isFinite(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 100
  ) {
    return 'discount_percent is required and must be a number between 0 and 100';
  }

  return null;
}

const getAllTiers = async (req, res) => {
  try {
    const tiers = await MembershipTier.getAll();
    res.json(tiers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTier = async (req, res) => {
  try {
    const { name, min_spend_mmk, discount_percent, is_active } = req.body;
    const validationError = validateTierInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const tierData = { name, min_spend_mmk, discount_percent, is_active };
    const tier = await MembershipTier.create(tierData, req.user?.id);
    res.status(201).json(tier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateTier = async (req, res) => {
  try {
    const { name, min_spend_mmk, discount_percent, is_active } = req.body;
    const validationError = validateTierInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const tierData = { name, min_spend_mmk, discount_percent, is_active };
    const tier = await MembershipTier.update(req.params.id, tierData, req.user?.id);
    if (!tier) return res.status(404).json({ message: 'Membership tier not found' });
    res.json(tier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteTier = async (req, res) => {
  try {
    const success = await MembershipTier.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Membership tier not found' });
    res.json({ message: 'Membership tier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllTiers,
  createTier,
  updateTier,
  deleteTier
};
