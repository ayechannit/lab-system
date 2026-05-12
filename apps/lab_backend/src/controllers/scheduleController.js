const Schedule = require('../models/scheduleModel');

const getScheduleByOrderId = async (req, res) => {
  const schedule = await Schedule.getByOrderId(req.params.order_id);
  if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
  res.json(schedule);
};

const upsertSchedule = async (req, res) => {
  try {
    const { order_id, collecting_person, collection_time, running_time, report_out_time, accepted_by_user } = req.body;
    if (!order_id) {
       return res.status(400).json({ message: 'order_id is required' });
    }
    const scheduleData = { order_id, collecting_person, collection_time, running_time, report_out_time, accepted_by_user };
    const schedule = await Schedule.upsert(scheduleData, req.user?.id);
    res.json(schedule);
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getScheduleByOrderId,
  upsertSchedule,
};
