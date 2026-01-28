// frontend/src/components/WorkflowStepper.tsx

import { Card } from '@heroui/react';

export type WorkflowStage =
  | 'project_setup'      // Настройка проекта
  | 'documents'          // Загрузка документов
  | 'analysis'           // AI анализ
  | 'blueprint'          // Структура презентации
  | 'content_export'     // Контент и экспорт (объединено!)
  | 'speaker_notes';     // Заметки докладчика

interface WorkflowStep {
  id: WorkflowStage;
  label: string;
  icon: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'documents',
    label: 'Документы',
    icon: '📄',
    description: 'Загрузка файлов',
  },
  {
    id: 'analysis',
    label: 'Анализ',
    icon: '🔍',
    description: 'AI извлекает данные',
  },
  {
    id: 'blueprint',
    label: 'Структура',
    icon: '📋',
    description: 'План слайдов',
  },
  {
    id: 'content_export',
    label: 'Контент',
    icon: '💾',
    description: 'Создание и экспорт',
  },
  {
    id: 'speaker_notes',
    label: 'Заметки',
    icon: '🎤',
    description: 'Текст выступления',
  },
  {
    id: 'project_setup',
    label: 'Настройка',
    icon: '⚙️',
    description: 'Цели и debug',
  },
];

interface WorkflowStepperProps {
  currentStage: WorkflowStage;
  onStageClick?: (stage: WorkflowStage) => void;
}

export function WorkflowStepper({
  currentStage,
  onStageClick,
}: WorkflowStepperProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStage);

  return (
    <Card className="p-6 mb-6">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{
              width: `${(currentIndex / (WORKFLOW_STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {WORKFLOW_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStage;
            const isPast = index < currentIndex;

            return (
              <button
                key={step.id}
                onClick={() => onStageClick?.(step.id)}
                className={`
                  flex flex-col items-center gap-2 transition-all
                  ${onStageClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  ${isCurrent ? 'scale-110' : ''}
                `}
                style={{ width: `${100 / WORKFLOW_STEPS.length}%` }}
              >
                {/* Icon Circle */}
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center text-2xl
                    transition-all duration-300 shadow-lg
                    ${isCurrent
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 scale-110 shadow-blue-300'
                      : isPast
                        ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-300'
                        : 'bg-white border-2 border-gray-300'
                    }
                  `}
                >
                  {isPast && !isCurrent ? '✓' : step.icon}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={`
                      text-sm font-semibold transition-colors
                      ${isCurrent ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-gray-600'}
                    `}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500 max-w-[100px]">
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 text-center">
          💡 Все этапы доступны для свободной навигации
        </p>
      </div>
    </Card>
  );
}
