const express = require('express');
const router = express.Router();
const { authMiddleware, modulePermission } = require('../middlewares/authMiddleware');
const serviceGeofenceController = require('../controllers/serviceGeofenceController');

router.use(authMiddleware);
const manageGeofences = modulePermission('service-geofences');

/**
 * @swagger
 * components:
 *   schemas:
 *     ServiceGeofence:
 *       type: object
 *       required:
 *         - name
 *         - west_longitude
 *         - east_longitude
 *         - north_latitude
 *         - south_latitude
 *         - service_fee_mmk
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         west_longitude:
 *           type: number
 *           format: float
 *         east_longitude:
 *           type: number
 *           format: float
 *         north_latitude:
 *           type: number
 *           format: float
 *         south_latitude:
 *           type: number
 *           format: float
 *         service_fee_mmk:
 *           type: number
 *         priority:
 *           type: integer
 *         is_active:
 *           type: boolean
 *         is_deleted:
 *           type: boolean
 *         created_user:
 *           type: string
 *           format: uuid
 *         updated_user:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: ServiceGeofences
 *   description: Cardinal Bounding-Box Geofencing and Service Fee Calculation
 */

/**
 * @swagger
 * /api/service-geofences:
 *   get:
 *     summary: Get all service geofences
 *     tags: [ServiceGeofences]
 *     responses:
 *       200:
 *         description: List of all service geofences
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceGeofence'
 */

/**
 * @swagger
 * /api/service-geofences/active:
 *   get:
 *     summary: Get all active service geofences
 *     tags: [ServiceGeofences]
 *     responses:
 *       200:
 *         description: List of active service geofences
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceGeofence'
 */

/**
 * @swagger
 * /api/service-geofences/calculate-fee:
 *   get:
 *     summary: Calculate service fee dynamically from lat/lng coordinates
 *     tags: [ServiceGeofences]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate of the order location
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate of the order location
 *     responses:
 *       200:
 *         description: Service fee result based on cardinal bounding box check
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service_geofence_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 zone_name:
 *                   type: string
 *                 service_fee_mmk:
 *                   type: number
 *       400:
 *         description: Missing or invalid lat/lng coordinates
 */

/**
 * @swagger
 * /api/service-geofences/{id}:
 *   get:
 *     summary: Get a service geofence by ID
 *     tags: [ServiceGeofences]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Service geofence configuration details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceGeofence'
 *       404:
 *         description: Service geofence not found
 */

/**
 * @swagger
 * /api/service-geofences:
 *   post:
 *     summary: Create a new service geofence
 *     tags: [ServiceGeofences]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - west_longitude
 *               - east_longitude
 *               - north_latitude
 *               - south_latitude
 *               - service_fee_mmk
 *             properties:
 *               name:
 *                 type: string
 *               west_longitude:
 *                 type: number
 *               east_longitude:
 *                 type: number
 *               north_latitude:
 *                 type: number
 *               south_latitude:
 *                 type: number
 *               service_fee_mmk:
 *                 type: number
 *               priority:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Service geofence created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceGeofence'
 */

/**
 * @swagger
 * /api/service-geofences/{id}:
 *   put:
 *     summary: Update an existing service geofence
 *     tags: [ServiceGeofences]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - west_longitude
 *               - east_longitude
 *               - north_latitude
 *               - south_latitude
 *               - service_fee_mmk
 *             properties:
 *               name:
 *                 type: string
 *               west_longitude:
 *                 type: number
 *               east_longitude:
 *                 type: number
 *               north_latitude:
 *                 type: number
 *               south_latitude:
 *                 type: number
 *               service_fee_mmk:
 *                 type: number
 *               priority:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Service geofence updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceGeofence'
 *       404:
 *         description: Service geofence not found
 */

/**
 * @swagger
 * /api/service-geofences/{id}:
 *   delete:
 *     summary: Soft delete a service geofence
 *     tags: [ServiceGeofences]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Service geofence deleted successfully
 *       404:
 *         description: Service geofence not found
 */

router.get('/', manageGeofences, serviceGeofenceController.getAllGeofences);
router.get('/active', serviceGeofenceController.getActiveGeofences);
router.get('/calculate-fee', serviceGeofenceController.calculateServiceFee);
router.get('/:id', manageGeofences, serviceGeofenceController.getGeofenceById);
router.post('/', manageGeofences, serviceGeofenceController.createGeofence);
router.put('/:id', manageGeofences, serviceGeofenceController.updateGeofence);
router.delete('/:id', manageGeofences, serviceGeofenceController.deleteGeofence);

module.exports = router;
