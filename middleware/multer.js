const multer = require('multer');
const path = require('path');

// Define storage settings for multer
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../videos'), 
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

module.exports = upload;
