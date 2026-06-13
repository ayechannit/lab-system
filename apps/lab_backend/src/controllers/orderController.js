const Order = require('../models/orderModel');
const QRCode = require('qrcode');
const StorageService = require('../utils/storageService');
const NotificationService = require('../services/notificationService');

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
    
    // Send background notifications
    if (order && order.id) {
      NotificationService.sendToUser(
        order.user_id,
        'user',
        'Order Placed Successfully',
        `Your lab order for patient "${order.patient_name}" has been created with ${order.priority} priority.`,
        { order_id: order.id, event: 'order_created' }
      ).catch(err => console.error('Error sending user order notification:', err.message));

      NotificationService.sendToTopic(
        'staff_notifications',
        'New Order Received',
        `New ${order.priority} priority order placed for ${order.patient_name}.`,
        { order_id: order.id, event: 'new_order_alert' }
      ).catch(err => console.error('Error sending staff order notification:', err.message));
    }

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

const updateOrder = async (req, res) => {
  try {
    const {
      description,
      priority,
      patient_name,
      patient_age,
      patient_phone,
      address,
      latitude,
      longitude,
    } = req.body;

    if (!priority || !patient_name || patient_age == null || !patient_phone || !address) {
      return res.status(400).json({
        message: 'priority, patient_name, patient_age, patient_phone, and address are required',
      });
    }

    const order = await Order.update(
      req.params.id,
      {
        description,
        priority,
        patient_name,
        patient_age,
        patient_phone,
        address,
        latitude,
        longitude,
      },
      req.user?.id,
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status, staff_id, note } = req.body;
  const order = await Order.updateStatus(req.params.id, status, staff_id || req.user?.id, note, req.user?.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (status === 'delivered') {
    NotificationService.sendToUser(
      order.user_id,
      'user',
      'Lab Results Ready',
      `All lab test results for patient "${order.patient_name}" are ready and available for download.`,
      { order_id: order.id, event: 'results_ready' }
    ).catch(err => console.error('Error sending lab results notification:', err.message));
  } else {
    NotificationService.sendToUser(
      order.user_id,
      'user',
      'Order Status Updated',
      `Your order for patient "${order.patient_name}" status has been updated to "${status}".`,
      { order_id: order.id, status: status, event: 'order_status_updated' }
    ).catch(err => console.error('Error sending status update notification:', err.message));
  }

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

    NotificationService.sendToUser(
      order.user_id,
      'user',
      'Test Result Uploaded',
      `A new test result has been uploaded for patient "${order.patient_name}".`,
      { order_id: id, event: 'result_uploaded' }
    ).catch(err => console.error('Error sending result upload notification:', err.message));

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

const downloadTestResult = async (req, res) => {
  try {
    const { id, testId } = req.params;
    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isStaff = req.user?.type === 'staff';
    const isOwner =
      order.user_id &&
      req.user?.id &&
      String(order.user_id).toLowerCase() === String(req.user.id).toLowerCase();
    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!isStaff && order.status !== 'delivered') {
      return res.status(403).json({ message: 'Results not released yet' });
    }

    const item = (order.items || []).find(
      (row) => String(row.test_id).toLowerCase() === String(testId).toLowerCase(),
    );
    if (!item?.result_file_url) {
      return res.status(404).json({ message: 'No result file for this test' });
    }

    const opened = await StorageService.openFile(item.result_file_url);
    if (!opened) {
      return res.status(404).json({ message: 'Result file not found on server' });
    }

    res.setHeader('Content-Type', opened.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${opened.filename}"`);
    opened.stream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { order_ids, status, staff_id, note } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ message: 'A non-empty order_ids array is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'A new status is required' });
    }

    const validStatuses = ['pending', 'scheduled', 'collecting', 'running', 'completed', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedOrders = await Order.bulkUpdateStatus(
      order_ids,
      status,
      staff_id || req.user?.id,
      note || 'Bulk status update',
      req.user?.id
    );

    // Send background notifications to users
    for (const order of updatedOrders) {
      NotificationService.sendToUser(
        order.user_id,
        'user',
        'Order Status Updated',
        `Your order for patient "${order.patient_name}" status has been updated to "${status}".`,
        { order_id: order.id, status: status, event: 'order_status_updated' }
      ).catch(err => console.error(`Error sending status update notification for order ${order.id}:`, err.message));
    }

    res.json({ message: `${updatedOrders.length} orders updated successfully`, orders: updatedOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  addOrderItems,
  updateOrder,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  deleteOrder,
  generateQrCode,
  uploadTestResult,
  downloadTestResult,
};
