const multer = require('multer');
const path = require('path');

// Define storage settings for multer
const storage = multer.diskStorage({
  destination: '../videos',
  filename: (req, file, cb) => {
    const originalFilename = file.originalname;
    cb(null, originalFilename);
  }
});

const upload = multer({ storage });

module.exports = upload;
