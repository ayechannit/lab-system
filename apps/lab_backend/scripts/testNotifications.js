const Notification = require('../src/models/notificationModel');
const NotificationService = require('../src/services/notificationService');
const User = require('../src/models/userModel');

async function test() {
  const testUserId = '00000000-0000-0000-0000-000000000000';
  console.log('Testing Notification model and FCM token registrations...');

  try {
    // 1. Test updating FCM token
    console.log('\nStep 1: Registering dummy FCM token for user...');
    const updatedToken = await User.updateFcmToken(testUserId, 'test-fcm-token-12345', testUserId);
    console.log('FCM Token registered result (user id might not exist but if query works then success):', updatedToken);

    // 2. Test saving notification directly to database
    console.log('\nStep 2: Saving a notification record...');
    const saved = await Notification.create({
      user_id: testUserId,
      user_type: 'user',
      title: 'Test Notification Title',
      body: 'This is a test notification body.',
      data_payload: { order_id: '11111111-1111-1111-1111-111111111111', event: 'test' }
    });
    console.log('Successfully saved notification:', saved);

    // 3. Test retrieving notification history
    console.log('\nStep 3: Retrieving notifications for user...');
    const list = await Notification.getByUserId(testUserId, 'user');
    console.log('Retrieved notifications:', list);
    
    if (list.length === 0) {
      throw new Error('Notification list is empty but should have at least 1 record!');
    }

    const latest = list[0];
    if (latest.title !== 'Test Notification Title' || latest.body !== 'This is a test notification body.') {
      throw new Error('Retrieved notification details do not match!');
    }
    console.log('Retrieval check passed.');

    // 4. Test marking single notification as read
    console.log('\nStep 4: Marking notification as read...');
    const marked = await Notification.markAsRead(latest.id, testUserId);
    console.log('Marked as read status:', marked);

    // 5. Test marking all as read
    console.log('\nStep 5: Marking all notifications as read...');
    const markedAll = await Notification.markAllAsRead(testUserId, 'user');
    console.log('Marked all as read status:', markedAll);

    // 6. Test sending via Service (stateless wrapper)
    console.log('\nStep 6: Testing NotificationService.sendToUser wrapper...');
    // This will write to the database and then try to fetch FCM token
    const serviceResult = await NotificationService.sendToUser(
      testUserId,
      'user',
      'Service Notification Title',
      'This was sent via NotificationService wrapper'
    );
    console.log('NotificationService.sendToUser complete.');

    console.log('\nAll notification features tested successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nNotification test failed:', error);
    process.exit(1);
  }
}

test();
