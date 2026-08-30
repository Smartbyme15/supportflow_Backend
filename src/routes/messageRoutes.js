const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/authMiddleware');
const {
  getMessages,
  sendMessage,
} = require('../controllers/messageController');

router.get('/', protect, getMessages);
router.post('/', protect, sendMessage);

module.exports = router;