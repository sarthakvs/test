import express from 'express';
import { spawn } from 'child_process';
import ytDlp from 'yt-dlp-exec'; 
import path from 'path';

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

        const videoId = videoIdMatch[1];

        // 🛠️ Get the video title using cookies
        let videoTitle = await ytDlp(videoUrl, {
            print: '%(title)s',
            cookies: 'cookies.txt' // ✅ Pass YouTube cookies
        });

        // 🧹 Clean title for a safe filename
        videoTitle = videoTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_') || 'audio';

        res.header('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        // 🎵 Stream the audio as MP3
        const cookiesPath = '/etc/secrets/cookies';

        const process = spawn('yt-dlp', [
            '-f', 'bestaudio',
            '--cookies', cookiesPath,  // ✅ Use the secret cookies file
            '-o', '-',
            videoUrl
        ]);

        process.stdout.pipe(res);

        process.stderr.on('data', (data) => {
            console.error(`yt-dlp error: ${data}`);
        });

        process.on('close', (code) => {
            if (code !== 0) {
                res.status(500).send('Failed to process request');
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Failed to process request');
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
