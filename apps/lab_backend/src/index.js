require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const staffRoutes = require('./routes/staffRoutes');
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const discountRoutes = require('./routes/discountRoutes');
const orderRoutes = require('./routes/orderRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
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

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/payments', paymentRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Lab System API is running...');
});

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
