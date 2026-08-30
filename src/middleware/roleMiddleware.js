const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${req.user.role}s cannot access this resource`,
      });
    }

    next();
  };
};

// Helper middleware for checking if user is agent
const isAgent = roleMiddleware('agent');

// Helper middleware for checking if user is customer
const isCustomer = roleMiddleware('customer');

// Helper middleware for checking if user is agent or customer (any authenticated user)
const isAuthenticated = roleMiddleware('customer', 'agent');

module.exports = {
  roleMiddleware,
  isAgent,
  isCustomer,
  isAuthenticated,
};