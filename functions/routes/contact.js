const express = require('express');
const { body, validationResult } = require('express-validator');
const { ContactInquiry } = require('../models');

const router = express.Router();

/**
 * POST /api/contact
 * Submit a contact inquiry
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone cannot exceed 20 characters'),
    body('farmName')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Farm name cannot exceed 100 characters'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 2000 })
      .withMessage('Message cannot exceed 2000 characters'),
    body('source')
      .optional()
      .isIn(['contact_page', 'pricing_page', 'homepage', 'demo_request'])
      .withMessage('Invalid source'),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
          })),
        });
      }

      const { name, email, phone, farmName, message, source } = req.body;

      // Create inquiry
      const inquiry = await ContactInquiry.create({
        name,
        email,
        phone,
        farmName,
        message,
        source: source || 'contact_page',
      });

      res.status(201).json({
        success: true,
        message: 'Thank you for your inquiry. We will be in touch soon!',
        data: {
          id: inquiry._id,
        },
      });
    } catch (error) {
      console.error('Contact submission error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred. Please try again later.',
      });
    }
  }
);

module.exports = router;
