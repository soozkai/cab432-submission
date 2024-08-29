const express = require('express');
const router = express.Router();
const upload = require('./middleware/multer'); // Import the multer setup
const controller = require('./controller/videoController');
const authenticateToken = require('./middleware/authenticate'); // Import the authentication middleware

router.post('/login', controller.login);
router.post('/upload', upload.single('video'),authenticateToken,controller.uploadVideo);
router.post('/process', authenticateToken, controller.processVideo);
router.get('/progress/:videoId', authenticateToken, controller.getVideoProgress);
router.get('/videos/:username', authenticateToken, controller.getUserVideos);
router.delete('/videos/:id', authenticateToken, controller.deleteVideo);

module.exports = router;
