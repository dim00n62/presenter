// frontend/src/components/stages/BlueprintStage.tsx

import { useState, useEffect } from 'react';
import { StagePanel } from '../StagePanel';
import { Button, Card, Chip, Input, Textarea, Select, SelectItem } from '@heroui/react';
import { api } from '../../lib/api';

interface BlueprintStageProps {
  projectId: string;
  analysis: any;
  blueprint: any;
  onBlueprintApproved: (blueprint: any) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function BlueprintStage({
  projectId,
  analysis,
  blueprint,
  onBlueprintApproved,
  onPrev,
  onNext,
}: BlueprintStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [localBlueprint, setLocalBlueprint] = useState(blueprint);
  const [editingSlide, setEditingSlide] = useState<any>(null);

  useEffect(() => {
    setLocalBlueprint(blueprint);
  }, [blueprint]);

  const generateBlueprint = async () => {
    setIsGenerating(true);
    try {
      const result = await api.generateBlueprint(projectId);
      setLocalBlueprint(result.blueprint);
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const approveBlueprint = async () => {
    try {
      const updated = await api.approveBlueprint(projectId, localBlueprint.id);
      onBlueprintApproved(updated);
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  const updateSlide = (slideId: string, updates: any) => {
    setLocalBlueprint({
      ...localBlueprint,
      slides: localBlueprint.slides.map((s: any) =>
        s.id === slideId ? { ...s, ...updates } : s
      ),
    });
  };

  const deleteSlide = (slideId: string) => {
    setLocalBlueprint({
      ...localBlueprint,
      slides: localBlueprint.slides.filter((s: any) => s.id !== slideId),
    });
  };

  const addSlide = () => {
    const newSlide = {
      id: crypto.randomUUID(),
      order: localBlueprint.slides.length + 1,
      title: 'Новый слайд',
      type: 'content',
      section: 'main',
      description: '',
      dataSources: [],
      visualizationType: 'text',
      contentHints: {
        mainPoints: [],
        suggestedData: '',
        layout: 'title_content',
      },
      priority: 'medium',
      estimatedComplexity: 'simple',
    };
    
    setLocalBlueprint({
      ...localBlueprint,
      slides: [...localBlueprint.slides, newSlide],
    });
  };

  const moveSlide = (slideId: string, direction: 'up' | 'down') => {
    const slides = [...localBlueprint.slides];
    const index = slides.findIndex(s => s.id === slideId);
    
    if (direction === 'up' && index > 0) {
      [slides[index], slides[index - 1]] = [slides[index - 1], slides[index]];
    } else if (direction === 'down' && index < slides.length - 1) {
      [slides[index], slides[index + 1]] = [slides[index + 1], slides[index]];
    }
    
    // Update order
    slides.forEach((s, i) => s.order = i + 1);
    
    setLocalBlueprint({ ...localBlueprint, slides });
  };

  const hasBlueprint = !!localBlueprint;
  const isApproved = localBlueprint?.status === 'approved';

  return (
    <StagePanel
      title="Структура презентации"
      icon="📋"
      description="Определите последовательность и содержание слайдов"
      canGoPrev={true}
      canGoNext={isApproved}
      onPrev={onPrev}
      onNext={onNext}
      nextLabel="Генерировать контент"
      nextIcon="✍️"
      status={isGenerating ? 'loading' : isApproved ? 'success' : 'idle'}
    >
      <div className="space-y-6">
        {/* Generate Blueprint */}
        {!hasBlueprint && !isGenerating && (
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🤖</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Создать структуру с помощью AI
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  На основе анализа AI создаст оптимальную структуру презентации с учетом:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 mb-4">
                  <li>• Типа документов и данных</li>
                  <li>• Целевой аудитории и цели презентации</li>
                  <li>• Лучших практик структурирования</li>
                </ul>
                <Button
                  color="default"
                  size="lg"
                  onPress={generateBlueprint}
                  className="shadow-md"
                >
                  🚀 Создать структуру
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Blueprint Editor */}
        {hasBlueprint && (
          <div className="space-y-4">
            {/* Header with approve button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Презентация ({localBlueprint.slides?.length || 0} слайдов)
                </h3>
                <p className="text-sm text-gray-600">
                  Редактируйте, добавляйте или удаляйте слайды
                </p>
              </div>

              {!isApproved && (
                <Button
                  color="success"
                  size="lg"
                  onPress={approveBlueprint}
                  startContent={<span>✅</span>}
                  className="shadow-md"
                >
                  Утвердить структуру
                </Button>
              )}

              {isApproved && (
                <Chip color="success" variant="flat" size="lg">
                  ✅ Утверждено
                </Chip>
              )}
            </div>

            {/* Slides List */}
            <div className="space-y-3">
              {localBlueprint.slides?.map((slide: any, index: number) => (
                <Card key={slide.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Order number */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                        {index + 1}
                      </div>
                      
                      {/* Move buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveSlide(slide.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSlide(slide.id, 'down')}
                          disabled={index === localBlueprint.slides.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{slide.title}</h4>
                          {slide.description && (
                            <p className="text-sm text-gray-600 mt-1">{slide.description}</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Chip size="sm" variant="flat">
                            {slide.type}
                          </Chip>
                          <Chip size="sm" variant="flat" color={
                            slide.priority === 'critical' ? 'danger' :
                            slide.priority === 'high' ? 'warning' :
                            'default'
                          }>
                            {slide.priority}
                          </Chip>
                        </div>
                      </div>

                      {/* Visualization */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>📊 {slide.visualizationType}</span>
                        <span>📦 {slide.dataSources?.length || 0} источников</span>
                        {slide.contentHints?.mainPoints && (
                          <span>💡 {slide.contentHints.mainPoints.length} пунктов</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => setEditingSlide(slide)}
                        >
                          ✏️ Редактировать
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => deleteSlide(slide.id)}
                        >
                          🗑️ Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Add Slide */}
            <Button
              variant="bordered"
              onPress={addSlide}
              fullWidth
              size="lg"
              startContent={<span>➕</span>}
            >
              Добавить слайд
            </Button>

            {/* Re-generate option */}
            <div className="flex justify-center">
              <Button
                variant="light"
                size="sm"
                onPress={generateBlueprint}
                startContent={<span>🔄</span>}
              >
                Перегенерировать структуру
              </Button>
            </div>
          </div>
        )}

        {/* Edit Slide Modal would go here */}
      </div>
    </StagePanel>
  );
}
