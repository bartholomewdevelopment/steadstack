const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Vehicle types
const VehicleType = {
  ATV: 'ATV',
  BACKHOE: 'BACKHOE',
  CAR: 'CAR',
  FORKLIFT: 'FORKLIFT',
  GOLF_CART: 'GOLF_CART',
  IMPLEMENT: 'IMPLEMENT',
  SKID_STEER: 'SKID_STEER',
  SUV: 'SUV',
  TRACTOR: 'TRACTOR',
  TRAILER: 'TRAILER',
  TRUCK: 'TRUCK',
  UTV: 'UTV',
  VAN: 'VAN',
  OTHER: 'OTHER',
};

// Fuel types
const FuelType = {
  GASOLINE: 'GASOLINE',
  DIESEL: 'DIESEL',
  ELECTRIC: 'ELECTRIC',
  HYBRID: 'HYBRID',
  PROPANE: 'PROPANE',
};

/**
 * GET /api/vehicles
 * List vehicles with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, status, vehicleType, search, page = 1, limit = 20 } = req.query;

    let vehicles = await firestoreService.getVehicles(userData.tenantId, {
      siteId,
      status: status || 'ACTIVE',
      vehicleType,
    });

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      vehicles = vehicles.filter(v =>
        v.make?.toLowerCase().includes(searchLower) ||
        v.model?.toLowerCase().includes(searchLower) ||
        v.plateNumber?.toLowerCase().includes(searchLower) ||
        v.vin?.toLowerCase().includes(searchLower) ||
        String(v.year).includes(searchLower)
      );
    }

    // Simple pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedVehicles = vehicles.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: {
        vehicles: paginatedVehicles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: vehicles.length,
          pages: Math.ceil(vehicles.length / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
});

/**
 * GET /api/vehicles/:id
 * Get a single vehicle with its asset record
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Vehicle ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const vehicle = await firestoreService.getVehicle(userData.tenantId, req.params.id);

      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }

      // Also get the base asset record
      const asset = await firestoreService.getAsset(userData.tenantId, vehicle.assetId || req.params.id);

      res.json({ success: true, data: { vehicle, asset } });
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch vehicle' });
    }
  }
);

/**
 * POST /api/vehicles
 * Create a new vehicle (creates both asset and vehicle records)
 */
router.post(
  '/',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('make').notEmpty().withMessage('Make is required'),
    body('model').notEmpty().withMessage('Model is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const {
        // Asset fields
        name,
        siteId,
        status = 'ACTIVE',
        tags = [],
        acquiredAt,
        acquisitionCost,
        notes,
        // Vehicle fields
        vehicleType = 'TRUCK',
        vin,
        plateNumber,
        make,
        model,
        year,
        color,
        fuelType,
        fuelCapacity,
        odometer,
        engineHours,
        insurancePolicy,
        insuranceExpiry,
        registrationExpiry,
      } = req.body;

      // Create both asset and vehicle atomically
      const result = await firestoreService.createVehicleWithAsset(userData.tenantId, {
        // Asset data
        asset: {
          name: name || `${year || ''} ${make} ${model}`.trim(),
          siteId,
          assetType: 'VEHICLE',
          status,
          identifier: vin || plateNumber,
          tags,
          acquiredAt,
          acquisitionCost,
          notes,
          createdBy: userData.user.id,
          updatedBy: userData.user.id,
        },
        // Vehicle data
        vehicle: {
          siteId,
          vehicleType,
          vin,
          plateNumber,
          make,
          model,
          year,
          color,
          fuelType,
          fuelCapacity,
          odometer,
          engineHours,
          insurancePolicy,
          insuranceExpiry,
          registrationExpiry,
        },
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('Error creating vehicle:', error);
      res.status(500).json({ success: false, message: 'Failed to create vehicle' });
    }
  }
);

/**
 * PATCH /api/vehicles/:id
 * Update a vehicle (updates both asset and vehicle records)
 */
router.patch(
  '/:id',
  [param('id').notEmpty().withMessage('Vehicle ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const {
        // Asset fields
        name,
        siteId,
        status,
        tags,
        acquiredAt,
        acquisitionCost,
        notes,
        // Vehicle fields
        vehicleType,
        vin,
        plateNumber,
        make,
        model,
        year,
        color,
        fuelType,
        fuelCapacity,
        odometer,
        engineHours,
        insurancePolicy,
        insuranceExpiry,
        registrationExpiry,
      } = req.body;

      const result = await firestoreService.updateVehicleWithAsset(userData.tenantId, req.params.id, {
        asset: {
          name,
          siteId,
          status,
          identifier: vin || plateNumber,
          tags,
          acquiredAt,
          acquisitionCost,
          notes,
          updatedBy: userData.user.id,
        },
        vehicle: {
          siteId,
          vehicleType,
          vin,
          plateNumber,
          make,
          model,
          year,
          color,
          fuelType,
          fuelCapacity,
          odometer,
          engineHours,
          insurancePolicy,
          insuranceExpiry,
          registrationExpiry,
        },
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({ success: false, message: 'Failed to update vehicle' });
    }
  }
);

/**
 * POST /api/vehicles/:id/status
 * Update vehicle status (dispose/archive)
 */
router.post(
  '/:id/status',
  [
    param('id').notEmpty().withMessage('Vehicle ID is required'),
    body('status').isIn(['ACTIVE', 'SOLD', 'RETIRED', 'LOST', 'ARCHIVED']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const { status, disposedAt, disposalMethod, disposalNotes } = req.body;

      const updateData = {
        status,
        updatedBy: userData.user.id,
      };

      if (status !== 'ACTIVE') {
        updateData.disposedAt = disposedAt || new Date().toISOString();
        if (disposalMethod) updateData.disposalMethod = disposalMethod;
        if (disposalNotes) updateData.disposalNotes = disposalNotes;
      }

      // Get vehicle to find asset ID
      const vehicle = await firestoreService.getVehicle(userData.tenantId, req.params.id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }

      // Update both asset and vehicle status
      await firestoreService.updateAsset(userData.tenantId, vehicle.assetId || req.params.id, updateData);
      await firestoreService.updateVehicle(userData.tenantId, req.params.id, { status });

      res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      res.status(500).json({ success: false, message: 'Failed to update vehicle status' });
    }
  }
);

module.exports = router;
