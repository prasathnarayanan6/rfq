const express = require('express');
const cookieParser = require('cookie-parser')
const app = express();
app.use(cookieParser());
app.listen('4007', (err) => {
    if (err) {
        console.log(err)
    }
    else {
        console.log(`Working`)
    }
})
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'Healthy',
        code: 200
    });
});