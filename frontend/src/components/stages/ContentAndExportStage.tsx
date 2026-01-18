// frontend/src/components/stages/ContentAndExportStage.tsx

import { useEffect, useState } from 'react';
import { StagePanel } from '../StagePanel';
import { Button, Card, Progress, RadioGroup, Radio } from '@heroui/react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

interface ContentAndExportStageProps {
  projectId: string;
  blueprint: any;
  onPrev: () => void;
}

export function ContentAndExportStage({
  projectId,
  blueprint,
  onPrev,
}: ContentAndExportStageProps) {
  // Content generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentSlide] = useState('');
  const [slideContents, setSlideContents] = useState<any[]>([]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [theme, setTheme] = useState('SBER_MAIN');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const contents = await api.getSlideContents(projectId);
      setSlideContents(contents || []);
    } catch (error) {
      console.error('Failed to load contents:', error);
    }
  };

  const generateContent = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      toast.info('Генерируем контент для слайдов...');

      const response = await api.generateContent(projectId);

      if (response.success) {
        toast.success(`Контент сгенерирован для ${response.contentCount} слайдов`);
        await loadContent();
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error: any) {
      toast.error(`Ошибка генерации: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const exportPPTX = async () => {
    setIsExporting(true);

    try {
      toast.info('Создаём PPTX файл...');

      // Generate and download PPTX
      await api.exportPPTX(projectId);

      toast.success('Презентация скачана!');
    } catch (error: any) {
      toast.error(`Ошибка экспорта: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const hasContent = slideContents.length > 0;
  const totalSlides = blueprint?.slides?.length || 0;

  return (
    <StagePanel
      title="Контент и экспорт"
      icon="📝"
      description="Сгенерируйте контент и скачайте презентацию"
      canGoPrev={true}
      onPrev={onPrev}
      status={isGenerating || isExporting ? 'loading' : hasContent ? 'success' : 'idle'}
    >
      <div className="space-y-6">

        {/* Step 1: Content Generation */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="text-5xl">
              {hasContent ? '✅' : '📝'}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Шаг 1: Генерация контента
              </h3>

              {!hasContent && (
                <p className="text-sm text-blue-700 mb-4">
                  AI создаст детальный контент для каждого из {totalSlides} слайдов на основе ваших документов
                </p>
              )}

              {hasContent && (
                <div className="mb-4 p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Статус</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      ✓ Готово
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-2xl font-bold text-blue-700">{slideContents.length}</p>
                      <p className="text-xs text-gray-600">слайдов с контентом</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-2xl font-bold text-blue-700">{totalSlides}</p>
                      <p className="text-xs text-gray-600">всего слайдов</p>
                    </div>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="mb-4 space-y-2">
                  <Progress
                    value={generationProgress}
                    className="max-w-md"
                    color="primary"
                  />
                  {currentSlide && (
                    <p className="text-sm text-blue-600">
                      Генерируем: {currentSlide}
                    </p>
                  )}
                </div>
              )}

              <Button
                color="primary"
                size="lg"
                onPress={generateContent}
                isDisabled={isGenerating || !blueprint}
                isLoading={isGenerating}
                className="w-full sm:w-auto"
              >
                {hasContent ? '🔄 Перегенерировать контент' : '✨ Сгенерировать контент'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Step 2: Export PPTX */}
        {hasContent && (
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex items-start gap-4">
              <div className="text-5xl">💾</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-900 mb-2">
                  Шаг 2: Скачать презентацию
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  Готовая PowerPoint презентация с вашим контентом
                </p>

                {/* Theme Selection */}
                <div className="mb-4 bg-white p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-800">Выберите тему оформления</h4>
                  <RadioGroup value={theme} onValueChange={setTheme}>
                    <div className="grid grid-cols-2 gap-3">
                      <Radio value="SBER_MAIN" className="bg-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500 to-green-600"></div>
                          <div>
                            <p className="font-medium">Основная</p>
                            <p className="text-xs text-gray-500">Зелёная тема Сбер</p>
                          </div>
                        </div>
                      </Radio>
                      <Radio value="SBER_DARK" className="bg-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-700 to-gray-900"></div>
                          <div>
                            <p className="font-medium">Тёмная</p>
                            <p className="text-xs text-gray-500">Премиум вид</p>
                          </div>
                        </div>
                      </Radio>
                    </div>
                  </RadioGroup>
                </div>

                {/* Export Stats */}
                <div className="mb-4 p-4 bg-white rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-800">Что будет в презентации</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">{slideContents.length}</p>
                      <p className="text-xs text-gray-600">Слайдов</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">{theme === 'SBER_MAIN' ? '🟢' : '⚫'}</p>
                      <p className="text-xs text-gray-600">Тема</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">📊</p>
                      <p className="text-xs text-gray-600">Графики</p>
                    </div>
                  </div>
                </div>

                <Button
                  color="success"
                  size="lg"
                  onPress={exportPPTX}
                  isDisabled={isExporting}
                  isLoading={isExporting}
                  className="w-full"
                  startContent={!isExporting && <span>⬇️</span>}
                >
                  {isExporting ? 'Создаём презентацию...' : 'Скачать PowerPoint'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Help Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <strong>Совет:</strong> Вы можете перегенерировать контент если результат не устраивает.
            Презентация будет создана автоматически с выбранной темой оформления.
          </p>
        </div>
      </div>
    </StagePanel>
  );
}