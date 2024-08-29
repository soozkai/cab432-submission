require('dotenv').config();
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const js2xmlparser = require('js2xmlparser');
const sequelize = require('../config/database');
const User = require('../models/User');
const Video = require('../models/Video');
const app = express();
const compression = require('compression');
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/videos', express.static(path.join(__dirname, '../videos')));

// Sync the database
sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// Setup multer for video uploads
const storage = multer.diskStorage({
  destination: './videos',
  filename: (req, file, cb) => {
    const originalFilename = file.originalname;
    cb(null, originalFilename);
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send('Welcome to the Video Transcoding App!');
});

// Login route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username, password } });

  if (user) {
    res.json({ success: true, message: 'Login successful', username: user.username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Video Upload Route
app.post('/api/upload', upload.single('video'), async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ where: { username } });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const videoPath = req.file.path;

  // Create video associated with the user
  const video = await Video.create({
    originalPath: videoPath,
    UserId: user.id // Set the UserId to associate with the user
  });

  res.status(201).json({ success: true, videoPath: video.originalPath });
});

app.post('/api/process', async (req, res) => {
  const { videoPath, format, compressionLevel, username } = req.body;

  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const video = await Video.findOne({ where: { originalPath: videoPath, userId: user.id } });
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  const outputPath = `./videos/compressed-${Date.now()}.${format}`;
  const bitrate = { low: '500k', medium: '1000k', high: '1500k' };

  if (!fs.existsSync('./videos')) fs.mkdirSync('./videos');
  console.log(video.id)
  // Send videoId back to the client first
  res.json({ success: true, videoId: video.id });

  ffmpeg(video.originalPath)
    .outputOptions([
      `-b:v ${bitrate[compressionLevel]}`,
      `-b:a 128k`,
      `-vf scale=1920:1080`,
      `-vcodec libx264`
    ])
    .output(outputPath)
    .on('progress', async (progress) => {
      try {
        console.log(`Progress: ${progress.percent}%`);
        video.processingProgress = progress.percent; // Update the progress in the database
        await video.save(); // Save the progress to the database
        console.log('Progress saved successfully');
      } catch (error) {
        console.error('Error saving progress:', error); // Log any errors during saving
      }
    })
    .on('end', async () => {
      try {
        console.log('Processing completed.');
        video.processedPath = outputPath;
        video.processingProgress = 100; // Set progress to 100% on completion
        await video.save();
        console.log('Final save completed successfully');
      } catch (error) {
        console.error('Error saving final progress:', error); // Log any errors during saving
      }
    })
    .on('error', (err) => {
      console.error('Error processing video:', err);
    })
    .run();
});

app.get('/api/progress/:videoId', async (req, res) => {
  const { videoId } = req.params;

  console.log(`Received request for video progress with ID: ${videoId}`); // Log the video ID received in the request

  try {
    // Find the video by ID using the Video model
    const video = await Video.findOne({ where: { id: videoId } });

    if (!video) {
      console.log(`Video with ID ${videoId} not found`); // Log if the video is not found
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    console.log(`Video found: ${video.originalPath}, Progress: ${video.processingProgress || 0}%`); // Log video details and progress

    // Send the current progress of the video
    res.json({ success: true, progress: video.processingProgress || 0 });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Fetch User Videos Route
app.get('/api/videos/:username', async (req, res) => {
  const { username } = req.params;

  console.log(`Fetching videos for user: ${username}`);

  // Find the user and include their associated videos
  try {
    const user = await User.findOne({
      where: { username },
      include: { model: Video }
    });

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const videos = user.Videos;  // Access the associated videos

    console.log(`Videos found for user ${username}:`, videos);

    const accept = req.headers.accept;
    if (accept === 'application/xml') {
      const xml = js2xmlparser.parse('videos', videos);
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } else {
      res.json({ success: true, videos });
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Video Route
app.delete('/api/videos/:id', async (req, res) => {
  const { username } = req.body;
  const { id } = req.params;  // Ensure this is being set correctly

  console.log('Delete request received:', { username, id });  // Check if id is properly passed here

  const user = await User.findOne({ where: { username } });
  if (!user) {
    console.log('User not found');
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const video = await Video.findOne({ where: { id, userId: user.id } });
  if (!video) {
    console.log('Video not found');
    return res.status(404).json({ success: false, message: 'Video not found' });
  }

  await video.destroy();
  console.log('Video deleted successfully');
  res.status(204).send();
});

// Start the server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
