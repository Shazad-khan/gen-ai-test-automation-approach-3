import express from 'express';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const app = express();

let browser;
let page;
let capturedActions = []; // Holds the captured user actions
let ngrokUrl = ''; // Stores the Ngrok public URL

// Serve index.html for displaying the Ngrok URL
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

// API to start capturing actions
app.get('/start-capture', async (req, res) => {
    try {
        console.log('Starting interaction capture...');

        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        page = await browser.newPage();
        const targetUrl = req.query.url || 'https://example.com';
        await page.goto(targetUrl);

        console.log(`Navigated to: ${targetUrl}`);
        capturedActions = []; // Reset captured actions

        res.send(`Capture started on ${targetUrl}. Browser opened for interaction.`);
    } catch (error) {
        console.error('Error starting capture:', error.message);
        res.status(500).send('Error starting capture: ' + error.message);
    }
});

// API to stop capturing actions
app.get('/stop-capture', async (req, res) => {
    try {
        if (browser) {
            await browser.close();
            browser = null;
            console.log('Browser closed successfully.');
            res.json({ message: 'Capture stopped successfully.', actions: capturedActions });
        } else {
            res.status(400).send('No active browser session to stop.');
        }
    } catch (error) {
        console.error('Error stopping capture:', error.message);
        res.status(500).send('Error stopping capture: ' + error.message);
    }
});

// API to serve the Ngrok URL
app.get('/ngrok-url', (req, res) => {
    if (!ngrokUrl) {
        res.status(500).json({ error: 'Ngrok URL not available yet.' });
    } else {
        res.json({ url: ngrokUrl });
    }
});

// Function to fetch the Ngrok URL
const fetchNgrokUrl = async () => {
    try {
        const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
        ngrokUrl = response.data.tunnels[0].public_url;
        console.log(`Ngrok URL: ${ngrokUrl}`);
    } catch (error) {
        console.error('Error fetching Ngrok URL:', error.message);
    }
};

// Start the server
const PORT = process.env.PORT || 9999;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Wait a few seconds to ensure Ngrok is running
    setTimeout(fetchNgrokUrl, 5000);
});
