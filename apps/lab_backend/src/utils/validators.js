const Joi = require('joi');

const staffSchema = Joi.object({
  name: Joi.string().required().max(255),
  email: Joi.string().email().required().max(255),
  password_hash: Joi.string().required(),
  role: Joi.string().valid('admin', 'lab_technician', 'reception', 'manager').required(),
  is_active: Joi.boolean()
});

const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  password_hash: Joi.string().required(),
  role: Joi.string().valid('clinic', 'doctor', 'patient').required(),
  address: Joi.string().allow('', null),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  total_points: Joi.number().integer().min(0)
});

const testSchema = Joi.object({
  test_name: Joi.string().required(),
  test_code: Joi.string().required(),
  description: Joi.string().allow('', null),
  base_price_mmk: Joi.number().precision(2).required(),
  category: Joi.string().allow('', null),
  is_active: Joi.boolean()
});

const discountSchema = Joi.object({
  test_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  role: Joi.string().valid('clinic', 'doctor', 'patient', 'all').required(),
  discount_percent: Joi.number().min(0).max(100).required(),
  is_active: Joi.boolean()
});

const orderItemSchema = Joi.object({
  test_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  quantity: Joi.number().integer().min(1).default(1),
  unit_price_mmk: Joi.number().required(),
  subtotal_mmk: Joi.number().required()
});

const orderSchema = Joi.object({
  user_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  description: Joi.string().allow('', null),
  priority: Joi.string().valid('urgent', 'elective').required(),
  patient_name: Joi.string().required(),
  patient_age: Joi.number().integer().required(),
  patient_phone: Joi.string().required(),
  address: Joi.string().required(),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  status: Joi.string().valid('pending', 'scheduled', 'collecting', 'running', 'completed', 'delivered'),
  original_price_mmk: Joi.number().required(),
  discount_percent: Joi.number().min(0).max(100),
  final_price_mmk: Joi.number().required(),
  items: Joi.array().items(orderItemSchema).min(1).required()
});

const orderStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'scheduled', 'collecting', 'running', 'completed', 'delivered').required(),
  staff_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  note: Joi.string().allow('', null)
});

const scheduleSchema = Joi.object({
  order_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  collecting_person: Joi.string().allow('', null),
  collection_time: Joi.date().allow(null),
  running_time: Joi.date().allow(null),
  report_out_time: Joi.date().allow(null),
  accepted_by_user: Joi.boolean()
});

const paymentSchema = Joi.object({
  order_id: Joi.string().guid({ version: 'uuidv4' }).required(),
  amount_mmk: Joi.number().required(),
  status: Joi.string().valid('pending', 'received', 'verified', 'failed'),
  method: Joi.string().valid('cash', 'bank_transfer', 'mobile_pay').required(),
  reference_no: Joi.string().allow('', null)
});

module.exports = {
  staffSchema,
  userSchema,
  testSchema,
  discountSchema,
  orderSchema,
  orderStatusUpdateSchema,
  scheduleSchema,
  paymentSchema
};
