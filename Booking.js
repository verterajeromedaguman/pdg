const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  clientName:      { type: String, required: true },
  email:           { type: String, required: true },
  eventName:       { type: String, default: "General Booking" },
  phone:           { type: String, default: "Not Provided" },
  serviceBooked:   { type: String, default: "Unspecified Service" },
  scheduleDate:    { type: String, default: "TBD" },
  eventTime:       { type: String, default: "TBD" },
  eventVenue:      { type: String, default: "TBD" },
  specialRequests: { type: String, default: "None" },

  // --- UPGRADED: Multiple staff with roles per booking ---
  assignedStaff: [
    {
      name: { type: String, required: true },
      role: {
        type: String,
        enum: ['Lead Dancer', 'Backup Dancer', 'Choreographer', 'Stage Manager', 'Costume Handler', 'Other'],
        required: true
      }
    }
  ],
  // -------------------------------------------------------

  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending'
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);