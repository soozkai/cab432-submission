const User = require('../models/User');
const Video = require('../models/Video');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
// Login Logic
exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username, password } });
        if (user) {
            // Generate a JWT token
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ success: true, message: 'Login successful', token });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.uploadVideo = async (req, res) => {
    console.log('Request body:', req.body);
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
};

// Process Video Logic
exports.processVideo = async (req, res) => {
    const { videoPath, format, compressionLevel, username } = req.body;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const video = await Video.findOne({ where: { originalPath: videoPath, userId: user.id } });
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        const outputPath = `../videos/compressed-${Date.now()}.${format}`;
        const bitrate = { low: '500k', medium: '1000k', high: '1500k' };

        if (!fs.existsSync('./videos')) fs.mkdirSync('./videos');

        res.status(202).json({ success: true, videoId: video.id });

        ffmpeg(video.originalPath)
            .outputOptions([`-b:v ${bitrate[compressionLevel]}`, `-b:a 128k`, `-vf scale=1920:1080`, `-vcodec libx264`])
            .output(outputPath)
            .on('progress', async (progress) => {
                video.processingProgress = progress.percent;
                await video.save();
            })
            .on('end', async () => {
                video.processedPath = outputPath;
                video.processingProgress = 100;
                await video.save();
            })
            .on('error', (err) => {
                console.error('Error processing video:', err);
            })
            .run();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get Video Progress Logic
exports.getVideoProgress = async (req, res) => {
    const { videoId } = req.params;

    console.log(`Received request for video progress with ID: ${videoId}`);

    try {
        const video = await Video.findOne({ where: { id: videoId } });

        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        res.status(200).json({ success: true, progress: video.processingProgress || 0 });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Fetch User Videos Logic
exports.getUserVideos = async (req, res) => {
    const { username } = req.params;
    try {
        const user = await User.findOne({
            where: { username },
            include: { model: Video }
        });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const accept = req.headers.accept;
        if (accept === 'application/xml') {
            const xml = js2xmlparser.parse('videos', user.Videos);
            res.set('Content-Type', 'application/xml');
            res.status(200).send(xml);
        } else {
            res.status(200).json({ success: true, videos: user.Videos });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete Video Logic
exports.deleteVideo = async (req, res) => {
    const { username } = req.body;
    const { id } = req.params;
    try {
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const video = await Video.findOne({ where: { id, userId: user.id } });
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        await video.destroy();
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
