const Discount = require('../models/discountModel');

const getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.getAll(req.query);
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDiscountsByTestId = async (req, res) => {
  try {
    const discounts = await Discount.getByTestId(req.params.test_id);
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDiscountByTestIdAndRole = async (req, res) => {
  try {
    const { test_id, role } = req.params;
    const discount = await Discount.getByTestIdAndRole(test_id, role);
    if (!discount) return res.status(404).json({ message: 'Discount not found for this test and role' });
    res.json(discount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const upsertDiscount = async (req, res) => {
  try {
    const { test_id, role, discount_percent, is_active } = req.body;
    if (!test_id || !role || discount_percent === undefined) {
      return res.status(400).json({ message: 'test_id, role, and discount_percent are required' });
    }
    const discountData = { test_id, role, discount_percent, is_active };
    const result = await Discount.upsert(discountData, req.user?.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const bulkUpsertDiscounts = async (req, res) => {
  try {
    const { discounts } = req.body;
    
    if (!Array.isArray(discounts) || discounts.length === 0) {
      return res.status(400).json({ message: 'A non-empty discounts array is required' });
    }

    // Basic validation for each item
    for (const d of discounts) {
      if (!d.test_id || !d.role || d.discount_percent === undefined) {
        return res.status(400).json({ message: 'Each discount must have test_id, role, and discount_percent' });
      }
    }

    const result = await Discount.bulkUpsert(discounts, req.user?.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const success = await Discount.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Discount not found' });
    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountsByTestId,
  getDiscountByTestIdAndRole,
  upsertDiscount,
  bulkUpsertDiscounts,
  deleteDiscount,
};
