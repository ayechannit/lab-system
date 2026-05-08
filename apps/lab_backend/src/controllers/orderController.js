const Order = require('../models/orderModel');
const QRCode = require('qrcode');
const StorageService = require('../utils/storageService');

const getAllOrders = async (req, res) => {
  const orders = await Order.getAll(req.query);
  res.json(orders);
};

const getOrderById = async (req, res) => {
  const order = await Order.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  
  // Convert local relative paths or S3 keys to full URLs for download
  if (order.items && order.items.length > 0) {
    for (let item of order.items) {
      if (item.result_file_url) {
        item.download_url = await StorageService.getFileUrl(item.result_file_url);
      }
    }
  }

  res.json(order);
};

const createOrder = async (req, res) => {
  const order = await Order.create(req.body);
  res.status(201).json(order);
};

const updateOrderStatus = async (req, res) => {
  const { status, staff_id, note } = req.body;
  const order = await Order.updateStatus(req.params.id, status, staff_id, note);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
};

const deleteOrder = async (req, res) => {
  const success = await Order.delete(req.params.id);
  if (!success) return res.status(404).json({ message: 'Order not found' });
  res.json({ message: 'Order deleted successfully' });
};

const generateQrCode = async (req, res) => {
  try {
    const { id, testId } = req.params;
    const details = await Order.getQrDetails(id, testId);

    if (!details) {
      return res.status(404).json({ message: 'Order or test not found' });
    }

    const qrData = `Patient Name: ${details.patient_name}\nAge: ${details.patient_age}\nPhone: ${details.patient_phone}\nAddress: ${details.address}\nTest Name: ${details.test_name}\nTest Code: ${details.test_code}`;

    const qrCodeImage = await QRCode.toDataURL(qrData);
    res.json({ qrCodeImage, details });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadTestResult = async (req, res) => {
  try {
    const { id, testId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file format' });
    }

    // Verify order exists before saving
    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const fileUrl = await StorageService.uploadFile(req.file);
    const success = await Order.uploadResult(id, testId, fileUrl);

    if (!success) {
      return res.status(404).json({ message: 'Test not found in this order' });
    }

    const downloadUrl = await StorageService.getFileUrl(fileUrl);

    res.json({ 
      message: 'Result uploaded successfully',
      fileUrl: fileUrl,
      downloadUrl: downloadUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  generateQrCode,
  uploadTestResult,
};
