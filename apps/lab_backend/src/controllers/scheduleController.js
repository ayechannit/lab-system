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

const bulkUpsertSchedules = async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: 'A non-empty schedules array is required' });
    }

    // Basic validation
    for (const s of schedules) {
      if (!s.order_id) {
        return res.status(400).json({ message: 'Each schedule must have order_id' });
      }
    }

    const results = await Schedule.bulkUpsert(schedules, req.user?.id);

    // Notify users of their updated schedule
    for (const schedule of results) {
      if (schedule) {
        try {
          const order = await Order.getById(schedule.order_id);
          if (order && order.user_id) {
            let body = 'Your lab schedule has been updated.';
            if (schedule.collecting_person && schedule.collection_time) {
              const formattedTime = new Date(schedule.collection_time).toLocaleString();
              body = `Your sample collection schedule is set. ${schedule.collecting_person} will collect samples on ${formattedTime}.`;
            }
            
            NotificationService.sendToUser(
              order.user_id,
              'user',
              'Sample Collection Scheduled',
              body,
              { order_id: schedule.order_id, event: 'schedule_updated', collecting_person: schedule.collecting_person }
            ).catch(err => console.error(`Error sending schedule notification for order ${schedule.order_id}:`, err.message));
          }
        } catch (notifyError) {
          console.error(`Failed to send notification for schedule update on order ${schedule.order_id}:`, notifyError.message);
        }
      }
    }

    res.json({ message: `${results.length} schedules created/updated successfully`, schedules: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getScheduleByOrderId,
  upsertSchedule,
  bulkUpsertSchedules,
};
