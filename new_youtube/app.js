import express from 'express';
import { spawn } from 'child_process';

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

        // 🛠️ Get the video title
        const titleProcess = spawn('yt-dlp', ['--print', '%(title)s', videoUrl]);

        let videoTitle = '';
        for await (const chunk of titleProcess.stdout) {
            videoTitle += chunk.toString();
        }

        // Wait for the title process to finish
        await new Promise((resolve) => titleProcess.on('close', resolve));

        // 🧹 Clean title to make a safe filename
        videoTitle = videoTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

        if (!videoTitle) {
            videoTitle = 'audio'; // Default if title extraction fails
        }

        res.header('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        // 🎵 Stream the audio in MP3 format
        const process = spawn('yt-dlp', ['-f', 'bestaudio', '--audio-format', 'mp3', '-o', '-', videoUrl]);

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
