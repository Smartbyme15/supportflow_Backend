const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Billing', 'Technical', 'Account', 'Order', 'Delivery', 'Refund', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    aiSuggestion: {
      category: {
        type: String,
        enum: ['Billing', 'Technical', 'Account', 'Order', 'Delivery', 'Refund', 'Other'],
      },
      priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
      },
      summary: {
        type: String,
        maxlength: 200,
      },
      reviewed: {
        type: Boolean,
        default: false,
      },
      error: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ['New', 'Assigned', 'In Progress', 'Resolved'],
      default: 'New',
    },
    resolutionNote: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes - remove duplicate
ticketSchema.index({ customer: 1, status: 1 });
ticketSchema.index({ assignedAgent: 1, status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);