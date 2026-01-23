const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    farmName: {
      type: String,
      trim: true,
      maxlength: [100, 'Farm name cannot exceed 100 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    source: {
      type: String,
      enum: ['contact_page', 'pricing_page', 'homepage', 'demo_request'],
      default: 'contact_page',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'closed'],
      default: 'new',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for admin queries
contactInquirySchema.index({ status: 1, createdAt: -1 });
contactInquirySchema.index({ email: 1 });

module.exports = mongoose.model('ContactInquiry', contactInquirySchema);
