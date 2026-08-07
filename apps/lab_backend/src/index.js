require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const referralFeeRoutes = require('./routes/referralFeeRoutes');
const discountRoutes = require('./routes/discountRoutes');
const orderRoutes = require('./routes/orderRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const pointSettingRoutes = require('./routes/pointSettingRoutes');
const membershipTierRoutes = require('./routes/membershipTierRoutes');
const pointRedemptionSettingRoutes = require('./routes/pointRedemptionSettingRoutes');
const materialFeeRoutes = require('./routes/materialFeeRoutes');
const serviceGeofenceRoutes = require('./routes/serviceGeofenceRoutes');
const pointTransactionRoutes = require('./routes/pointTransactionRoutes');
const aiConfigRoutes = require('./routes/aiConfigRoutes');
const promptRoutes = require('./routes/promptRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const systemSettingRoutes = require('./routes/systemSettingRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const labResultRoutes = require('./routes/labResultRoutes');
const advertisementRoutes = require('./routes/advertisementRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');
const localeMiddleware = require('./middlewares/localeMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware — allow admin web (Vite) and mobile origins in local/prod.
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    // Include Cache-Control / Pragma — Flutter web loyalty/auth refresh sends them
    // and browsers preflight; omitting them surfaces as ClientException: Failed to fetch.
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'Accept',
      'Cache-Control',
      'Pragma',
    ],
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(localeMiddleware);

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
app.use('/api/referral-fees', referralFeeRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/point-settings', pointSettingRoutes);
app.use('/api/membership-tiers', membershipTierRoutes);
app.use('/api/point-redemption-setting', pointRedemptionSettingRoutes);
app.use('/api/material-fees', materialFeeRoutes);
app.use('/api/service-geofences', serviceGeofenceRoutes);
app.use('/api/point-transactions', pointTransactionRoutes);
app.use('/api/ai-configs', aiConfigRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/lab-results', labResultRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/media', mediaRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Lab System API is running...');
  //make deployment (2026-07-04)
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Start server if run directly (or via `node --watch` / nodemon).
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
  server.on('error', (err) => {
    console.error('HTTP server error:', err);
    process.exit(1);
  });
  // Keep an explicit reference so the process cannot exit while listening.
  global.__labHttpServer = server;
}

module.exports = app;
