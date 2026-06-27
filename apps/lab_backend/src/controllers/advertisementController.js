const Advertisement = require('../models/advertisementModel');
const StorageService = require('../utils/storageService');

async function enrichAdvertisementImage(ad) {
  if (!ad) return ad;
  const row = { ...ad };
  if (!row.image_url) return row;
  try {
    const resolved = StorageService.getPublicStreamUrl(row.image_url);
    if (resolved) row.image_display_url = resolved;
  } catch (err) {
    console.error('Failed to resolve advertisement image_url:', err.message);
  }
  return row;
}

async function enrichAdvertisementImages(ads) {
  if (!Array.isArray(ads)) return ads;
  return Promise.all(ads.map((ad) => enrichAdvertisementImage(ad)));
}

const getAllAdvertisements = async (req, res) => {
  try {
    const ads = await Advertisement.getAll(req.query);
    res.json(await enrichAdvertisementImages(ads));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAdvertisementById = async (req, res) => {
  try {
    const ad = await Advertisement.getById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Advertisement not found' });
    res.json(await enrichAdvertisementImage(ad));
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
    res.status(201).json(await enrichAdvertisementImage(ad));
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
    res.json(await enrichAdvertisementImage(ad));
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

const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const fileKey = await StorageService.uploadFile(req.file, 'advertisements');
    const imageDisplayUrl = StorageService.getPublicStreamUrl(fileKey) || fileKey;

    res.json({
      message: 'Banner image uploaded successfully',
      image_url: fileKey,
      image_display_url: imageDisplayUrl,
    });
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
  uploadBannerImage,
};
