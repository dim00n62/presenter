// frontend/src/components/AutoAnalysisProgress.tsx

import { useEffect, useState } from 'react';
import { Card, Progress, Button } from '@heroui/react';

interface ProgressState {
    status: 'parsing' | 'analyzing' | 'generating_preview' | 'complete' | 'error' | 'connected';
    message: string;
    progress: number;
    result?: any;
    error?: string;
}

interface AutoAnalysisProgressProps {
    projectId: string;
    onComplete: (result: any) => void;
}

export function AutoAnalysisProgress({ projectId, onComplete }: AutoAnalysisProgressProps) {
    const [progress, setProgress] = useState<ProgressState>({
        status: 'parsing',
        message: 'Подключение...',
        progress: 0
    });

    const [connectionError, setConnectionError] = useState(false);

    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const eventSource = new EventSource(`${apiUrl}/api/analysis/progress/${projectId}`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📊 Progress update:', data);

                setProgress(data);
                setConnectionError(false);

                if (data.status === 'complete') {
                    setTimeout(() => {
                        onComplete(data.result);
                        eventSource.close();
                    }, 1000);
                }

                if (data.status === 'error') {
                    setConnectionError(true);
                    setTimeout(() => {
                        eventSource.close();
                    }, 3000);
                }
            } catch (err) {
                console.error('Failed to parse SSE data:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            setConnectionError(true);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [projectId]);

    const getStatusIcon = () => {
        switch (progress.status) {
            case 'connected': return '🔌';
            case 'parsing': return '📄';
            case 'analyzing': return '🔍';
            case 'generating_preview': return '🎨';
            case 'complete': return '✅';
            case 'error': return '❌';
            default: return '⏳';
        }
    };

    const getStatusColor = () => {
        switch (progress.status) {
            case 'complete': return 'success';
            case 'error': return 'danger';
            default: return 'primary';
        }
    };

    const getStatusTitle = () => {
        switch (progress.status) {
            case 'connected': return 'Подключено, начинаем анализ';
            case 'parsing': return 'Обработка документа';
            case 'analyzing': return 'Анализ содержимого';
            case 'generating_preview': return 'Создание структуры';
            case 'complete': return 'Готово!';
            case 'error': return 'Ошибка';
            default: return 'В процессе...';
        }
    };

    if (connectionError) {
        return (
            <Card className="p-8">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold mb-2 text-orange-600">
                        Проблема с подключением
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {progress.error || 'Не удалось подключиться к серверу анализа'}
                    </p>
                    <Button
                        color="default"
                        onPress={() => window.location.reload()}
                    >
                        Перезагрузить страницу
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-8">
            <div className="text-center max-w-2xl mx-auto">
                {/* Icon */}
                <div className="text-8xl mb-6 animate-pulse">
                    {getStatusIcon()}
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold mb-2">
                    {getStatusTitle()}
                </h2>

                {/* Message */}
                <p className="text-lg text-gray-600 mb-6">
                    {progress.message}
                </p>

                {/* Progress Bar */}
                <Progress
                    value={progress.progress}
                    color={getStatusColor()}
                    size="lg"
                    className="mb-4"
                    showValueLabel
                />

                {/* Status Details */}
                {progress.status !== 'error' && progress.status !== 'complete' && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Что происходит?</h4>
                        <div className="space-y-2 text-left">
                            <div className="flex items-center gap-2">
                                <span className={progress.progress >= 30 ? 'text-green-600' : 'text-gray-400'}>
                                    {progress.progress >= 30 ? '✅' : '⏳'}
                                </span>
                                <span className={progress.progress >= 30 ? 'font-semibold' : 'text-gray-600'}>
                                    Документ обработан и разбит на части
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={progress.progress >= 70 ? 'text-green-600' : 'text-gray-400'}>
                                    {progress.progress >= 70 ? '✅' : '⏳'}
                                </span>
                                <span className={progress.progress >= 70 ? 'font-semibold' : 'text-gray-600'}>
                                    AI анализирует содержимое и темы
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={progress.progress >= 100 ? 'text-green-600' : 'text-gray-400'}>
                                    {progress.progress >= 100 ? '✅' : '⏳'}
                                </span>
                                <span className={progress.progress >= 100 ? 'font-semibold' : 'text-gray-600'}>
                                    Создается предварительная структура
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Details */}
                {progress.error && (
                    <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-700 font-medium mb-2">Детали ошибки:</p>
                        <p className="text-red-600 text-sm">{progress.error}</p>
                    </div>
                )}

                {/* Success Message */}
                {progress.status === 'complete' && (
                    <div className="mt-6 p-6 bg-green-50 rounded-lg border-2 border-green-200">
                        <p className="text-green-800 font-semibold text-lg mb-2">
                            🎉 Структура презентации готова!
                        </p>
                        <p className="text-green-700 text-sm">
                            Переходим к редактированию...
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
