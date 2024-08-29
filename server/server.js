require('dotenv').config();

const express = require('express');
const upload = require('../middleware/multer'); // Assuming multer setup is here
const videoController = require('../controller/videoController');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('../config/database');
const videoRouter = require('../router');
const compression = require('compression');
const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true 
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/videos', express.static(path.join(__dirname, '../videos')));
dotenv.config(); 

const port = process.env.PORT || 5000;


// Static files
app.use('/videos', express.static(path.join(__dirname, 'videos'))); // Serve video files statically

// Use the router
app.use('/api', videoRouter); 


// Connect to the database and start the server
sequelize.sync().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('Failed to connect to the database:', err);
});
