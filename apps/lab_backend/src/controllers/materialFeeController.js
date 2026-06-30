const MaterialFee = require('../models/materialFeeModel');

const getAllFees = async (req, res) => {
  try {
    const fees = await MaterialFee.getAll();
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActiveFees = async (req, res) => {
  try {
    const fees = await MaterialFee.getActive();
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const fee = await MaterialFee.getById(id);
    if (!fee) {
      return res.status(404).json({ message: 'Material fee not found' });
    }
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFee = async (req, res) => {
  try {
    const { name, amount_mmk, is_active } = req.body;
    if (!name || amount_mmk == null) {
      return res.status(400).json({ message: 'name and amount_mmk are required' });
    }

    const feeData = { name, amount_mmk: parseFloat(amount_mmk), is_active };
    const newFee = await MaterialFee.create(feeData, req.user?.id);
    res.status(201).json(newFee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount_mmk, is_active } = req.body;
    if (!name || amount_mmk == null) {
      return res.status(400).json({ message: 'name and amount_mmk are required' });
    }

    const feeData = { name, amount_mmk: parseFloat(amount_mmk), is_active };
    const updatedFee = await MaterialFee.update(id, feeData, req.user?.id);
    if (!updatedFee) {
      return res.status(404).json({ message: 'Material fee not found or deleted' });
    }
    res.json(updatedFee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFee = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await MaterialFee.delete(id, req.user?.id);
    if (!success) {
      return res.status(404).json({ message: 'Material fee not found or deleted' });
    }
    res.json({ message: 'Material fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllFees,
  getActiveFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee
};
