import { Router } from 'express';
import multer from 'multer';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB limit

/**
 * POST /v1/preview
 * File yukleme (PDF, PNG, JPG) ve icerigin OCR veya parser ile okunarak geri donulmesi.
 */
router.post('/', apiRateLimiter, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'File yuklenmedi (file alani gerekli)' });
        }

        const mimetype = file.mimetype;
        const isImage = mimetype.startsWith('image/');
        const isPdf = mimetype === 'application/pdf';
        const isText = mimetype.startsWith('text/');

        let extractedText = '';
        let method = 'unknown';

        if (isImage) {
            // Tesseract OCR ile gorselden metin cikar
            method = 'ocr';
            const worker = await createWorker('eng+tur'); // Ingilizce ve Turkce metin okuma
            const ret = await worker.recognize(file.buffer);
            extractedText = ret.data.text;
            await worker.terminate();
        } else if (isPdf) {
            // PDF icerisinden (ilk birkac sayfasindan) metin cikar
            method = 'pdf-parse';
            const maxPages = 2; // Sadece ilk 2 sayfa
            // @ts-ignore
            const data = await pdfParse(file.buffer, { max: maxPages });
            extractedText = data.text;
        } else if (isText) {
            method = 'text';
            extractedText = file.buffer.toString('utf-8').slice(0, 5000); // En fazla ilk 5000 karakter
        } else {
            return res.status(400).json({ error: 'Desteklenmeyen file turu. Sadece resim (image), metin veya PDF gecerlidir.' });
        }

        res.json({
            success: true,
            method,
            text: extractedText,
            fileName: file.originalname,
            size: file.size
        });
    } catch (error: any) {
        console.error('[Preview API Error]', error);
        res.status(500).json({ error: error?.message || 'File isleme hatasi olustu.' });
    }
});

export default router;
