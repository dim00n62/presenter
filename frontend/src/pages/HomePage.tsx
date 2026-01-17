// frontend/src/pages/HomePage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Button, Input, Textarea, Select, SelectItem,
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    useDisclosure
} from '@heroui/react';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function HomePage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);

    // Form state
    const [projectName, setProjectName] = useState('');
    const [presentationGoal, setPresentationGoal] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [presentationContext, setPresentationContext] = useState('');

    const { isOpen, onOpen, onClose } = useDisclosure();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await api.getProjects();
            setProjects(data);
        } catch (error: any) {
            console.error('Failed to load projects:', error);
        }
    };

    const handleCreateProject = async () => {
        if (!projectName.trim() || !presentationGoal.trim()) {
            toast.warning('Пожалуйста, укажите название и цель презентации');
            return;
        }

        try {
            const project = await api.createProject({
                name: projectName,
                presentationGoal,
                targetAudience,
                presentationContext,
                description: presentationGoal // Для обратной совместимости
            });

            setProjects([...projects, project]);

            // Reset form
            setProjectName('');
            setPresentationGoal('');
            setTargetAudience('');
            setPresentationContext('');

            onClose();
            navigate(`/project/${project.id}`);
        } catch (error: any) {
            toast.error(`Ошибка: ${error.message}`);
        }
    };

    const audienceOptions = [
        { key: 'executives', label: '👔 Руководители (C-level)' },
        { key: 'technical', label: '💻 Технические специалисты' },
        { key: 'business', label: '💼 Бизнес-аудитория' },
        { key: 'investors', label: '💰 Инвесторы' },
        { key: 'general', label: '👥 Широкая аудитория' },
        { key: 'mixed', label: '🎭 Смешанная аудитория' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
            <div className="container mx-auto p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">
                            🎯 Presentation Agent
                        </h1>
                        <p className="text-gray-600">
                            AI-powered presentation generation from your documents
                        </p>
                    </div>
                    <Button
                        color="default"
                        size="lg"
                        onPress={onOpen}
                        className="shadow-lg"
                    >
                        ➕ Новая презентация
                    </Button>
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="text-6xl mb-4">📁</div>
                        <h3 className="text-2xl font-semibold mb-2">Нет проектов</h3>
                        <p className="text-gray-600 mb-6">
                            Создайте свою первую презентацию
                        </p>
                        <Button color="default" onPress={onOpen} size="lg">
                            Создать презентацию
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Card
                                key={project.id}
                                isPressable
                                onPress={() => navigate(`/project/${project.id}`)}
                                className="p-6 hover:shadow-xl transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="text-4xl">📊</div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(project.createdAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <h3 className="text-xl font-semibold mb-2">
                                    {project.name}
                                </h3>

                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {project.presentationGoal || project.description || 'Нет описания'}
                                </p>

                                {project.targetAudience && (
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                            {audienceOptions.find(o => o.value === project.targetAudience)?.label || project.targetAudience}
                                        </span>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create Project Modal */}
                <Modal
                    isOpen={isOpen}
                    onClose={onClose}
                    size="2xl"
                    scrollBehavior="inside"
                >
                    <ModalContent>
                        <ModalHeader>
                            <div>
                                <h3 className="text-2xl font-bold">Новая презентация</h3>
                                <p className="text-sm text-gray-600 font-normal mt-1">
                                    Расскажите о презентации, чтобы AI лучше понял задачу
                                </p>
                            </div>
                        </ModalHeader>
                        <ModalBody>
                            <div className="space-y-4">
                                {/* Project Name */}
                                <Input
                                    label="Название проекта"
                                    placeholder="Квартальный отчет Q4 2024"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    isRequired
                                    size="lg"
                                />

                                {/* Presentation Goal - ГЛАВНОЕ ПОЛЕ */}
                                <Textarea
                                    label="О чем презентация?"
                                    placeholder="Опишите в 1-2 предложениях цель и суть презентации. Например: 'Презентация для инвесторов о результатах работы за квартал и планах на следующий год. Нужно показать рост выручки и новые направления.'"
                                    value={presentationGoal}
                                    onChange={(e) => setPresentationGoal(e.target.value)}
                                    minRows={3}
                                    isRequired
                                    description="Это поможет AI создать правильную структуру и подобрать нужный контент"
                                    size="lg"
                                />

                                {/* Target Audience */}
                                <Select
                                    label="Целевая аудитория"
                                >
                                    {audienceOptions.map((option) => (
                                        <SelectItem key={option.key}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </Select>

                                {/* Context (optional) */}
                                <Input
                                    label="Контекст / Повод (опционально)"
                                    placeholder="Совет директоров, конференция, weekly meeting..."
                                    value={presentationContext}
                                    onChange={(e) => setPresentationContext(e.target.value)}
                                    description="Где и когда будет презентация"
                                />

                                {/* Info Box */}
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex gap-3">
                                        <div className="text-2xl">💡</div>
                                        <div>
                                            <p className="font-semibold text-green-800 mb-1">
                                                Почему это важно?
                                            </p>
                                            <p className="text-sm text-green-700">
                                                Один и тот же документ может стать основой для разных презентаций.
                                                Описание поможет AI правильно выбрать информацию и структуру.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={onClose}>
                                Отмена
                            </Button>
                            <Button
                                color="default"
                                onPress={handleCreateProject}
                                isDisabled={!projectName.trim() || !presentationGoal.trim()}
                                size="lg"
                            >
                                Создать и загрузить документы
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </div>
        </div>
    );
}