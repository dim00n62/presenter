// backend/src/routes/upload.ts
import { Router } from 'express';
import multer from 'multer';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { db } from '../db/index.js';
import { parserService } from '../services/parser-service.js';

export const uploadRouter = Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and PDF allowed.'));
        }
    }
});

// Upload endpoint
uploadRouter.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { projectId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Ensure project exists or create new one
        let project;
        if (projectId) {
            project = await db.getProject(projectId);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
        } else {
            project = await db.createProject(`Project ${Date.now()}`);
        }

        // Create document record
        const document = await db.createDocument({
            projectId: project.id,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        });

        // Process file asynchronously (don't await)
        parserService.processFile(document.id, file.path, file.mimetype)
            .then(() => {
                console.log(`✅ Document ${document.id} processing complete`);
            })
            .catch(err => {
                console.error(`❌ Document ${document.id} processing failed:`, err);
            });

        res.json({
            success: true,
            document: {
                id: document.id,
                projectId: project.id,
                filename: document.originalName,
                status: document.status,
                uploadedAt: document.uploadedAt,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get document status
uploadRouter.get('/document/:id', async (req, res) => {
    try {
        await db.db.read();
        const doc = db.db.data.documents.find(d => d.id === req.params.id);

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Get chunks count if parsed
        const chunks = doc.status === 'parsed'
            ? await db.getChunksByDocument(doc.id)
            : [];

        res.json({
            ...doc,
            stats: {
                chunkCount: chunks.length,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get document chunks
uploadRouter.get('/document/:id/chunks', async (req, res) => {
    try {
        const chunks = await db.getChunksByDocument(req.params.id);
        res.json({ chunks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Get document chunks
uploadRouter.get('/project/:id', async (req, res) => {
    await db.db.read();
    const docs = db.db.data.documents.filter(d => d.projectId === req.params.id);
    try {
        res.json(docs || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});