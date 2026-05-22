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

  if (order.prescription_url) {
    order.prescription_download_url = await StorageService.getFileUrl(order.prescription_url);
  }

  res.json(order);
};

const createOrder = async (req, res) => {
  try {
    const { 
      user_id, description, priority, patient_name, patient_age, patient_phone, 
      address, latitude, longitude, status, report_delivery_method, 
      original_price_mmk, discount_percent, final_price_mmk, items 
    } = req.body;

    if (!user_id || !priority || !patient_name || !patient_age || !patient_phone || !address || !report_delivery_method) {
      return res.status(400).json({ message: 'user_id, priority, patient_name, patient_age, patient_phone, address, and report_delivery_method are required' });
    }

    const orderData = { 
      user_id, description, priority, patient_name, patient_age, patient_phone, 
      address, latitude, longitude, status, report_delivery_method, 
      original_price_mmk, discount_percent, final_price_mmk, items 
    };
    
    // Parse items if it's a string (from multipart/form-data)
    if (typeof orderData.items === 'string') {
      try {
        orderData.items = JSON.parse(orderData.items);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid items format' });
      }
    }

    if (req.file) {
      const fileUrl = await StorageService.uploadFile(req.file);
      orderData.prescription_url = fileUrl;
    }

    const order = await Order.create(orderData, req.user?.id);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, original_price_mmk, discount_percent, final_price_mmk } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const totals = {
      original_price_mmk: original_price_mmk || 0,
      discount_percent: discount_percent || 0,
      final_price_mmk: final_price_mmk || 0
    };

    const updatedOrder = await Order.addItemsAndUpdateTotals(id, items, totals, req.user?.id);
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status, staff_id, note } = req.body;
  const order = await Order.updateStatus(req.params.id, status, staff_id || req.user?.id, note, req.user?.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
};

const deleteOrder = async (req, res) => {
  const success = await Order.delete(req.params.id, req.user?.id);
  if (!success) return res.status(404).json({ message: 'Order not found' });
  res.json({ message: 'Order deleted successfully' });
};

const generateQrCode = async (req, res) => {
  try {
    const { id } = req.params;
    const details = await Order.getQrDetails(id);

    if (!details) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const testsStr = details.tests.map(t => `${t.test_name} (${t.test_code})`).join(', ');
    const qrData = `Patient Name: ${details.patient_name}\nAge: ${details.patient_age}\nPhone: ${details.patient_phone}\nAddress: ${details.address}\nTests: ${testsStr}`;

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
    const success = await Order.uploadResult(id, testId, fileUrl, req.user?.id);

    if (!success) {
      return res.status(404).json({ message: 'Test not found in this order' });
    }

    // Check if all results are uploaded for this order
    const allUploaded = await Order.areAllResultsUploaded(id);
    if (allUploaded) {
      // Automatically update order status to delivered
      try {
        await Order.updateStatus(
          id, 
          'delivered', 
          req.user?.id, 
          'All test results uploaded - automatically marked as delivered',
          req.user?.id
        );
      } catch (statusError) {
        console.error('Failed to auto-update order status:', statusError);
        // We don't want to fail the whole request if only status update fails, 
        // but maybe we should? The result IS uploaded.
      }
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
  addOrderItems,
  updateOrderStatus,
  deleteOrder,
  generateQrCode,
  uploadTestResult,
};
