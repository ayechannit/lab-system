require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const discountRoutes = require('./routes/discountRoutes');
const referralFeeRoutes = require('./routes/referralFeeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const pointSettingRoutes = require('./routes/pointSettingRoutes');
const pointTransactionRoutes = require('./routes/pointTransactionRoutes');
const aiConfigRoutes = require('./routes/aiConfigRoutes');
const promptRoutes = require('./routes/promptRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const systemSettingRoutes = require('./routes/systemSettingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const labResultRoutes = require('./routes/labResultRoutes');
const advertisementRoutes = require('./routes/advertisementRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Serve static files from uploads directory (for local development)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/referral-fees', referralFeeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/point-settings', pointSettingRoutes);
app.use('/api/point-transactions', pointTransactionRoutes);
app.use('/api/ai-configs', aiConfigRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/media', mediaRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Lab System API is running...');
  //make deployment (2026-06-29)
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
