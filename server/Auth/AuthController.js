const express = require('express');
const rateLimit = require('express-rate-limit');
const LoginModel = require('./AuthModel');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { status: 'Too many login attempts. Please try again later.', code: 429 },
});

router.post('/', loginLimiter, async (req, res) => {
  const userMail = String(req.body?.user_mail || '').trim();
  const userPassword = String(req.body?.user_password || '');

  if (!userMail || !userPassword) {
    return res.status(400).json({ status: 'Email and password are required', code: 400 });
  }

  try {
    const deviceInfo = String(req.get('user-agent') || '').slice(0, 500);
    const result = await LoginModel(userMail, userPassword, deviceInfo, req.ip);
    return res.status(result.code).json(result);
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ status: 'Login service is unavailable', code: 500 });
  }
});

module.exports = router;
