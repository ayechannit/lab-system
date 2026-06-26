const Advertisement = require('../models/advertisementModel');

const getAllAdvertisements = async (req, res) => {
  try {
    const ads = await Advertisement.getAll(req.query);
    res.json(ads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAdvertisementById = async (req, res) => {
  try {
    const ad = await Advertisement.getById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Advertisement not found' });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createAdvertisement = async (req, res) => {
  try {
    const { title, description, image_url, action_url, start_date, end_date, is_active } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const ad = await Advertisement.create({ title, description, image_url, action_url, start_date, end_date, is_active }, req.user?.id);
    res.status(201).json(ad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAdvertisement = async (req, res) => {
  try {
    const { title, description, image_url, action_url, start_date, end_date, is_active } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const ad = await Advertisement.update(req.params.id, { title, description, image_url, action_url, start_date, end_date, is_active }, req.user?.id);
    if (!ad) return res.status(404).json({ message: 'Advertisement not found' });
    res.json(ad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAdvertisement = async (req, res) => {
  try {
    const success = await Advertisement.delete(req.params.id, req.user?.id);
    if (!success) return res.status(404).json({ message: 'Advertisement not found' });
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
};
