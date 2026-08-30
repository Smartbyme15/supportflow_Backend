const Message = require('../models/Message');
const Ticket = require('../models/Ticket');

// @desc    Get messages for a ticket
// @route   GET /api/tickets/:id/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check authorization
    const isCustomer = ticket.customer.toString() === req.user._id.toString();
    const isAgent = ticket.assignedAgent && ticket.assignedAgent.toString() === req.user._id.toString();

    if (!isCustomer && !isAgent) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view messages',
      });
    }

    const messages = await Message.find({ ticket: ticketId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
};

// @desc    Send message
// @route   POST /api/tickets/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check authorization
    const isCustomer = ticket.customer.toString() === req.user._id.toString();
    const isAgent = ticket.assignedAgent && ticket.assignedAgent.toString() === req.user._id.toString();

    if (!isCustomer && !isAgent) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to send messages',
      });
    }

    // Don't allow messages on resolved tickets
    if (ticket.status === 'Resolved') {
      return res.status(400).json({
        success: false,
        error: 'Cannot send messages on resolved tickets',
      });
    }

    const newMessage = await Message.create({
      ticket: ticketId,
      sender: req.user._id,
      message: message.trim(),
    });

    await newMessage.populate('sender', 'name email role');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket-${ticket._id}`).emit('newMessage', {
        ticketId: ticket._id,
        message: newMessage,
      });
    }

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
};