const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Define Booking model
const Booking = require('./Booking'); 

// Initialize app ONCE
const app = express(); 
const upload = multer({ storage: multer.memoryStorage() });

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("💾 Securely integrated with MongoDB Cloud Registry!"))
  .catch(err => console.error("❌ Database Connection Interrupted:", err));

// ... (Rest of your code, including schemas and routes, follows below)

// =================================================================
// STAFF SCHEMA
// =================================================================
const StaffSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  phone:         { type: String, required: true }, // Changed to required
  imageUrl:      { type: String, default: '' },    // New field for picture URL
  availableRoles: [{ 
    type: String, 
    enum: ['Lead Dancer', 'Backup Dancer', 'Choreographer', 'Stage Manager', 'Costume Handler', 'Other'] 
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Staff = mongoose.model('Staff', StaffSchema);

// =================================================================
// STAFF ROUTES
// =================================================================
app.get('/api/staff', async (req, res) => {
  try {
    // This fetches all staff members regardless of their active status
    const staff = await Staff.find().sort({ name: 1 });
    res.json({ success: true, data: staff });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Make sure you have: const upload = multer({ storage: multer.memoryStorage() }); at the top of your file

app.post('/api/staff', upload.single('staffPhoto'), async (req, res) => {
  try {
    // 1. Convert the file buffer to a base64 string
    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // 2. Create the staff object using data from the form
    const newStaff = new Staff({
      name: req.body.name,
      phone: req.body.phone,
      imageUrl: imageUrl, 
      availableRoles: JSON.parse(req.body.roles), // Remember to JSON.parse the roles
      isActive: true
    });

    // 3. Save to database
    await newStaff.save();
    res.status(201).json({ success: true, data: newStaff });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
app.delete('/api/staff/:id', async (req, res) => {
  try {
    const deleted = await Staff.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    res.json({ success: true, message: "Staff removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// =================================================================
// BOOKING RECEIPT ROUTE
// =================================================================
app.post('/api/send-receipt', async (req, res) => {
  const { email, clientName, eventName, pdfBase64, phone, serviceBooked, scheduleDate, eventTime, eventVenue, specialRequests } = req.body;

  if (!email || !pdfBase64) {
    return res.status(400).json({ success: false, message: "Required dispatch components missing." });
  }

  try {
    const newBooking = new Booking({
      clientName: clientName || "Valued Client",
      email, eventName: eventName || "General Booking",
      phone: phone || "Not Provided",
      serviceBooked: serviceBooked || "Unspecified Service",
      scheduleDate: scheduleDate || "TBD",
      eventTime: eventTime || "TBD",
      eventVenue: eventVenue || "TBD",
      specialRequests: specialRequests || "None"
    });

    await newBooking.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Project Dance Guild" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✨ Booking Received! - ${clientName}`,
      html: `<p>Thank you, ${clientName}! Your booking for <strong>${eventName}</strong> has been received.</p>`,
      attachments: [{
        filename: `PDG_Receipt_${clientName.replace(/\s+/g, '_')}.pdf`,
        content: pdfBase64.split("base64,")[1],
        encoding: 'base64'
      }]
    });

    res.status(200).json({ success: true, message: "Booking archived and receipt dispatched!" });
  } catch (error) {
    console.error("Transporter Error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// =================================================================
// ADMIN BOOKING ROUTES
// =================================================================
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const allBookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: allBookings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch records." });
  }
});


// Update booking status — must be before /:id to avoid route conflict
app.put('/api/admin/bookings/status/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    res.json({ success: true, data: updatedBooking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server update failed" });
  }
});



// Assign staff to booking
app.put('/api/admin/bookings/:id', async (req, res) => {
  try {
    const { assignedStaff } = req.body;
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { assignedStaff },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server update failed" });
  }
});





// DELETE STAFF - Permanent removal
// DELETE A BOOKING
app.delete('/api/admin/bookings/:id', async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error during deletion" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is alive on http://localhost:${PORT}`);
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid password" });
  }
});