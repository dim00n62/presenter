// frontend/src/components/stages/ContentStage.tsx

import { useState } from 'react';
import { StagePanel } from '../StagePanel';
import { Button, Card, Chip, Progress } from '@heroui/react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

interface ContentStageProps {
  projectId: string;
  blueprint: any;
  slideContents: any[];
  onContentGenerated: (contents: any[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ContentStage({
  projectId,
  blueprint,
  slideContents,
  onContentGenerated,
  onPrev,
  onNext,
}: ContentStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState('');

  const generateContent = async () => {
    setIsGenerating(true);
    try {
      // Start generation
      await api.generateContent(projectId);

      // Monitor progress
      const eventSource = new EventSource(`/api/generation/${projectId}/progress`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        setProgress(data.progress || 0);
        setCurrentSlide(data.currentSlide || '');

        if (data.status === 'complete') {
          eventSource.close();
          setIsGenerating(false);
          loadContent();
        } else if (data.status === 'failed') {
          eventSource.close();
          setIsGenerating(false);
          toast.error('Ошибка генерации: ' + data.error);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsGenerating(false);
      };

    } catch (error: any) {
      setIsGenerating(false);
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  const loadContent = async () => {
    try {
      const contents = await api.getContent(projectId);
      onContentGenerated(contents);
    } catch (error) {
      console.error('Failed to load contents:', error);
    }
  };

  const hasContent = slideContents.length > 0;

  return (
    <StagePanel
      title="Генерация контента"
      icon="✍️"
      description="AI создаст текст, графики и визуализации для каждого слайда"
      canGoPrev={true}
      canGoNext={hasContent}
      onPrev={onPrev}
      onNext={onNext}
      nextLabel="Добавить заметки"
      nextIcon="🎤"
      status={isGenerating ? 'loading' : hasContent ? 'success' : 'idle'}
    >
      <div className="space-y-6">
        {/* Start Generation */}
        {!hasContent && !isGenerating && (
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🎨</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  Создать контент для {blueprint?.slides?.length || 0} слайдов
                </h3>
                <p className="text-sm text-purple-700 mb-4">
                  AI создаст для каждого слайда:
                </p>
                <ul className="text-sm text-purple-700 space-y-1 mb-4">
                  <li>• Заголовки и подзаголовки</li>
                  <li>• Основной текст с ключевыми пунктами</li>
                  <li>• Данные для графиков и таблиц</li>
                  <li>• Визуальные подсказки</li>
                </ul>
                <Button
                  color="default"
                  size="lg"
                  onPress={generateContent}
                  className="shadow-md"
                >
                  🚀 Создать контент
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Создание контента...</h3>
                <Chip color="primary" variant="flat">
                  {Math.round(progress)}%
                </Chip>
              </div>

              <Progress
                value={progress}
                color="primary"
              />

              {currentSlide && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-pulse">✍️</div>
                  <span>Генерация: {currentSlide}</span>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  ⏱️ Это может занять несколько минут в зависимости от количества слайдов
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Generated Content Preview */}
        {hasContent && (
          <div className="space-y-4">
            <Card className="p-4 bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✅</div>
                <div>
                  <p className="font-semibold text-green-800">Контент создан</p>
                  <p className="text-sm text-green-700">
                    {slideContents.length} слайдов готовы
                  </p>
                </div>
              </div>
            </Card>

            {/* Slides Preview */}
            <div className="space-y-3">
              {slideContents.map((content: any, index: number) => (
                <Card key={content.slideId} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">
                        {content.content.title}
                      </h4>
                      {content.content.subtitle && (
                        <p className="text-sm text-gray-600 mb-2">
                          {content.content.subtitle}
                        </p>
                      )}

                      {/* Body preview */}
                      {content.content.body && (
                        <div className="text-sm text-gray-700 mt-2">
                          {typeof content.content.body === 'string' ? (
                            <p className="line-clamp-2">{content.content.body}</p>
                          ) : (
                            <div className="bg-gray-50 p-2 rounded">
                              <pre className="text-xs overflow-hidden">
                                {JSON.stringify(content.content.body, null, 2).slice(0, 200)}...
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>📊 Источников: {content.metadata.dataSources?.length || 0}</span>
                        <span>⭐ Уверенность: {content.metadata.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Re-generate */}
            <div className="flex justify-center">
              <Button
                variant="light"
                size="sm"
                onPress={generateContent}
                startContent={<span>🔄</span>}
              >
                Перегенерировать контент
              </Button>
            </div>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
