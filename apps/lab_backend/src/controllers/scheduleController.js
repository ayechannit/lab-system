const Schedule = require('../models/scheduleModel');
const Order = require('../models/orderModel');
const NotificationService = require('../services/notificationService');

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

    // Notify user of the schedule update
    if (schedule) {
      const order = await Order.getById(order_id);
      if (order && order.user_id) {
        let body = 'Your lab schedule has been updated.';
        if (collecting_person && collection_time) {
          const formattedTime = new Date(collection_time).toLocaleString();
          body = `Your sample collection schedule is set. ${collecting_person} will collect samples on ${formattedTime}.`;
        }
        
        NotificationService.sendToUser(
          order.user_id,
          'user',
          'Sample Collection Scheduled',
          body,
          { order_id, event: 'schedule_updated', collecting_person }
        ).catch(err => console.error('Error sending schedule notification:', err.message));
      }
    }

    res.json(schedule);
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getScheduleByOrderId,
  upsertSchedule,
};
