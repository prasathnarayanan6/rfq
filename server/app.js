const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env.mail'), override: true });
// Reuse the local quote agent's Bedrock settings unless this service has its own.
require('dotenv').config({ path: path.resolve(__dirname, '../AI/QuoteAgent/.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const vendorRouter = require('./vendor/router');
const authRouter = require('./Auth/AuthController');
const app = express();
app.use(cookieParser());
const allowedOrigins = [
  'http://localhost:3000',
  'https://d1ajdvs3zlxesc.cloudfront.net',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1/login', authRouter);
app.use('/api/v1/vendors', vendorRouter);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'Healthy',
        code: 200
    });
});
if (require.main === module) {
    app.listen(process.env.PORT || 4007, () => console.log('Working'));
}
module.exports = app;
