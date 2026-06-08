const Report = require('../src/models/reportModel');

async function test() {
  const testUserId = '00000000-0000-0000-0000-000000000000';
  console.log('Testing User-facing Report database operations...');

  try {
    const reportData = await Report.getUserReport(testUserId);
    console.log('Successfully retrieved user report:', JSON.stringify(reportData, null, 2));

    // Assert that the returned object contains the required report sections
    if (!reportData || !reportData.kpis || !reportData.spendTrend || !reportData.topTests) {
      throw new Error('User report response is missing required data sections!');
    }

    console.log('\nKPI checks:');
    console.log('- Total Spent:', reportData.kpis.total_spent);
    console.log('- Total Orders:', reportData.kpis.total_orders);
    console.log('- Completed Orders:', reportData.kpis.completed_orders);
    console.log('- Pending Orders:', reportData.kpis.pending_orders);
    console.log('- Loyalty Points:', reportData.kpis.loyalty_points);

    console.log('\nAll user report database operations verified successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nUser report test failed:', error);
    process.exit(1);
  }
}

test();
