const admin = require('../config/firebase-admin');
const { User } = require('../models');

/**
 * Middleware to verify Firebase ID token
 * Attaches decoded token and user to req
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;

    // Optionally load user from MongoDB
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).populate('tenantId');
    req.user = user;

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

/**
 * Middleware to require a specific role
 * Must be used after verifyToken
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Middleware to require tenant ownership
 * Ensures user belongs to the tenant in the request
 */
const requireTenantAccess = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'No tenant access',
    });
  }

  // Get tenant ID from params or body
  const requestedTenantId = req.params.tenantId || req.body.tenantId;

  if (requestedTenantId && requestedTenantId !== req.user.tenantId._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this tenant',
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireRole,
  requireTenantAccess,
};
