const LabTest = require('../models/testModel');

const getAllTests = async (req, res) => {
  try {
    const { role, ...filters } = req.query;
    let tests;
    if (role) {
      tests = await LabTest.getAllWithDiscounts(role, filters);
    } else {
      tests = await LabTest.getAll(req.query);
    }
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
    const test = await LabTest.create(req.body, req.user?.id);
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTest = async (req, res) => {
  try {
    const test = await LabTest.update(req.params.id, req.body, req.user?.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (error) {
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
