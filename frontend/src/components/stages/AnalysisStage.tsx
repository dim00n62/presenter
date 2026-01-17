// frontend/src/components/stages/AnalysisStage.tsx

import { useState, useEffect } from 'react';
import { StagePanel } from '../StagePanel';
import { Button, Card, Progress, Chip } from '@heroui/react';
import { api } from '../../lib/api';

interface AnalysisStageProps {
  projectId: string;
  documents: any[];
  analysis: any;
  onAnalysisComplete: (analysis: any) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function AnalysisStage({
  projectId,
  documents,
  analysis,
  onAnalysisComplete,
  onPrev,
  onNext,
}: AnalysisStageProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = async () => {
    if (documents.length === 0) {
      setError('Сначала загрузите документы');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(0);

    try {
      // Start analysis
      api.analyze(projectId);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Monitor progress via SSE
      const eventSource = new EventSource(`${apiUrl}/api/analysis/progress/${projectId}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        setProgress(data.progress || 0);
        setCurrentStep(data.step || '');

        if (data.status === 'complete') {
          eventSource.close();
          setIsAnalyzing(false);
          loadAnalysisResult();
        } else if (data.status === 'failed') {
          eventSource.close();
          setIsAnalyzing(false);
          setError(data.error || 'Анализ не удался');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsAnalyzing(false);
        setError('Ошибка соединения');
      };

    } catch (err: any) {
      setIsAnalyzing(false);
      setError(err.message || 'Не удалось запустить анализ');
    }
  };

  const loadAnalysisResult = async () => {
    try {
      const analyses = await api.getAnalyses(projectId);
      if (analyses && analyses.length > 0) {
        onAnalysisComplete(analyses[0]);
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
    }
  };

  const hasAnalysis = !!analysis;

  return (
    <StagePanel
      title="AI Анализ документов"
      icon="🔍"
      description="Извлечение ключевой информации, метрик и структуры из документов"
      canGoPrev={true}
      canGoNext={hasAnalysis}
      onPrev={onPrev}
      onNext={onNext}
      nextLabel="Создать структуру"
      nextIcon="📋"
      status={isAnalyzing ? 'loading' : hasAnalysis ? 'success' : 'idle'}
      statusMessage={isAnalyzing ? currentStep : undefined}
    >
      <div className="space-y-6">
        {/* Start Analysis */}
        {!hasAnalysis && !isAnalyzing && (
          <div className="space-y-4">
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="text-5xl">🤖</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    Готовы к анализу
                  </h3>
                  <p className="text-sm text-purple-700 mb-4">
                    AI проанализирует {documents.length} документов и извлечет:
                  </p>
                  <ul className="text-sm text-purple-700 space-y-1 mb-4">
                    <li>• Ключевые метрики и показатели</li>
                    <li>• Основные темы и категории</li>
                    <li>• Важные даты и события</li>
                    <li>• Рекомендации по структуре презентации</li>
                  </ul>
                  <Button
                    color="default"
                    size="lg"
                    onPress={startAnalysis}
                    className="shadow-md"
                  >
                    🚀 Запустить анализ
                  </Button>
                </div>
              </div>
            </Card>

            {error && (
              <Card className="p-4 bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </Card>
            )}
          </div>
        )}

        {/* Analysis in Progress */}
        {isAnalyzing && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Анализ в процессе...</h3>
                <Chip color="primary" variant="flat">
                  {Math.round(progress)}%
                </Chip>
              </div>

              <Progress
                value={progress}
                color="primary"
                className="mb-4"
              />

              {currentStep && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-spin">⚙️</div>
                  <span>{currentStep}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  { icon: '📊', label: 'Извлечение данных', done: progress > 25 },
                  { icon: '🏷️', label: 'Классификация', done: progress > 50 },
                  { icon: '🔍', label: 'Анализ метрик', done: progress > 75 },
                  { icon: '✅', label: 'Завершение', done: progress >= 100 },
                ].map((step, i) => (
                  <div
                    key={i}
                    className={`
                      p-3 rounded-lg border-2 transition-all
                      ${step.done ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{step.icon}</span>
                      <span className={`text-sm ${step.done ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                        {step.label}
                      </span>
                      {step.done && <span className="ml-auto text-green-600">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Analysis Results */}
        {hasAnalysis && (
          <div className="space-y-4">
            <Card className="p-4 bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✅</div>
                <div>
                  <p className="font-semibold text-green-800">Анализ завершен</p>
                  <p className="text-sm text-green-700">
                    Извлечено {Object.keys(analysis.metrics || {}).length} категорий метрик
                  </p>
                </div>
              </div>
            </Card>

            {/* Analysis Summary */}
            <div className="grid grid-cols-2 gap-4">
              {/* Classification */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Тип документа</p>
                    <p className="font-semibold">{analysis.classification?.type || 'Unknown'}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Уверенность: {analysis.classification?.confidence || 0}%
                    </p>
                  </div>
                </div>
              </Card>

              {/* Quality */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Полнота данных</p>
                    <p className="font-semibold">{analysis.quality?.completeness || 0}%</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {analysis.quality?.issues?.length || 0} проблем
                    </p>
                  </div>
                </div>
              </Card>

              {/* Entities */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Стейкхолдеры</p>
                    <p className="font-semibold">
                      {analysis.entities?.stakeholders?.length || 0} найдено
                    </p>
                  </div>
                </div>
              </Card>

              {/* Metrics */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Метрики</p>
                    <p className="font-semibold">
                      {Object.keys(analysis.metrics || {}).length} категорий
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recommendations */}
            {analysis.recommendations && (
              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-2">
                      Рекомендации по презентации
                    </p>
                    <div className="space-y-2 text-sm text-blue-800">
                      <p>Тип: <strong>{analysis.recommendations.presentationType}</strong></p>
                      <p>Слайдов: <strong>{analysis.recommendations.slideCount?.recommended || 10}</strong></p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Action to re-analyze */}
            <Button
              variant="light"
              size="sm"
              onPress={startAnalysis}
              startContent={<span>🔄</span>}
            >
              Переанализировать
            </Button>
          </div>
        )}
      </div>
    </StagePanel>
  );
}
