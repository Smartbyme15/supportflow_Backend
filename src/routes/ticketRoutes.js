const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isCustomer, isAgent } = require('../middleware/roleMiddleware');
const {
  createTicket,
  getMyTickets,
  getAssignedTickets,
  getTicketById,
  reviewAISuggestion,
  updateStatus,
} = require('../controllers/ticketController');

// Customer routes
router.post('/', protect, isCustomer, createTicket);
router.get('/my', protect, isCustomer, getMyTickets);

// Agent routes
router.get('/assigned', protect, isAgent, getAssignedTickets);
router.patch('/:id/ai-review', protect, isAgent, reviewAISuggestion);
router.patch('/:id/status', protect, isAgent, updateStatus);

// Both roles
router.get('/:id', protect, getTicketById);

module.exports = router;