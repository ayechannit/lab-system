const NotificationService = require('../services/notificationService');

const sendNotification = async (req, res) => {
  try {
    const { token, topic, title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'title and body are required' });
    }

    if (!token && !topic) {
      return res.status(400).json({ message: 'Either token or topic is required to target the notification' });
    }

    if (token && topic) {
      return res.status(400).json({ message: 'Provide either a token OR a topic, not both' });
    }

    // Convert data values to strings as required by FCM data payload rules
    const formattedData = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        formattedData[key] = String(value);
      }
    }

    let result;
    if (token) {
      result = await NotificationService.sendToToken(token, title, body, formattedData);
    } else if (topic) {
      result = await NotificationService.sendToTopic(topic, title, body, formattedData);
    }

    res.status(200).json({ 
      message: 'Notification sent successfully', 
      firebase_response: result 
    });
  } catch (error) {
    console.error('Push Notification Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendNotification,
};
