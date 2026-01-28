// frontend/src/components/stages/ProjectSetupStage.tsx

import { useState } from 'react';
import { Button, Card, CardBody, Switch } from '@heroui/react';
import { api } from '../../lib/api';

interface ProjectSetupStageProps {
    projectId: string;
    project: any;
}

export function ProjectSetupStage({ project }: ProjectSetupStageProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [includeCharts, setIncludeCharts] = useState(true);
    const [theme, setTheme] = useState<'SBER_MAIN' | 'SBER_DARK'>('SBER_MAIN');

    const handleGenerateTestPresentation = async () => {
        try {
            setIsGenerating(true);

            console.log('🎨 Generating test presentation...');

            await api.createTestPresentation({
                theme,
                includeCharts,
            });
        } catch (error: any) {
            console.error('❌ Test presentation generation failed:', error);
            alert(`Ошибка при создании презентации: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    ⚙️ Настройки проекта
                </h2>
                <p className="text-gray-600">
                    Проект <strong>{project.name}</strong> готов к работе
                </p>
                {project.presentationGoal && (
                    <p className="text-sm text-gray-500 mt-2">
                        🎯 Цель: {project.presentationGoal}
                    </p>
                )}
            </div>

            {/* Project Info Card */}
            <Card>
                <CardBody className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        📋 Информация о проекте
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Название:</span>
                            <span className="font-medium text-gray-800">{project.name}</span>
                        </div>

                        {project.targetAudience && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Аудитория:</span>
                                <span className="font-medium text-gray-800">{project.targetAudience}</span>
                            </div>
                        )}

                        {project.presentationContext && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Контекст:</span>
                                <span className="font-medium text-gray-800">{project.presentationContext}</span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="text-gray-600">Статус:</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                                {project.status}
                            </span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Design Playground Card */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardBody className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="text-4xl">🎨</div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                Design Playground
                            </h3>
                            <p className="text-sm text-gray-600">
                                Протестируйте дизайн презентации без загрузки документов.
                                Создается демо-презентация со всеми типами слайдов и примерами данных.
                            </p>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-4 mb-6 bg-white/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-700">Включить графики</p>
                                <p className="text-sm text-gray-500">Добавить слайды с диаграммами</p>
                            </div>
                            <Switch
                                isSelected={includeCharts}
                                onValueChange={setIncludeCharts}
                                color="success"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-700">Тема оформления</p>
                                <p className="text-sm text-gray-500">Стиль презентации Сбербанк</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    color='default'
                                    variant={theme === 'SBER_MAIN' ? 'solid' : 'bordered'}
                                    onPress={() => setTheme('SBER_MAIN')}
                                >
                                    Основная
                                </Button>
                                <Button
                                    size="sm"
                                    color='default'
                                    variant={theme === 'SBER_DARK' ? 'solid' : 'bordered'}
                                    onPress={() => setTheme('SBER_DARK')}
                                >
                                    Тёмная
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                        color="default"
                        size="lg"
                        className="w-full"
                        onPress={handleGenerateTestPresentation}
                        isLoading={isGenerating}
                        isDisabled={isGenerating}
                        startContent={!isGenerating && <span>🚀</span>}
                    >
                        {isGenerating ? 'Создаём презентацию...' : 'Создать тестовую презентацию'}
                    </Button>

                    {/* Info */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                            💡 <strong>Совет:</strong> Используйте playground для проверки дизайна
                            и настройки визуального стиля перед загрузкой реальных документов.
                        </p>
                    </div>
                </CardBody>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardBody className="text-center p-4">
                        <div className="text-3xl mb-2">📄</div>
                        <div className="text-2xl font-bold text-gray-800">0</div>
                        <div className="text-sm text-gray-600">Документов</div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="text-center p-4">
                        <div className="text-3xl mb-2">🎯</div>
                        <div className="text-2xl font-bold text-gray-800">
                            {project.presentationGoal ? '✓' : '—'}
                        </div>
                        <div className="text-sm text-gray-600">Цель задана</div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="text-center p-4">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-2xl font-bold text-gray-800">
                            {project.targetAudience ? '✓' : '—'}
                        </div>
                        <div className="text-sm text-gray-600">Аудитория</div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
