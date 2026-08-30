const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const User = require('../models/User');
const { generateTicketNumber } = require('../services/ticketNumberService');
const { analyzeTicket } = require('../services/aiService');

// @desc    Create ticket
// @route   POST /api/tickets
// @access  Private (Customer)
const createTicket = async (req, res) => {
  try {
    const { subject, description, category } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        error: 'Subject and description are required'
      });
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Create ticket
    const ticketData = {
      ticketNumber,
      customer: req.user._id,
      subject,
      description,
      status: 'New',
    };

    if (category && ['Billing', 'Technical', 'Account', 'Order', 'Delivery', 'Refund', 'Other'].includes(category)) {
      ticketData.category = category;
    }

    const ticket = await Ticket.create(ticketData);

    // Try AI analysis (non-blocking)
    try {
      const aiResult = await analyzeTicket(subject, description);
      if (aiResult.success) {
        ticket.aiSuggestion = {
          category: aiResult.data.category,
          priority: aiResult.data.priority,
          summary: aiResult.data.summary,
          reviewed: false,
        };
        await ticket.save();
      } else {
        ticket.aiSuggestion = { error: aiResult.error };
        await ticket.save();
      }
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      ticket.aiSuggestion = { error: 'AI analysis failed' };
      await ticket.save();
    }

    // Try to assign to an agent (simple round-robin)
    try {
      const agents = await User.find({ role: 'agent' }).select('_id');
      if (agents.length > 0) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        ticket.assignedAgent = randomAgent._id;
        ticket.status = 'Assigned';
        await ticket.save();
      }
    } catch (assignError) {
      console.error('Agent assignment error:', assignError);
    }

    // Populate customer data
    await ticket.populate('customer', 'name email');
    if (ticket.assignedAgent) {
      await ticket.populate('assignedAgent', 'name email');
    }

    res.status(201).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ticket',
    });
  }
};

// @desc    Get customer's tickets
// @route   GET /api/tickets/my
// @access  Private (Customer)
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ customer: req.user._id })
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
    });
  }
};

// @desc    Get agent's tickets
// @route   GET /api/tickets/assigned
// @access  Private (Agent)
const getAssignedTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ assignedAgent: req.user._id })
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Get assigned tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
    });
  }
};

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check authorization
    const isCustomer = ticket.customer._id.toString() === req.user._id.toString();
    const isAgent = ticket.assignedAgent && ticket.assignedAgent._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this ticket',
      });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket',
    });
  }
};

// @desc    Review AI suggestion
// @route   PATCH /api/tickets/:id/ai-review
// @access  Private (Agent)
const reviewAISuggestion = async (req, res) => {
  try {
    const { category, priority, summary } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check if agent is assigned to this ticket
    if (ticket.assignedAgent && ticket.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this ticket',
      });
    }

    // Update ticket with reviewed AI suggestions
    if (category) ticket.category = category;
    if (priority) ticket.priority = priority;
    if (summary) ticket.summary = summary;

    // Mark AI suggestion as reviewed
    if (ticket.aiSuggestion) {
      ticket.aiSuggestion.reviewed = true;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Review AI error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review AI suggestion',
    });
  }
};

// @desc    Update ticket status
// @route   PATCH /api/tickets/:id/status
// @access  Private (Agent)
const updateStatus = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check if agent is assigned to this ticket
    if (ticket.assignedAgent && ticket.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to this ticket',
      });
    }

    // Don't allow changes to Resolved tickets unless reopening
    if (ticket.status === 'Resolved' && status !== 'Resolved') {
      // Allow reopening
      ticket.status = status;
    } else if (ticket.status === 'Resolved' && status === 'Resolved') {
      return res.status(400).json({
        success: false,
        error: 'Ticket is already resolved',
      });
    } else {
      // Check if trying to resolve without resolution note
      if (status === 'Resolved' && (!resolutionNote || resolutionNote.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: 'Resolution note is required to resolve a ticket',
        });
      }

      ticket.status = status;
      if (status === 'Resolved') {
        ticket.resolutionNote = resolutionNote.trim();
      }
    }

    await ticket.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket-${ticket._id}`).emit('ticketStatusChanged', {
        ticketId: ticket._id,
        status: ticket.status,
        resolutionNote: ticket.resolutionNote,
      });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
    });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAssignedTickets,
  getTicketById,
  reviewAISuggestion,
  updateStatus,
};