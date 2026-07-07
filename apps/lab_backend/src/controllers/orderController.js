const path = require('path');
const crypto = require('crypto');
const Order = require('../models/orderModel');
const Staff = require('../models/staffModel');
const QRCode = require('qrcode');
const StorageService = require('../utils/storageService');
const NotificationService = require('../services/notificationService');
const ServiceGeofence = require('../models/serviceGeofenceModel');

async function resolvePreferredCollectorId(collector_id) {
  if (collector_id == null || collector_id === '') return null;
  const staff = await Staff.getById(collector_id);
  if (!staff || staff.is_deleted) {
    throw new Error('Selected collector was not found.');
  }
  if (!staff.is_active) {
    throw new Error('Selected collector is not active.');
  }
  if (staff.role !== 'collector') {
    throw new Error('Selected staff member must have the collector role.');
  }
  return collector_id;
}

const REPORT_DELIVERY_METHODS = new Set(['soft_copy', 'hard_copy', 'both']);

function parseReportDeliveryMethod(value) {
  const key = String(value || '').trim().toLowerCase();
  return REPORT_DELIVERY_METHODS.has(key) ? key : null;
}

function allowsDigitalResultDelivery(method) {
  const key = String(method || '').trim().toLowerCase();
  return key === 'soft_copy' || key === 'both';
}

function requiresHardCopyDelivery(method) {
  const key = String(method || '').trim().toLowerCase();
  return key === 'hard_copy' || key === 'both';
}

function stripDigitalResultAccess(order) {
  if (!order?.items?.length) return;
  for (const item of order.items) {
    delete item.download_url;
    delete item.result_file_url;
  }
}

const OUT_OF_COVERAGE_MESSAGE =
  'Your location is outside our service coverage areas. We cannot deliver services to this address.';

async function resolveGeofenceForLocation(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  const latVal = parseFloat(latitude);
  const lngVal = parseFloat(longitude);
  if (Number.isNaN(latVal) || Number.isNaN(lngVal)) return null;

  const matchedGeofence = await ServiceGeofence.matchCoordinates(latVal, lngVal);
  if (!matchedGeofence) {
    const error = new Error(OUT_OF_COVERAGE_MESSAGE);
    error.code = 'OUT_OF_COVERAGE';
    throw error;
  }

  return {
    service_geofence_id: matchedGeofence.id,
    service_fee_mmk: parseFloat(matchedGeofence.service_fee_mmk) || 0,
  };
}

function respondOutOfCoverage(res, message = OUT_OF_COVERAGE_MESSAGE) {
  return res.status(400).json({
    code: 'OUT_OF_COVERAGE',
    message,
  });
}

const getAllOrders = async (req, res) => {
  const orders = await Order.getAll(req.query);
  res.json(orders);
};

const getOrderById = async (req, res) => {
  const order = await Order.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const isStaff = req.user?.type === 'staff';
  const isOwner =
    order.user_id &&
    req.user?.id &&
    String(order.user_id).toLowerCase() === String(req.user.id).toLowerCase();
  if (!isStaff && isOwner && !allowsDigitalResultDelivery(order.report_delivery_method)) {
    stripDigitalResultAccess(order);
  }

  res.json(order);
};

