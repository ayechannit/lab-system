const Discount = require('../models/discountModel');
const LabTest = require('../models/testModel');
const NotificationService = require('../services/notificationService');

/**
 * Broadcast a "new discount" push notification when an upserted discount is active.
 * Mirrors the pre-role-removal behavior, but simplified to a single flat 'all_users'
 * topic instead of per-role topics (the role dimension no longer exists).
 */
const notifyDiscountActive = async (discount) => {
  try {
    if (!discount || !discount.is_active) return;
    const test = await LabTest.getById(discount.test_id);
    const testName = test ? test.test_name : 'a lab test';
    await NotificationService.sendToTopic(
      'all_users',
      'New Special Discount!',
      `Get ${discount.discount_percent}% off on our "${testName}" lab test! Book your test today.`,
      {
        test_id: discount.test_id,
        discount_percent: String(discount.discount_percent),
        event: 'new_discount',
      },
    );
  } catch (error) {
    console.error('Failed to send discount notification:', error.message);
  }
};

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

const upsertDiscount = async (req, res) => {
  try {
    const { test_id, discount_percent, is_active, start_date, end_date } = req.body;
    if (!test_id || discount_percent === undefined) {
      return res.status(400).json({ message: 'test_id and discount_percent are required' });
    }
    const discountData = { test_id, discount_percent, is_active, start_date, end_date };
    const result = await Discount.upsert(discountData, req.user?.id);
    await notifyDiscountActive(result);
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
      if (!d.test_id || d.discount_percent === undefined) {
        return res.status(400).json({ message: 'Each discount must have test_id and discount_percent' });
      }
    }

    const result = await Discount.bulkUpsert(discounts, req.user?.id);
    for (const discount of result) {
      await notifyDiscountActive(discount);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const success = await Discount.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Discount entry not found' });
    res.json({ message: 'Discount entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountsByTestId,
  upsertDiscount,
  bulkUpsertDiscounts,
  deleteDiscount,
};
