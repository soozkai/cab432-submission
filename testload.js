const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

function logMessage(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('load_test_log.txt', `[${timestamp}] ${message}\n`);
}

async function uploadVideo(videoPath, token, username) {
    try {
        const form = new FormData();
        form.append('video', fs.createReadStream(videoPath));
        form.append('username', username); // Add username to the form data

        const response = await axios.post('http://3.26.37.125:5000/api/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        logMessage(`Upload Success: ${response.data.videoPath}`);
        return response.data.videoPath;
    } catch (error) {
        logMessage(`Upload Error: ${error.response ? error.response.data : error.message}`);
        return null;
    }
}

async function processVideo(videoPath, format, compressionLevel, token, username) {
    try {
        const response = await axios.post('http://3.26.37.125:5000/api/process', {
            videoPath,
            format,
            compressionLevel,
            username // Include username in the request body
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        logMessage(`Process Success: ${response.data.videoPath}`);
    } catch (error) {
        logMessage(`Process Error: ${error.response ? error.response.data : error.message}`);
    }
}

async function simulateLoad(concurrentUsers, token) {
    const videoOptions = [
        { videoPath: './videos/IFB330.mp4', format: 'mp4', compressionLevel: 'high' },
        { videoPath: './videos/IFB330.mp4', format: 'mp4', compressionLevel: 'medium' },
    ];

    const username = 'testuser'; // Replace with the actual username if needed

    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
        const randomOption = videoOptions[Math.floor(Math.random() * videoOptions.length)];
        const uploadPromise = uploadVideo(randomOption.videoPath, token, username).then((videoPath) => {
            if (videoPath) {
                return processVideo(videoPath, randomOption.format, randomOption.compressionLevel, token, username);
            }
        });
        promises.push(uploadPromise);
    }

    await Promise.all(promises);
    logMessage('All requests completed');
}

function runLoadTestFor10Minutes(token) {
    const interval = setInterval(() => {
        simulateLoad(10, token);
    }, 10000);

    setTimeout(() => {
        clearInterval(interval);
        logMessage('Load test completed after 10 minutes.');
    }, 10 * 60 * 1000);
}

// Start the 10-minute load test with a token passed in
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTcyNDk0MDY1MSwiZXhwIjoxNzI1MDI3MDUxfQ.Nve31Q0xKRYnwPFFhdbJQ4i2MEBDT_9Uhr6FGvL8KcU';
runLoadTestFor10Minutes(token);
