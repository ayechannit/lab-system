const Schedule = require('../models/scheduleModel');

const getScheduleByOrderId = async (req, res) => {
  const schedule = await Schedule.getByOrderId(req.params.order_id);
  if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
  res.json(schedule);
};

const upsertSchedule = async (req, res) => {
  const schedule = await Schedule.upsert(req.body, req.user?.id);
  res.json(schedule);
};

module.exports = {
  getScheduleByOrderId,
  upsertSchedule,
};
