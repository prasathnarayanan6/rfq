require('dotenv').config();
// Reuse the local quote agent's Bedrock settings unless this service has its own.
require('dotenv').config({ path: require('path').resolve(__dirname, '../AI/QuoteAgent/.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const vendorRouter = require('./vendor/router');
const app = express();
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' }));
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
