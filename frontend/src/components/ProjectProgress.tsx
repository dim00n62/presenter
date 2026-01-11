// frontend/src/components/ProjectProgress.tsx
import { Card, Progress } from '@heroui/react';

interface Props {
    projectId: string;
    hasDocuments: boolean;
    hasAnalysis: boolean;
    hasBlueprint: boolean;
    blueprintApproved: boolean;
    hasGeneration: boolean;
}

export function ProjectProgress({
    hasDocuments,
    hasAnalysis,
    hasBlueprint,
    blueprintApproved,
    hasGeneration
}: Props) {
    const steps = [
        { name: 'Загрузка документов', status: hasDocuments, icon: '📁' },
        { name: 'Анализ данных', status: hasAnalysis, icon: '🔍' },
        { name: 'Создание структуры', status: hasBlueprint, icon: '📐' },
        { name: 'Утверждение', status: blueprintApproved, icon: '✅' },
        { name: 'Генерация контента', status: hasGeneration, icon: '✨' },
    ];

    const completedSteps = steps.filter(s => s.status).length;
    const progress = (completedSteps / steps.length) * 100;

    return (
        <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Прогресс проекта</h3>
                <span className="text-sm text-gray-600">{completedSteps} / {steps.length}</span>
            </div>

            <Progress value={progress} color="success" className="mb-4" />

            <div className="flex justify-between">
                {steps.map((step, idx) => (
                    <div
                        key={idx}
                        className={`flex flex-col items-center ${step.status ? 'text-green-600' : 'text-gray-400'
                            }`}
                    >
                        <div className={`text-2xl mb-1 ${step.status ? 'scale-110' : 'opacity-50'
                            } transition-all`}>
                            {step.icon}
                        </div>
                        <span className="text-xs text-center max-w-[60px]">{step.name}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}