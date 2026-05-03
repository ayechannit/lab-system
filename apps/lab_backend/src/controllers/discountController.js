const Discount = require('../models/discountModel');

const getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.getAll();
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

const upsertDiscount = async (req, res) => {
  try {
    const result = await Discount.upsert(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const success = await Discount.delete(req.params.id);
    if (!success) return res.status(404).json({ message: 'Discount not found' });
    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountsByTestId,
  upsertDiscount,
  deleteDiscount,
};
