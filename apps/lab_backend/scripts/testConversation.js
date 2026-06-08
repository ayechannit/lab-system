const Conversation = require('../src/models/conversationModel');

async function test() {
  const testUserId = '00000000-0000-0000-0000-000000000000';
  console.log('Testing Conversation model database operations...');

  try {
    // 1. Save a new conversation exchange
    console.log('\nStep 1: Saving a conversation pair...');
    const saved = await Conversation.create(
      testUserId,
      'Hello AI, this is a test message!',
      'Hello user, this is a test response!'
    );
    console.log('Successfully saved conversation:', saved);

    // 2. Retrieve history and assert correctness
    console.log('\nStep 2: Retrieving conversation history...');
    const history = await Conversation.getHistoryByUserId(testUserId);
    console.log('Retrieved history:', history);
    
    if (history.length === 0) {
      throw new Error('History is empty but should have at least 1 record!');
    }

    const latest = history[history.length - 1];
    if (latest.user_message !== 'Hello AI, this is a test message!' || latest.ai_response !== 'Hello user, this is a test response!') {
      throw new Error('Retrieved message content does not match saved content!');
    }
    console.log('Retrieval check passed successfully.');

    // 3. Clear/delete history
    console.log('\nStep 3: Soft-deleting/clearing conversation history...');
    const cleared = await Conversation.clearHistoryByUserId(testUserId);
    console.log('Successfully cleared history. Result status:', cleared);

    // 4. Verify cleared history
    console.log('\nStep 4: Confirming history is cleared...');
    const clearedHistory = await Conversation.getHistoryByUserId(testUserId);
    console.log('History after clearing:', clearedHistory);
    
    if (clearedHistory.length !== 0) {
      throw new Error('History was not cleared successfully!');
    }
    console.log('History clear check passed successfully.');

    console.log('\nAll Conversation model database operations tested successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nDatabase operations test failed:', error);
    process.exit(1);
  }
}

test();
