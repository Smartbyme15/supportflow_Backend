const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { isAgent } = require('../middleware/roleMiddleware');
const { getStats } = require('../controllers/dashboardController');

router.get('/stats', protect, isAgent, getStats);

module.exports = router;