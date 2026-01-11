// frontend/src/components/ProjectList.tsx
import { useEffect, useState } from 'react';
import { Card, Button, Spinner } from '@heroui/react';
import { api } from '../lib/api';

interface Project {
    id: string;
    name: string;
    description?: string;
    // НОВЫЕ ПОЛЯ:
    presentationGoal?: string;      // Цель презентации (одно предложение)
    targetAudience?: string;        // Целевая аудитория
    presentationContext?: string;   // Контекст/повод
    keyMessage?: string;            // Ключевое сообщение
    status: 'active' | 'completed' | 'archived';
    createdAt: string;
    updatedAt?: string;
}

interface Props {
    selectedProjectId?: string;
    onSelectProject: (id: string) => void;
}

export function ProjectList({ selectedProjectId, onSelectProject }: Props) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await api.getProjects();
            setProjects(data.projects || []);

            // Auto-select first project if none selected
            if (!selectedProjectId && data.projects?.length > 0) {
                onSelectProject(data.projects[0].id);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        const name = prompt('Enter project name:');
        if (!name) return;

        try {
            const data = await api.createProject({ name });
            setProjects([...projects, data.project]);
            onSelectProject(data.project.id);
        } catch (error) {
            console.error('Failed to create project:', error);
            alert('Failed to create project');
        }
    };

    if (loading) {
        return (
            <Card className="p-6 flex items-center justify-center">
                <Spinner />
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Projects</h2>
                <Button size="sm" color="default" onClick={handleCreateProject}>
                    + New
                </Button>
            </div>

            <div className="space-y-2">
                {projects.length === 0 ? (
                    <p className="text-sm text-gray-500">No projects yet</p>
                ) : (
                    projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            className={`w-full text-left p-3 rounded-lg transition ${selectedProjectId === project.id
                                ? 'bg-blue-100 border-2 border-blue-500'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                }`}
                        >
                            <p className="font-medium truncate">{project.name}</p>
                            <p className="text-xs text-gray-500">
                                {new Date(project.createdAt).toLocaleDateString()}
                            </p>
                        </button>
                    ))
                )}
            </div>
        </Card>
    );
}