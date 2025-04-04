import express from 'express';
import { spawn } from 'child_process';
import ytDlp from 'yt-dlp-exec'; 
import path from 'path';
import fs from 'fs';
import os from 'os';
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index");
});

app.post('/convert-mp3', async (req, res) => {
    try {
        const videoUrl = req.body.url;
        const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
        if (!videoIdMatch) return res.status(400).send('Invalid YouTube URL');

        const secretCookiePath = '/etc/secrets/cookies.txt';
        const tempCookiePath = path.join(os.tmpdir(), 'cookies.txt');
        fs.copyFileSync(secretCookiePath, tempCookiePath);


        // Get clean video title
        let videoTitle = await ytDlp(videoUrl, {
            print: '%(title)s',
            cookies: tempCookiePath
        });

        videoTitle = videoTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_') || 'audio';

        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        const audioProc = spawn('yt-dlp', [
            '--cookies', tempCookiePath,
            '-f', 'bestaudio',
            '-o', '-', // stream to stdout
            videoUrl
        ]);

        audioProc.stdout.pipe(res);

        audioProc.stderr.on('data', (data) => {
            console.error(`yt-dlp error: ${data}`);
        });

        audioProc.on('close', (code) => {
            if (code !== 0) {
                res.status(500).send('Failed to download audio');
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Something went wrong');
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
