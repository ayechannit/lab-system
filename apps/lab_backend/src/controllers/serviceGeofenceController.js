const ServiceGeofence = require('../models/serviceGeofenceModel');

function parsePriority(priority, fallback = 1) {
  if (priority === undefined || priority === null || priority === '') return fallback;
  const n = parseInt(priority, 10);
  if (n === 0 || n === 1) return n;
  return null;
}

const getAllGeofences = async (req, res) => {
  try {
    const geofences = await ServiceGeofence.getAll();
    res.json(geofences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActiveGeofences = async (req, res) => {
  try {
    const geofences = await ServiceGeofence.getActive();
    res.json(geofences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGeofenceById = async (req, res) => {
  try {
    const { id } = req.params;
    const geofence = await ServiceGeofence.getById(id);
    if (!geofence) {
      return res.status(404).json({ message: 'Service geofence not found' });
    }
    res.json(geofence);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGeofence = async (req, res) => {
  try {
    const { name, west_longitude, east_longitude, north_latitude, south_latitude, service_fee_mmk, priority, is_active } = req.body;
    if (!name || west_longitude == null || east_longitude == null || north_latitude == null || south_latitude == null || service_fee_mmk == null) {
      return res.status(400).json({ message: 'name, west_longitude, east_longitude, north_latitude, south_latitude, and service_fee_mmk are required' });
    }

    const parsedPriority = parsePriority(priority);
    if (parsedPriority === null) {
      return res.status(400).json({ message: 'priority must be 0 or 1' });
    }

    const geofenceData = {
      name,
      west_longitude: parseFloat(west_longitude),
      east_longitude: parseFloat(east_longitude),
      north_latitude: parseFloat(north_latitude),
      south_latitude: parseFloat(south_latitude),
      service_fee_mmk: parseFloat(service_fee_mmk),
      priority: parsedPriority,
      is_active
    };

    const newGeofence = await ServiceGeofence.create(geofenceData, req.user?.id);
    res.status(201).json(newGeofence);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGeofence = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, west_longitude, east_longitude, north_latitude, south_latitude, service_fee_mmk, priority, is_active } = req.body;
    if (!name || west_longitude == null || east_longitude == null || north_latitude == null || south_latitude == null || service_fee_mmk == null) {
      return res.status(400).json({ message: 'name, west_longitude, east_longitude, north_latitude, south_latitude, and service_fee_mmk are required' });
    }

    const parsedPriority = parsePriority(priority);
    if (parsedPriority === null) {
      return res.status(400).json({ message: 'priority must be 0 or 1' });
    }

    const geofenceData = {
      name,
      west_longitude: parseFloat(west_longitude),
      east_longitude: parseFloat(east_longitude),
      north_latitude: parseFloat(north_latitude),
      south_latitude: parseFloat(south_latitude),
      service_fee_mmk: parseFloat(service_fee_mmk),
      priority: parsedPriority,
      is_active
    };

    const updatedGeofence = await ServiceGeofence.update(id, geofenceData, req.user?.id);
    if (!updatedGeofence) {
      return res.status(404).json({ message: 'Service geofence not found or deleted' });
    }
    res.json(updatedGeofence);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteGeofence = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await ServiceGeofence.delete(id, req.user?.id);
    if (!success) {
      return res.status(404).json({ message: 'Service geofence not found or deleted' });
    }
    res.json({ message: 'Service geofence deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculateServiceFee = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng query parameters are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: 'lat and lng must be valid numbers' });
    }

    const matchedGeofence = await ServiceGeofence.matchCoordinates(latitude, longitude);

    if (matchedGeofence) {
      return res.json({
        service_geofence_id: matchedGeofence.id,
        zone_name: matchedGeofence.name,
        service_fee_mmk: parseFloat(matchedGeofence.service_fee_mmk)
      });
    }

    return res.status(400).json({
      code: 'OUT_OF_COVERAGE',
      message: 'Your location is outside our service coverage areas. We cannot deliver services to this address.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllGeofences,
  getActiveGeofences,
  getGeofenceById,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  calculateServiceFee
};
