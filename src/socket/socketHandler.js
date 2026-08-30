const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ticket = require('../models/Ticket');

const socketHandler = (io) => {
  // Use middleware for authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          return next(new Error('Invalid token'));
        }

        try {
          const user = await User.findById(decoded.id).select('-password');
          if (!user) {
            return next(new Error('User not found'));
          }
          socket.user = user;
          next();
        } catch (error) {
          next(new Error('Authentication failed'));
        }
      });
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user?.email || 'Unknown'})`);

    // Join ticket room
    socket.on('joinTicket', async (ticketId) => {
      try {
        if (!socket.user) {
          socket.emit('error', 'Not authenticated');
          return;
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          socket.emit('error', 'Ticket not found');
          return;
        }

        // Check if user is authorized
        const isCustomer = ticket.customer.toString() === socket.user._id.toString();
        const isAgent = ticket.assignedAgent && ticket.assignedAgent.toString() === socket.user._id.toString();

        if (!isCustomer && !isAgent) {
          socket.emit('error', 'Not authorized to join this ticket');
          return;
        }

        socket.join(`ticket-${ticketId}`);
        socket.emit('joinedTicket', { ticketId });
        console.log(`User ${socket.user.email} joined ticket ${ticketId}`);
      } catch (error) {
        console.error('Join ticket error:', error);
        socket.emit('error', 'Failed to join ticket');
      }
    });

    // Leave ticket room
    socket.on('leaveTicket', (ticketId) => {
      socket.leave(`ticket-${ticketId}`);
      console.log(`User left ticket ${ticketId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = socketHandler;