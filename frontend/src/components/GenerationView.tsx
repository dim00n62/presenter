// frontend/src/components/GenerationView.tsx

import { useState, useEffect } from 'react';
import { Card, Button, Progress } from '@heroui/react';
import { api } from '../lib/api';
import { toast } from 'sonner';

export function GenerationView({ projectId }: { projectId: string }) {
    const [generating, setGenerating] = useState(false);
    const [generation, setGeneration] = useState<any>(null);
    const [slideContents, setSlideContents] = useState<any[]>([]);

    useEffect(() => {
        loadGeneration();
    }, [projectId]);

    const loadGeneration = async () => {
        try {
            const result = await api.getGeneration(projectId);
            if (result) {
                setGeneration(result);
                setSlideContents(result.slideContents || []);
            }
        } catch (err) {
            // No generation yet
            console.log('No generation found yet');
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const result = await api.generateContent(projectId);
            setSlideContents(result.slideContents || []);
            toast.success('✅ Контент сгенерирован!');
            loadGeneration();
        } catch (error: any) {
            toast.error(`Ошибка: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleExport = async () => {
        try {
            await api.exportPPTX(projectId);
        } catch (error: any) {
            toast.error(`Ошибка экспорта: ${error.message}`);
        }
    };

    if (generating) {
        return (
            <Card className="p-8 text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-2">Генерация контента...</h3>
                <p className="text-gray-600 mb-4">
                    AI создает содержимое для каждого слайда. Это займет 2-3 минуты.
                </p>
                <Progress isIndeterminate color="primary" className="max-w-md mx-auto" />
            </Card>
        );
    }

    if (slideContents.length === 0) {
        return (
            <Card className="p-8 text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold mb-4">Готово к генерации</h3>
                <p className="text-gray-600 mb-6">
                    AI создаст содержимое для каждого слайда на основе ваших документов
                </p>
                <Button color="default" size="lg" onPress={handleGenerate}>
                    Сгенерировать контент
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold">
                        Контент готов ({slideContents.length} слайдов)
                    </h3>
                    <p className="text-sm text-gray-600">
                        Все слайды заполнены содержимым
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button color="success" onPress={handleExport}>
                        📥 Скачать PPTX
                    </Button>
                    <Button color="default" variant="light" onPress={handleGenerate}>
                        🔄 Перегенерировать
                    </Button>
                </div>
            </div>

            {/* Slides Preview */}
            <div className="grid gap-4">
                {slideContents.map((slide, index) => (
                    <Card key={slide.slideId} className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="text-2xl font-bold text-gray-400 min-w-[40px]">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold mb-2">
                                    {slide.content?.title || 'Untitled'}
                                </h4>
                                {slide.content?.body?.bullets && (
                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                        {slide.content.body.bullets.slice(0, 3).map((bullet: any, i: number) => (
                                            <li key={i}>
                                                {typeof bullet === 'string' ? bullet : bullet.main}
                                            </li>
                                        ))}
                                        {slide.content.body.bullets.length > 3 && (
                                            <li className="text-gray-400">
                                                ... и еще {slide.content.body.bullets.length - 3}
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}