const createOrder = async (req, res) => {
  try {
    const { 
      user_id, collector_id, description, priority, patient_name, patient_age, patient_phone, 
      address, latitude, longitude, status, report_delivery_method, 
      original_price_mmk, discount_percent, final_price_mmk, material_fee_mmk, items 
    } = req.body;

    if (!user_id || !priority || !patient_name || !patient_age || !patient_phone || !address || !report_delivery_method) {
      return res.status(400).json({ message: 'user_id, priority, patient_name, patient_age, patient_phone, address, and report_delivery_method are required' });
    }

    const orderData = { 
      user_id, collector_id, description, priority, patient_name, patient_age, patient_phone, 
      address, latitude, longitude, status, report_delivery_method, 
      original_price_mmk, discount_percent, final_price_mmk, material_fee_mmk, items 
    };

    try {
      const geofence = await resolveGeofenceForLocation(latitude, longitude);
      if (geofence) {
        orderData.service_geofence_id = geofence.service_geofence_id;
        orderData.service_fee_mmk = geofence.service_fee_mmk;
      }
    } catch (error) {
      if (error.code === 'OUT_OF_COVERAGE') {
        return respondOutOfCoverage(res, error.message);
      }
      throw error;
    }

    // Parse items if it's a string (from multipart/form-data)
    if (typeof orderData.items === 'string') {
      try {
        orderData.items = JSON.parse(orderData.items);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid items format' });
      }
    }

    orderData.collector_id = await resolvePreferredCollectorId(collector_id);

    if (req.file) {
      const fileUrl = await StorageService.uploadFile(req.file);
      orderData.prescription_url = fileUrl;
    }

    const order = await Order.create(orderData, req.user?.id);
    
    // Send background notifications
    if (order && order.id) {
      // 1. Send in-app notification to the user/patient
      NotificationService.sendToUser(
        order.user_id,
        'user',
        'Order Placed Successfully',
        `Your lab order for patient "${order.patient_name}" has been created with ${order.priority} priority.`,
        { order_id: order.id, event: 'order_created' }
      ).catch(err => console.error('Error sending user order notification:', err.message));

      // 2. Fetch all active staff members and send in-app notifications to each of them
      Staff.getAll({ is_active: true })
        .then(activeStaff => {
          for (const member of activeStaff) {
            NotificationService.sendToUser(
              member.id,
              'staff',
              'New Order Received',
              `New ${order.priority} priority order placed for ${order.patient_name}.`,
              { order_id: order.id, event: 'new_order_alert' }
            ).catch(err => console.error(`Error sending staff notification to ${member.id}:`, err.message));
          }
        })
        .catch(err => console.error('Error fetching staff list for notification:', err.message));

      // 3. Send real-time push notification to topic 'staff_notifications'
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
    const { items, original_price_mmk, discount_percent, final_price_mmk, material_fee_mmk } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const totals = {
      original_price_mmk: original_price_mmk || 0,
      discount_percent: discount_percent || 0,
      final_price_mmk: final_price_mmk || 0,
      material_fee_mmk: material_fee_mmk || 0
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

const replaceOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, original_price_mmk, discount_percent, final_price_mmk, material_fee_mmk } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const totals = {
      original_price_mmk: original_price_mmk || 0,
      discount_percent: discount_percent || 0,
      final_price_mmk: final_price_mmk || 0,
      material_fee_mmk: material_fee_mmk || 0,
    };

    const updatedOrder = await Order.replaceItemsAndUpdateTotals(id, items, totals, req.user?.id);
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(updatedOrder);
  } catch (error) {
    const status = error.message?.includes('cannot') || error.message?.includes('only be updated') ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

const syncPendingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      collector_id,
      description,
      priority,
      patient_name,
      patient_age,
      patient_phone,
      address,
      latitude,
      longitude,
      report_delivery_method,
      original_price_mmk,
      discount_percent,
      final_price_mmk,
      material_fee_mmk,
      items,
    } = req.body;

    if (!priority || !patient_name || patient_age == null || !patient_phone || !address || !report_delivery_method) {
      return res.status(400).json({
        message: 'priority, patient_name, patient_age, patient_phone, address, and report_delivery_method are required',
      });
    }

    const parsedReportDeliveryMethod = parseReportDeliveryMethod(report_delivery_method);
    if (!parsedReportDeliveryMethod) {
      return res.status(400).json({ message: 'report_delivery_method must be soft_copy, hard_copy, or both' });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const resolvedCollectorId = await resolvePreferredCollectorId(collector_id);

    const syncPayload = {
      collector_id: resolvedCollectorId,
      description,
      priority,
      patient_name,
      patient_age,
      patient_phone,
      address,
      latitude,
      longitude,
      report_delivery_method: parsedReportDeliveryMethod,
      original_price_mmk,
      discount_percent,
      final_price_mmk,
      material_fee_mmk,
      items,
    };

    try {
      const geofence = await resolveGeofenceForLocation(latitude, longitude);
      if (geofence) {
        syncPayload.service_geofence_id = geofence.service_geofence_id;
        syncPayload.service_fee_mmk = geofence.service_fee_mmk;
      }
    } catch (error) {
      if (error.code === 'OUT_OF_COVERAGE') {
        return respondOutOfCoverage(res, error.message);
      }
      throw error;
    }

    const updatedOrder = await Order.syncPendingOrder(
      id,
      syncPayload,
      req.user?.id,
      {
        isStaff: req.user?.type === 'staff',
        userId: req.user?.id,
      },
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (updatedOrder.error === 'not_found') {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (updatedOrder.error === 'forbidden') {
      return res.status(403).json({ message: 'You can only update orders you created.' });
    }

    res.json(updatedOrder);
  } catch (error) {
    const message = error.message || 'Failed to synchronize pending order';
    const status =
      message.includes('Only pending orders') ||
      message.includes('cannot be changed') ||
      message.includes('Test not found')
        ? 400
        : 500;
    res.status(status).json({ message });
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
      report_delivery_method,
    } = req.body;

    if (!priority || !patient_name || patient_age == null || !patient_phone || !address || !report_delivery_method) {
      return res.status(400).json({
        message: 'priority, patient_name, patient_age, patient_phone, address, and report_delivery_method are required',
      });
    }

    const parsedReportDeliveryMethod = parseReportDeliveryMethod(report_delivery_method);
    if (!parsedReportDeliveryMethod) {
      return res.status(400).json({ message: 'report_delivery_method must be soft_copy, hard_copy, or both' });
    }

    const updatePayload = {
      description,
      priority,
      patient_name,
      patient_age,
      patient_phone,
      address,
      latitude,
      longitude,
      report_delivery_method: parsedReportDeliveryMethod,
    };

    try {
      const geofence = await resolveGeofenceForLocation(latitude, longitude);
      if (geofence) {
        updatePayload.service_geofence_id = geofence.service_geofence_id;
        updatePayload.service_fee_mmk = geofence.service_fee_mmk;
      }
    } catch (error) {
      if (error.code === 'OUT_OF_COVERAGE') {
        return respondOutOfCoverage(res, error.message);
      }
      throw error;
    }

    const order = await Order.update(
      req.params.id,
      updatePayload,
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
  const { id } = req.params;
  const order = await Order.updateStatus(id, status, staff_id || req.user?.id, note, req.user?.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (status === 'delivered') {
    const method = String(order.report_delivery_method || '').trim().toLowerCase();
    let title = 'Lab Results Ready';
    let body = `All lab test results for patient "${order.patient_name}" are ready and available for download.`;
    let event = 'results_ready';

    if (method === 'hard_copy') {
      const fullOrder = await Order.getById(id);
      const schedule = fullOrder?.schedule;
      if (schedule && schedule.report_out_time) {
        const formattedDeliveryTime = new Date(schedule.report_out_time).toLocaleString();
        title = 'Hard Copy Delivered';
        body = `Your physical lab report for patient "${order.patient_name}" has been handed over and is scheduled for delivery to your address on ${formattedDeliveryTime}.`;
        event = 'hard_copy_delivered';
      } else {
        title = 'Hard Copy Delivered';
        body = `Your physical lab report for patient "${order.patient_name}" has been handed over in person. Digital PDFs are not available in the app for this order.`;
        event = 'hard_copy_delivered';
      }
    } else if (method === 'both') {
      const fullOrder = await Order.getById(id);
      const schedule = fullOrder?.schedule;
      if (schedule && schedule.report_out_time) {
        const formattedDeliveryTime = new Date(schedule.report_out_time).toLocaleString();
        title = 'Lab Results Ready';
        body = `Digital results for patient "${order.patient_name}" are available in the app. A physical copy is scheduled for delivery on ${formattedDeliveryTime}.`;
        event = 'results_ready_with_delivery';
      } else {
        title = 'Lab Results Ready';
        body = `Digital results for patient "${order.patient_name}" are available in the app. A physical copy will be delivered to your address shortly.`;
        event = 'results_ready_with_delivery';
      }
    }

    NotificationService.sendToUser(
      order.user_id,
      'user',
      title,
      body,
      { order_id: order.id, event }
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

const getOrderTracking = async (req, res) => {
  try {
    const tracking = await Order.getTracking(req.params.id);
    if (!tracking) return res.status(404).json({ message: 'Order not found' });
    res.json(tracking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

function parseTestIds(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((id) => String(id).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((id) => String(id).trim()).filter(Boolean);
    } catch {
      return trimmed.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }
  return [];
}

const uploadTestResult = async (req, res) => {
  try {
    const { id, testId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file format' });
    }

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

    const downloadUrl = await StorageService.getDownloadUrl(fileUrl, path.basename(fileUrl));

    res.json({
      message: 'Result uploaded successfully',
      fileUrl,
      downloadUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkUploadTestResult = async (req, res) => {
  try {
    const { id } = req.params;
    const testIds = parseTestIds(req.body?.test_ids);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file format' });
    }
    if (testIds.length < 2) {
      return res.status(400).json({ message: 'Select at least two tests for a shared PDF upload.' });
    }

    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderTestIds = new Set((order.items || []).map((row) => String(row.test_id).toLowerCase()));
    const missing = testIds.filter((testId) => !orderTestIds.has(testId.toLowerCase()));
    if (missing.length > 0) {
      return res.status(400).json({ message: 'One or more tests were not found on this order.' });
    }

    const fileUrl = await StorageService.uploadFile(req.file);
    const groupId = crypto.randomUUID();
    const updated = await Order.uploadResultBulk(id, testIds, fileUrl, groupId, req.user?.id);
    if (updated === 0) {
      return res.status(404).json({ message: 'No tests were updated on this order.' });
    }

    NotificationService.sendToUser(
      order.user_id,
      'user',
      'Test Result Uploaded',
      `A new test result has been uploaded for patient "${order.patient_name}".`,
      { order_id: id, event: 'result_uploaded' }
    ).catch(err => console.error('Error sending result upload notification:', err.message));

    const downloadUrl = await StorageService.getDownloadUrl(fileUrl, path.basename(fileUrl));

    res.json({
      message: 'Shared result uploaded successfully',
      fileUrl,
      downloadUrl,
      result_pdf_group_id: groupId,
      test_ids: testIds,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const separateResultPdfs = async (req, res) => {
  try {
    const { id } = req.params;
    const testIds = parseTestIds(req.body?.test_ids);

    if (testIds.length < 2) {
      return res.status(400).json({ message: 'Select at least two tests to separate.' });
    }

    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderTestIds = new Set((order.items || []).map((row) => String(row.test_id).toLowerCase()));
    const missing = testIds.filter((testId) => !orderTestIds.has(testId.toLowerCase()));
    if (missing.length > 0) {
      return res.status(400).json({ message: 'One or more tests were not found on this order.' });
    }

    const updated = await Order.separateResultPdfs(id, testIds, req.user?.id);
    if (updated === 0) {
      return res.status(404).json({ message: 'No tests were updated on this order.' });
    }

    res.json({
      message: 'Tests separated into individual PDF rows.',
      test_ids: testIds,
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
    if (!isStaff && !allowsDigitalResultDelivery(order.report_delivery_method)) {
      return res.status(403).json({
        message: 'Digital results are not available for hard copy delivery orders.',
      });
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

const saveAiReview = async (req, res) => {
  try {
    const { id, testId } = req.params;
    const { ai_verdict, ai_raw_response } = req.body;

    if (!ai_verdict) {
      return res.status(400).json({ message: 'ai_verdict is required' });
    }

    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const success = await Order.saveAiReview(id, testId, ai_verdict, ai_raw_response, req.user?.id);
    if (!success) {
      return res.status(404).json({ message: 'Test not found on this order' });
    }

    res.json({ message: 'AI review results saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  addOrderItems,
  replaceOrderItems,
  syncPendingOrder,
  updateOrder,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  deleteOrder,
  getOrderTracking,
  generateQrCode,
  uploadTestResult,
  bulkUploadTestResult,
  separateResultPdfs,
  downloadTestResult,
  saveAiReview,
};
