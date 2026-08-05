const LabTest = require('../models/testModel');

const getAllTests = async (req, res) => {
  try {
    const tests = await LabTest.getAll(req.query);
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTestById = async (req, res) => {
  try {
    const test = await LabTest.getById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTest = async (req, res) => {
  try {
    const { test_name, test_code, description, base_price_mmk, category, is_active, is_package, package_items } = req.body;
    if (!test_name || !test_code || base_price_mmk === undefined) {
       return res.status(400).json({ message: 'test_name, test_code, and base_price_mmk are required' });
    }
    const testData = { test_name, test_code, description, base_price_mmk, category, is_active, is_package, package_items };
    const test = await LabTest.create(testData, req.user?.id);
    res.status(201).json(test);
  } catch (error) {
    if (error.message.includes('UNIQUE KEY')) {
      return res.status(400).json({ message: 'Test code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateTest = async (req, res) => {
  try {
    const { test_name, test_code, description, base_price_mmk, category, is_active, is_package, package_items } = req.body;
    const testData = { test_name, test_code, description, base_price_mmk, category, is_active, is_package, package_items };
    const test = await LabTest.update(req.params.id, testData, req.user?.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
    if (error.message.includes('UNIQUE KEY')) {
      return res.status(400).json({ message: 'Test code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

const deleteTest = async (req, res) => {
  try {
    const success = await LabTest.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Test not found' });
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
};
