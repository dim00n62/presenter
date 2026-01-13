// frontend/src/components/stages/SpeakerNotesStage.tsx

import { useState } from 'react';
import { StagePanel } from '../StagePanel';
import { Button, Card, Chip, Textarea } from '@heroui/react';
import { api } from '../../lib/api';

interface SpeakerNotesStageProps {
  projectId: string;
  slideContents: any[];
  speakerNotes: any[];
  onNotesGenerated: (notes: any[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function SpeakerNotesStage({
  projectId,
  slideContents,
  speakerNotes,
  onNotesGenerated,
  onPrev,
  onNext,
}: SpeakerNotesStageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [localNotes, setLocalNotes] = useState(speakerNotes);

  const generateNotes = async () => {
    setIsGenerating(true);
    try {
      const slideIds = slideContents.map(s => s.slideId);
      const notes = await api.generateSpeakerNotes(projectId, slideIds);
      setLocalNotes(notes);
      onNotesGenerated(notes);
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateNote = (slideId: string, field: string, value: string) => {
    setLocalNotes(localNotes.map((note: any) =>
      note.slideId === slideId
        ? { ...note, speakerNotes: { ...note.speakerNotes, [field]: value } }
        : note
    ));
  };

  const saveNotes = async () => {
    try {
      await api.saveSpeakerNotes(projectId, localNotes);
      alert('Заметки сохранены!');
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  const hasNotes = localNotes.length > 0;

  return (
    <StagePanel
      title="Заметки докладчика"
      icon="🎤"
      description="Подготовьте текст выступления для каждого слайда"
      canGoPrev={true}
      canGoNext={true}
      onPrev={onPrev}
      onNext={onNext}
      nextLabel="Экспорт PPTX"
      nextIcon="💾"
      status={isGenerating ? 'loading' : hasNotes ? 'success' : 'idle'}
    >
      <div className="space-y-6">
        {/* Generate Notes */}
        {!hasNotes && !isGenerating && (
          <Card className="p-6 bg-gradient-to-br from-pink-50 to-orange-50 border-2 border-pink-200">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🎙️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-pink-900 mb-2">
                  Создать заметки для выступления
                </h3>
                <p className="text-sm text-pink-700 mb-4">
                  AI создаст для каждого слайда:
                </p>
                <ul className="text-sm text-pink-700 space-y-1 mb-4">
                  <li>• Вступительные слова</li>
                  <li>• Ключевые пункты для озвучивания</li>
                  <li>• Переходы между слайдами</li>
                  <li>• Акценты и важные моменты</li>
                </ul>
                <div className="flex gap-3">
                  <Button
                    color="default"
                    size="lg"
                    onPress={generateNotes}
                    className="shadow-md"
                  >
                    🚀 Создать заметки
                  </Button>
                  <Button
                    variant="light"
                    size="lg"
                    onPress={onNext}
                  >
                    Пропустить →
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Notes Editor */}
        {hasNotes && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Заметки ({localNotes.length} слайдов)
                </h3>
                <p className="text-sm text-gray-600">
                  Редактируйте текст выступления
                </p>
              </div>
              <Button
                color="success"
                onPress={saveNotes}
                startContent={<span>💾</span>}
              >
                Сохранить
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-4">
              {localNotes.map((note: any, index: number) => {
                const slideContent = slideContents.find(s => s.slideId === note.slideId);
                
                return (
                  <Card key={note.slideId} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-700">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {slideContent?.content.title || `Слайд ${index + 1}`}
                          </h4>
                        </div>

                        {/* Intro */}
                        {note.speakerNotes.intro && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Вступление
                            </label>
                            <Textarea
                              value={note.speakerNotes.intro}
                              onChange={(e) => updateNote(note.slideId, 'intro', e.target.value)}
                              minRows={2}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {/* Body */}
                        {note.speakerNotes.body && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Основной текст
                            </label>
                            <Textarea
                              value={note.speakerNotes.body}
                              onChange={(e) => updateNote(note.slideId, 'body', e.target.value)}
                              minRows={4}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {/* Key Points */}
                        {note.speakerNotes.keyPoints && note.speakerNotes.keyPoints.length > 0 && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Ключевые пункты
                            </label>
                            <ul className="text-sm space-y-1 bg-gray-50 p-3 rounded">
                              {note.speakerNotes.keyPoints.map((point: string, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-orange-600">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Transition */}
                        {note.speakerNotes.transition && (
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              Переход к следующему слайду
                            </label>
                            <Textarea
                              value={note.speakerNotes.transition}
                              onChange={(e) => updateNote(note.slideId, 'transition', e.target.value)}
                              minRows={1}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Re-generate */}
            <div className="flex justify-center gap-3">
              <Button
                variant="light"
                size="sm"
                onPress={generateNotes}
                startContent={<span>🔄</span>}
              >
                Перегенерировать заметки
              </Button>
            </div>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
