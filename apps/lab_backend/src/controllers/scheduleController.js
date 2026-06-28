const Schedule = require('../models/scheduleModel');
const Order = require('../models/orderModel');
const Staff = require('../models/staffModel');
const NotificationService = require('../services/notificationService');

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

const getScheduleByOrderId = async (req, res) => {
  const schedule = await Schedule.getByOrderId(req.params.order_id);
  if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
  res.json(schedule);
};

const upsertSchedule = async (req, res) => {
  try {
    const { order_id, collecting_person, collection_time, running_time, report_out_time, accepted_by_user, collector_id } = req.body;
    if (!order_id) {
       return res.status(400).json({ message: 'order_id is required' });
    }
    const scheduleData = { order_id, collecting_person, collection_time, running_time, report_out_time, accepted_by_user };
    const schedule = await Schedule.upsert(scheduleData, req.user?.id);

    if (collector_id) {
      try {
        await resolvePreferredCollectorId(collector_id);
        await Order.updateCollectorId(order_id, collector_id, req.user?.id);
      } catch (collectorError) {
        return res.status(400).json({ message: collectorError.message });
      }
    }

    // Notify user of the schedule update
    if (schedule) {
      const order = await Order.getById(order_id);
      if (order && order.user_id) {
        let title = 'Lab Schedule Updated';
        let body = 'Your lab schedule has been updated.';
        let event = 'schedule_updated';

        if (collecting_person && collection_time) {
          const formattedTime = new Date(collection_time).toLocaleString();
          body = `Your sample collection schedule is set. ${collecting_person} will collect samples on ${formattedTime}.`;
          title = 'Sample Collection Scheduled';
        }

        // If report_out_time is scheduled and user requested hard_copy or both
        if (report_out_time && (order.report_delivery_method === 'hard_copy' || order.report_delivery_method === 'both')) {
          const formattedDeliveryTime = new Date(report_out_time).toLocaleString();
          title = 'Result Delivery Scheduled';
          body = `Your hardcopy lab results are scheduled for physical delivery to your address on ${formattedDeliveryTime}.`;
          event = 'delivery_scheduled';
        }
        
        NotificationService.sendToUser(
          order.user_id,
          'user',
          title,
          body,
          { order_id, event, collecting_person, delivery_time: report_out_time }
        ).catch(err => console.error('Error sending schedule/delivery notification:', err.message));
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
