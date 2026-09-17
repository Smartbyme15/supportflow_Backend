const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllTickets,
  reassignTicket,
  getAdminStats,
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
const isAdmin = roleMiddleware('admin');

router.get('/stats', protect, isAdmin, getAdminStats);

router.get('/users', protect, isAdmin, getAllUsers);
router.get('/users/:id', protect, isAdmin, getUserById);
router.post('/users', protect, isAdmin, createUser);
router.patch('/users/:id', protect, isAdmin, updateUser);
router.delete('/users/:id', protect, isAdmin, deleteUser);

router.get('/tickets', protect, isAdmin, getAllTickets);
router.patch('/tickets/:id/assign', protect, isAdmin, reassignTicket);

module.exports = router;