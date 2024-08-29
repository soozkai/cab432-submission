const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Function to log messages to a file
function logMessage(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('load_test_log.txt', `[${timestamp}] ${message}\n`);
}

// Function to send a single upload request
async function uploadVideo(videoPath) {
    try {
        const form = new FormData();
        form.append('video', fs.createReadStream(videoPath));

        const response = await axios.post('http://localhost:5000/api/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        logMessage(`Upload Success: ${response.data.videoPath}`);
        return response.data.videoPath;
    } catch (error) {
        logMessage(`Upload Error: ${error.response ? error.response.data : error.message}`);
        return null;
    }
}

// Function to send a single processing request
async function processVideo(videoPath, format, compressionLevel) {
    try {
        const response = await axios.post('http://localhost:5000/api/process', {
            videoPath,
            format,
            compressionLevel
        });
        logMessage(`Process Success: ${response.data.videoPath}`);
    } catch (error) {
        logMessage(`Process Error: ${error.response ? error.response.data : error.message}`);
    }
}

// Function to simulate multiple users with different preferences in parallel
async function simulateLoad(concurrentUsers) {
    const videoOptions = [
        { videoPath: './videos/test1.mp4', format: 'mp4', compressionLevel: 'high' },
        { videoPath: './videos/test2.mov', format: 'mov', compressionLevel: 'low' },
        { videoPath: './videos/test1.mp4', format: 'mp4', compressionLevel: 'medium' },
    ];

    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
        const randomOption = videoOptions[Math.floor(Math.random() * videoOptions.length)];
        const uploadPromise = uploadVideo(randomOption.videoPath).then((videoPath) => {
            if (videoPath) {
                return processVideo(videoPath, randomOption.format, randomOption.compressionLevel);
            }
        });
        promises.push(uploadPromise);
    }

    // Execute all upload and process requests in parallel
    await Promise.all(promises);
    logMessage('All requests completed');
}

// Function to run the load simulation every few seconds for 10 minutes
function runLoadTestFor10Minutes() {
    const interval = setInterval(() => {
        simulateLoad(10); // Adjust this number based on the desired load
    }, 10000); // Adjust the interval timing (10 seconds)

    setTimeout(() => {
        clearInterval(interval);
        logMessage('Load test completed after 10 minutes.');
    }, 10 * 60 * 1000); // Run for 10 minutes (10 * 60 * 1000 ms)
}

// Start the 10-minute load test
runLoadTestFor10Minutes();
