const Ticket = require('../models/Ticket');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private (Agent)
const getStats = async (req, res) => {
  try {
    const agentId = req.user._id;

    const stats = await Ticket.aggregate([
      {
        $match: {
          assignedAgent: agentId,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = {
      New: 0,
      Assigned: 0,
      'In Progress': 0,
      Resolved: 0,
    };

    stats.forEach(stat => {
      if (stat._id in statusMap) {
        statusMap[stat._id] = stat.count;
      }
    });

    // Get high priority count
    const highPriority = await Ticket.countDocuments({
      assignedAgent: agentId,
      priority: 'High',
      status: { $ne: 'Resolved' },
    });

    const total = await Ticket.countDocuments({
      assignedAgent: agentId,
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        new: statusMap.New,
        assigned: statusMap.Assigned,
        inProgress: statusMap['In Progress'],
        resolved: statusMap.Resolved,
        highPriority,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
    });
  }
};

module.exports = { getStats };