const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const isWin = process.platform === 'win32';
const UPLOAD_DIR = isWin ? path.join(process.env.TEMP || 'C:\\Temp', 'fileconvert_uploads') : '/tmp/fileconvert_uploads';
const OUTPUT_DIR = isWin ? path.join(process.env.TEMP || 'C:\\Temp', 'fileconvert_output') : '/tmp/fileconvert_output';

const LIBREOFFICE = isWin ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' : 'libreoffice';
const IMAGEMAGICK = isWin ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe' : 'convert';
const FFMPEG = isWin ? 'C:\\Users\\leosi\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe' : 'ffmpeg';

app.use(cors());
app.use(express.json());

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

function runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: 120000, maxBuffer: 50 * 1024 * 1024, shell: true }, (error, stdout, stderr) => {
            if (error) reject(new Error(stderr || error.message));
            else resolve(stdout);
        });
    });
}

function getToolName(inputExt) {
    const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'psd'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm', 'flv', '3gp'];
    if (imgExts.includes(inputExt)) return 'image';
    if (audioExts.includes(inputExt)) return 'audio';
    if (videoExts.includes(inputExt)) return 'video';
    return 'document';
}

async function convertDocument(inputPath, outputDir, targetFormat) {
    await runCommand(`"${LIBREOFFICE}"`, ['--headless', '--norestore', '--convert-to', targetFormat, '--outdir', outputDir, inputPath]);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const expected = path.join(outputDir, `${baseName}.${targetFormat}`);
    if (fs.existsSync(expected)) return expected;
    const files = fs.readdirSync(outputDir);
    const match = files.find(f => f.startsWith(baseName) && f.endsWith(`.${targetFormat}`));
    if (match) return path.join(outputDir, match);
    throw new Error('Arquivo de saida nao encontrado');
}

async function convertImage(inputPath, outputDir, targetFormat) {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputFile = path.join(outputDir, `${baseName}.${targetFormat}`);
    const magick = `"${IMAGEMAGICK}"`;
    const inputExt = path.extname(inputPath).slice(1).toLowerCase();
    const isHeicInput = ['heic', 'heif'].includes(inputExt);
    const isHeicOutput = ['heic', 'heif'].includes(targetFormat);

    if (isHeicInput || isHeicOutput) {
        await runCommand(magick, [inputPath, '-quality', '95', outputFile]);
    } else if (targetFormat === 'pdf' || ['ico', 'bmp', 'tiff', 'tif'].includes(targetFormat)) {
        await runCommand(magick, [inputPath, outputFile]);
    } else {
        await runCommand(magick, [inputPath, `${targetFormat}:${outputFile}`]);
    }

    if (!fs.existsSync(outputFile)) {
        const match = fs.readdirSync(outputDir).find(f => f.startsWith(baseName));
        if (match) return path.join(outputDir, match);
        throw new Error('Arquivo de saida nao encontrado');
    }
    return outputFile;
}

async function convertAudio(inputPath, outputDir, targetFormat) {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputFile = path.join(outputDir, `${baseName}.${targetFormat}`);
    const args = ['-i', inputPath, '-y'];
    if (targetFormat === 'mp3') args.push('-codec:a', 'libmp3lame', '-b:a', '192k');
    else if (targetFormat === 'aac') args.push('-codec:a', 'aac', '-b:a', '192k');
    else if (targetFormat === 'wav') args.push('-codec:a', 'pcm_s16le');
    args.push(outputFile);
    await runCommand(`"${FFMPEG}"`, args);
    if (!fs.existsSync(outputFile)) throw new Error('Arquivo de saida nao encontrado');
    return outputFile;
}

async function convertVideo(inputPath, outputDir, targetFormat) {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputFile = path.join(outputDir, `${baseName}.${targetFormat}`);
    let args;
    if (targetFormat === 'gif') {
        args = ['-i', inputPath, '-y', '-vf', 'fps=10,scale=480:-1:flags=lanczos', '-loop', '0', outputFile];
    } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(targetFormat)) {
        args = ['-i', inputPath, '-y', '-vn', '-acodec', 'copy', outputFile];
    } else {
        args = ['-i', inputPath, '-y', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', outputFile];
    }
    await runCommand(`"${FFMPEG}"`, args);
    if (!fs.existsSync(outputFile)) throw new Error('Arquivo de saida nao encontrado');
    return outputFile;
}

app.get('/api/formats', (req, res) => {
    res.json({
        documents: ['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt', 'html', 'htm', 'epub'],
        spreadsheets: ['xlsx', 'xls', 'csv', 'ods'],
        presentations: ['pptx', 'ppt', 'odp'],
        images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'heif', 'psd', 'pdf'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'],
        video: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm', 'flv', '3gp']
    });
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const targetFormat = req.body.format;
        if (!targetFormat) return res.status(400).json({ error: 'Formato de saida nao especificado' });

        const inputPath = req.file.path;
        const inputExt = path.extname(req.file.originalname).slice(1).toLowerCase();
        const tool = getToolName(inputExt);
        const jobDir = path.join(OUTPUT_DIR, uuidv4());
        fs.mkdirSync(jobDir, { recursive: true });

        let outputFile;
        if (tool === 'document') outputFile = await convertDocument(inputPath, jobDir, targetFormat);
        else if (tool === 'image') outputFile = await convertImage(inputPath, jobDir, targetFormat);
        else if (tool === 'audio') outputFile = await convertAudio(inputPath, jobDir, targetFormat);
        else if (tool === 'video') outputFile = await convertVideo(inputPath, jobDir, targetFormat);
        else return res.status(400).json({ error: `Formato nao suportado: ${inputExt}` });

        const outputFileName = path.basename(outputFile);
        res.download(outputFile, outputFileName, (err) => {
            if (err && !res.headersSent) return res.status(500).json({ error: 'Erro ao enviar arquivo' });
            setTimeout(() => { try { fs.rmSync(jobDir, { recursive: true, force: true }); fs.unlinkSync(inputPath); } catch (e) {} }, 5000);
        });
    } catch (error) {
        console.error('Erro na conversao:', error.message);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (e) {}
        res.status(500).json({ error: error.message || 'Erro interno na conversao' });
    }
});

app.get('/api/health', (req, res) => {
    const checks = { libreoffice: false, imagemagick: false, ffmpeg: false };
    const opts = { stdio: 'pipe', shell: true };
    try { execSync(`"${LIBREOFFICE}" --version`, opts); checks.libreoffice = true; } catch (e) {}
    try { execSync(`"${IMAGEMAGICK}" --version`, opts); checks.imagemagick = true; } catch (e) {}
    try { execSync(`"${FFMPEG}" -version`, opts); checks.ffmpeg = true; } catch (e) {}
    res.json({ status: 'ok', tools: checks, timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log(`FileConvert API rodando em http://localhost:${PORT}`));
