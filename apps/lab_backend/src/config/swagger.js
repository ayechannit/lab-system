const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lab System API',
      version: '1.0.0',
      description: `API documentation for the Lab System backend.

### 🔔 System Notification Triggers Guide
The backend implements automatic background-dispatched push and in-app notifications on critical events. Below is the integration list of which endpoints automatically trigger dispatches:

#### 1. Accounts (\`/api/users\`)
* **\`PUT /api/users/fcm-token\`** - Registers/updates active FCM registration tokens for devices.

#### 2. Order Management (\`/api/orders\`)
* **\`POST /api/orders\`** - Notifies user (*"Order Placed Successfully"*) and staff (*"New Order Received"*).
* **\`PUT /api/orders/:id/status\`** - Notifies user on status progress changes: *"Order Status Updated"*.

#### 3. Lab Results & Quality Checks (\`/api/lab-results\`)
* **\`POST /api/orders/:id/test/:testId/result\`** - Uploading a test result notifies user. Mark the order delivered separately via status update when staff release results.
* **\`POST /api/lab-results/:resultId/ai-check\`** - Failed AI quality checks notify admin/staff topic: *"AI Quality Check Issue"*.

#### 4. Appointments & Scheduling (\`/api/schedules\`)
* **\`POST /api/schedules\`** - Notifies user of sample collector and time: *"Sample Collection Scheduled"*.

#### 5. Payments Processing (\`/api/payments\`)
* **\`POST /api/payments\`** - Notifies user: *"Payment Submitted"*.
* **\`PUT /api/payments/:id/status\`** - Notifies user on verification (*"Payment Verified Successfully"*) or rejection (*"Payment Verification Failed"*).

#### 6. Customer Feedback (\`/api/ratings\`)
* **\`POST /api/ratings\`** - Notifies staff topic of incoming review scores: *"New Order Rating"*.`,
    },
    servers: [
      {
        url: '/',
        description: 'Current Server (Auto-detect)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: [path.join(__dirname, '../routes/*.js')], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
