// frontend/src/lib/api.ts

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
    // ==================== PROJECTS ====================

    async getProjects() {
        const response = await fetch(`${API_BASE}/api/projects`);
        if (!response.ok) throw new Error('Failed to load projects');
        return response.json();
    },

    async getProject(id: string) {
        const response = await fetch(`${API_BASE}/api/projects/${id}`);
        if (!response.ok) throw new Error('Project not found');
        return response.json();
    },

    async createProject(data: {
        name: string;
        presentationGoal?: string;
        targetAudience?: string;
        presentationContext?: string;
        description?: string;
    }) {
        const response = await fetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create project');
        return response.json();
    },

    async updateProject(id: string, data: {
        name?: string;
        status?: string;
        presentationGoal?: string;
        targetAudience?: string;
        presentationContext?: string;
        description?: string;
    }) {
        const response = await fetch(`${API_BASE}/api/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update project');
        return response.json();
    },

    // ==================== DOCUMENTS ====================

    async uploadDocument(projectId: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);

        const response = await fetch(`${API_BASE}/api/documents/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return response.json();
    },

    async getDocuments(projectId: string) {
        const response = await fetch(`${API_BASE}/api/documents/project/${projectId}`);
        if (!response.ok) throw new Error('Failed to load documents');
        return response.json();
    },

    // ==================== ANALYSIS ====================

    async analyze(projectId: string) {
        const response = await fetch(`${API_BASE}/api/analysis/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });
        if (!response.ok) throw new Error('Analysis failed');
        return response.json();
    },

    async getAnalysis(projectId: string) {
        const response = await fetch(`${API_BASE}/api/analysis/project/${projectId}`);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error('Analysis not found');
        }
        return response.json();
    },

    // ==================== BLUEPRINTS ====================

    async generateBlueprint(projectId: string) {
        const response = await fetch(`${API_BASE}/api/blueprints/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });
        if (!response.ok) throw new Error('Blueprint generation failed');
        return response.json();
    },

    async getLatestBlueprint(projectId: string) {
        const response = await fetch(`${API_BASE}/api/blueprints/project/${projectId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Blueprint not found');
        }
        return response.json();
    },

    async updateBlueprint(blueprintId: string, slides: any[]) {
        const response = await fetch(`${API_BASE}/api/blueprints/${blueprintId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slides })
        });
        if (!response.ok) throw new Error('Failed to update blueprint');
        return response.json();
    },

    // ==================== CONTENT & EXPORT ====================

    async generateContent(projectId: string) {
        const response = await fetch(`${API_BASE}/api/generation/projects/${projectId}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Content generation failed');
        return response.json();
    },

    async getSlideContents(projectId: string) {
        const response = await fetch(`${API_BASE}/api/generation/project/${projectId}/slides`);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error('Failed to load slide contents');
        }
        return response.json();
    },

    async exportPPTX(projectId: string) {
        const response = await fetch(`${API_BASE}/api/generation/projects/${projectId}/generate-pptx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation_${Date.now()}.pptx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    // ==================== SPEAKER NOTES ====================

    async generateSpeakerNotes(projectId: string) {
        const response = await fetch(`${API_BASE}/api/speaker-notes/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });
        if (!response.ok) throw new Error('Speaker notes generation failed');
        return response.json();
    },

    async getSpeakerNotes(projectId: string) {
        const response = await fetch(`${API_BASE}/api/speaker-notes/project/${projectId}`);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error('Speaker notes not found');
        }
        return response.json();
    },

    async exportSpeakerNotesDocx(projectId: string) {
        const response = await fetch(`${API_BASE}/api/speaker-notes/export-docx/${projectId}`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `speaker_notes_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    // ==================== PLAYGROUND ====================

    async createTestPresentation(options: { theme?: string; includeCharts?: boolean }) {
        const response = await fetch(`${API_BASE}/api/generation/playground/test-presentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        });

        if (!response.ok) throw new Error('Test presentation generation failed');

        // 🔧 Скачиваем файл напрямую
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Извлекаем имя файла из заголовка Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
            : `test_presentation_${Date.now()}.pptx`;

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Возвращаем success для UI
        return { success: true, filename };
    },

    // ==================== HEALTH ====================

    async healthCheck() {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) throw new Error('Health check failed');
        return response.json();
    },
};

export default api;