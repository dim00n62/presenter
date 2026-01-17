// frontend/src/components/stages/ExportStage.tsx

import { useState } from 'react';
import { StagePanel } from '../StagePanel';
import { Button, Card, RadioGroup, Radio, Select, SelectItem } from '@heroui/react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

interface ExportStageProps {
  projectId: string;
  blueprint: any;
  slideContents: any[];
  speakerNotes: any[];
  onPrev: () => void;
}

export function ExportStage({
  projectId,
  blueprint,
  slideContents,
  speakerNotes,
  onPrev,
}: ExportStageProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [theme, setTheme] = useState('sber');
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true);
  const [exportedFile, setExportedFile] = useState<string | null>(null);

  const exportPPTX = async () => {
    setIsExporting(true);
    try {
      const result = await api.exportPPTX(projectId, {
        theme,
        includeSpeakerNotes,
        blueprintId: blueprint.id,
      });

      setExportedFile(result.downloadUrl);
    } catch (error: any) {
      toast.error(`Ошибка экспорта: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = () => {
    if (exportedFile) {
      window.open(exportedFile, '_blank');
    }
  };

  return (
    <StagePanel
      title="Экспорт презентации"
      icon="💾"
      description="Скачайте готовую PowerPoint презентацию"
      canGoPrev={true}
      onPrev={onPrev}
      status={isExporting ? 'loading' : exportedFile ? 'success' : 'idle'}
    >
      <div className="space-y-6">
        {/* Export Options */}
        {!exportedFile && (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <div className="text-5xl">📊</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Готово к экспорту
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {slideContents.length}
                      </p>
                      <p className="text-xs text-gray-600">слайдов</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {speakerNotes.length}
                      </p>
                      <p className="text-xs text-gray-600">заметок</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {blueprint?.slides?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">структура</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Theme Selection */}
            <div>
              <h4 className="font-semibold mb-3">Выберите тему</h4>
              <RadioGroup value={theme} onValueChange={setTheme}>
                <div className="grid grid-cols-2 gap-3">
                  <Card className={`p-4 cursor-pointer ${theme === 'sber' ? 'ring-2 ring-green-500' : ''}`}>
                    <Radio value="sber">
                      <div>
                        <p className="font-semibold">Sber Corporate</p>
                        <p className="text-xs text-gray-600">Зеленый градиент, корпоративный стиль</p>
                      </div>
                    </Radio>
                  </Card>

                  <Card className={`p-4 cursor-pointer ${theme === 'modern' ? 'ring-2 ring-green-500' : ''}`}>
                    <Radio value="modern">
                      <div>
                        <p className="font-semibold">Modern Minimal</p>
                        <p className="text-xs text-gray-600">Минималистичный дизайн</p>
                      </div>
                    </Radio>
                  </Card>

                  <Card className={`p-4 cursor-pointer ${theme === 'professional' ? 'ring-2 ring-green-500' : ''}`}>
                    <Radio value="professional">
                      <div>
                        <p className="font-semibold">Professional</p>
                        <p className="text-xs text-gray-600">Классический бизнес-стиль</p>
                      </div>
                    </Radio>
                  </Card>

                  <Card className={`p-4 cursor-pointer ${theme === 'creative' ? 'ring-2 ring-green-500' : ''}`}>
                    <Radio value="creative">
                      <div>
                        <p className="font-semibold">Creative</p>
                        <p className="text-xs text-gray-600">Яркий креативный дизайн</p>
                      </div>
                    </Radio>
                  </Card>
                </div>
              </RadioGroup>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <h4 className="font-semibold">Дополнительные опции</h4>

              <Card className="p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSpeakerNotes}
                    onChange={(e) => setIncludeSpeakerNotes(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="font-medium">Включить заметки докладчика</p>
                    <p className="text-xs text-gray-600">
                      Добавить текст выступления в заметки к слайдам
                    </p>
                  </div>
                </label>
              </Card>
            </div>

            {/* Export Button */}
            <div className="flex justify-center pt-4">
              <Button
                color="success"
                size="lg"
                onPress={exportPPTX}
                isLoading={isExporting}
                startContent={!isExporting && <span>💾</span>}
                className="shadow-lg px-12"
              >
                {isExporting ? 'Создание презентации...' : 'Экспортировать PPTX'}
              </Button>
            </div>
          </div>
        )}

        {/* Export Success */}
        {exportedFile && (
          <div className="space-y-4">
            <Card className="p-6 bg-green-50 border-2 border-green-300">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  Презентация готова!
                </h3>
                <p className="text-green-700 mb-6">
                  Ваша PowerPoint презентация успешно создана
                </p>

                <div className="flex gap-3 justify-center">
                  <Button
                    color="success"
                    size="lg"
                    onPress={downloadFile}
                    startContent={<span>⬇️</span>}
                    className="shadow-md"
                  >
                    Скачать PPTX
                  </Button>

                  <Button
                    variant="light"
                    size="lg"
                    onPress={() => setExportedFile(null)}
                    startContent={<span>🔄</span>}
                  >
                    Экспортировать заново
                  </Button>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl mb-1">📊</p>
                <p className="font-semibold text-gray-800">{slideContents.length}</p>
                <p className="text-xs text-gray-600">слайдов</p>
              </Card>

              <Card className="p-4 text-center">
                <p className="text-3xl mb-1">🎨</p>
                <p className="font-semibold text-gray-800">{theme}</p>
                <p className="text-xs text-gray-600">тема</p>
              </Card>

              <Card className="p-4 text-center">
                <p className="text-3xl mb-1">🎤</p>
                <p className="font-semibold text-gray-800">
                  {includeSpeakerNotes ? 'Да' : 'Нет'}
                </p>
                <p className="text-xs text-gray-600">заметки</p>
              </Card>
            </div>

            {/* Next Steps */}
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-1">
                    Что дальше?
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Откройте презентацию в PowerPoint</li>
                    <li>• Проверьте и отредактируйте слайды</li>
                    <li>• Добавьте свои правки и изображения</li>
                    <li>• Подготовьтесь к выступлению!</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
