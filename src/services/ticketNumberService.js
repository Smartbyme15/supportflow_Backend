const Ticket = require('../models/Ticket');

const generateTicketNumber = async () => {
  // Find the last ticket with a ticket number
  const lastTicket = await Ticket.findOne({})
    .sort({ ticketNumber: -1 })
    .limit(1);

  let nextNumber = 100001;

  if (lastTicket) {
    const lastNumber = parseInt(lastTicket.ticketNumber.replace('SF-', ''));
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `SF-${nextNumber}`;
};

module.exports = { generateTicketNumber };