// backend/src/routes/projects.ts

import { Router } from 'express';
import { db } from '../db/index.js';

export const projectsRouter = Router();

// Create project
projectsRouter.post('/', async (req, res) => {
    try {
        const {
            name,
            description,
            presentationGoal,
            targetAudience,
            presentationContext,
            keyMessage
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const project = {
            id: crypto.randomUUID(),
            name,
            description: description || presentationGoal, // Fallback
            presentationGoal,
            targetAudience,
            presentationContext,
            keyMessage,
            status: 'active' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.createProject(project);

        res.json(project);
    } catch (error: any) {
        console.error('Create project error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all projects
projectsRouter.get('/', async (req, res) => {
    try {
        await db.db.read();
        const projects = db.db.data.projects || [];
        res.json(projects);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single project
projectsRouter.get('/:id', async (req, res) => {
    try {
        const project = await db.getProject(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update project
projectsRouter.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        await db.updateProject(req.params.id, updates);

        const updated = await db.getProject(req.params.id);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default projectsRouter;