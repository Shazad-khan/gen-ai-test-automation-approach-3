import express from 'express';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const app = express();

let browser;
let page;
let capturedActions = [];
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
        browser = await puppeteer.launch({ headless: false });
        page = await browser.newPage();
        const targetUrl = req.query.url || 'https://example.com';
        await page.goto(targetUrl);

        capturedActions = [];
        res.send(`Capture started on ${targetUrl}`);
    } catch (error) {
        console.error('Error starting capture:', error);
        res.status(500).send('Error starting capture.');
    }
});

// API to stop capturing actions
app.get('/stop-capture', async (req, res) => {
    try {
        if (browser) {
            await browser.close();
            browser = null;
            res.json({ message: 'Capture stopped successfully', actions: capturedActions });
        } else {
            res.status(400).send('No active session to stop.');
        }
    } catch (error) {
        console.error('Error stopping capture:', error);
        res.status(500).send('Error stopping capture.');
    }
});

// API to serve the Ngrok URL
app.get('/ngrok-url', (req, res) => {
    if (ngrokUrl) {
        res.json({ url: ngrokUrl });
    } else {
        res.status(500).json({ error: 'Ngrok URL not available yet.' });
    }
});

// Function to fetch the Ngrok URL
const fetchNgrokUrl = async () => {
    try {
        const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
        ngrokUrl = response.data.tunnels[0].public_url;
        console.log(`Ngrok URL: ${ngrokUrl}`);
    } catch (error) {
        console.error('Error fetching Ngrok URL:', error);
    }
};

// Start the server
const PORT = process.env.PORT || 9999;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    setTimeout(fetchNgrokUrl, 5000);
});
