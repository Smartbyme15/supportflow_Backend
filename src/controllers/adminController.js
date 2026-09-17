const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    // Get ticket counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        if (user.role === 'customer') {
          userObj.ticketCount = await Ticket.countDocuments({ customer: user._id });
        } else if (user.role === 'agent') {
          userObj.ticketCount = await Ticket.countDocuments({ assignedAgent: user._id });
          userObj.resolvedCount = await Ticket.countDocuments({ 
            assignedAgent: user._id, 
            status: 'Resolved' 
          });
        }
        
        return userObj;
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithStats.length,
      users: usersWithStats,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
};

// @desc    Create new user (Admin can create agents/customers)
// @route   POST /api/admin/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'All fields required',
      });
    }

    if (!['customer', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
};

// @desc    Update user
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent admin from removing their own admin role
    if (user._id.toString() === req.user._id.toString() && role && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own role',
      });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role && ['customer', 'agent', 'admin'].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

// @desc    Get all tickets (Admin view)
// @route   GET /api/admin/tickets
// @access  Private (Admin)
const getAllTickets = async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const tickets = await Ticket.find(query)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
    });
  }
};

// @desc    Reassign ticket to different agent
// @route   PATCH /api/admin/tickets/:id/assign
// @access  Private (Admin)
const reassignTicket = async (req, res) => {
  try {
    const { agentId } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    if (agentId) {
      const agent = await User.findById(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(400).json({
          success: false,
          error: 'Invalid agent',
        });
      }
      ticket.assignedAgent = agentId;
      if (ticket.status === 'New') {
        ticket.status = 'Assigned';
      }
    } else {
      ticket.assignedAgent = null;
    }

    await ticket.save();
    await ticket.populate('customer', 'name email');
    await ticket.populate('assignedAgent', 'name email');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket-${ticket._id}`).emit('ticketStatusChanged', {
        ticketId: ticket._id,
        status: ticket.status,
      });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Reassign ticket error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reassign ticket',
    });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalAgents = await User.countDocuments({ role: 'agent' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const totalTickets = await Ticket.countDocuments();
    const newTickets = await Ticket.countDocuments({ status: 'New' });
    const assignedTickets = await Ticket.countDocuments({ status: 'Assigned' });
    const inProgressTickets = await Ticket.countDocuments({ status: 'In Progress' });
    const resolvedTickets = await Ticket.countDocuments({ status: 'Resolved' });
    const highPriorityTickets = await Ticket.countDocuments({ priority: 'High' });

    const totalMessages = await Message.countDocuments();

    // Recent tickets
    const recentTickets = await Ticket.find()
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          agents: totalAgents,
          admins: totalAdmins,
        },
        tickets: {
          total: totalTickets,
          new: newTickets,
          assigned: assignedTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          highPriority: highPriorityTickets,
        },
        messages: {
          total: totalMessages,
        },
      },
      recentTickets,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats',
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllTickets,
  reassignTicket,
  getAdminStats,
};