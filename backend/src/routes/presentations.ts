
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

router.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(process.cwd(), 'outputs', filename);

        // Проверяем что файл существует
        await fs.access(filepath);

        res.download(filepath, filename);

    } catch (error: any) {
        console.error('Download error:', error);
        res.status(404).json({
            success: false,
            error: 'File not found'
        });
    }
});

export const presentationsRouter = router;
