// frontend/src/components/WorkflowStepper.tsx

import { Card } from '@heroui/react';

export type WorkflowStage = 
  | 'project_setup'      // Настройка проекта
  | 'documents'          // Загрузка документов
  | 'analysis'           // AI анализ
  | 'blueprint'          // Структура презентации
  | 'content'            // Генерация контента
  | 'speaker_notes'      // Заметки докладчика
  | 'export';            // Экспорт PPTX

interface WorkflowStep {
  id: WorkflowStage;
  label: string;
  icon: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'project_setup',
    label: 'Настройка',
    icon: '⚙️',
    description: 'Цели и аудитория',
  },
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
    description: 'План презентации',
  },
  {
    id: 'content',
    label: 'Контент',
    icon: '✍️',
    description: 'Создание слайдов',
  },
  {
    id: 'speaker_notes',
    label: 'Заметки',
    icon: '🎤',
    description: 'Текст выступления',
  },
  {
    id: 'export',
    label: 'Экспорт',
    icon: '💾',
    description: 'Скачать PPTX',
  },
];

interface WorkflowStepperProps {
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  onStageClick?: (stage: WorkflowStage) => void;
}

export function WorkflowStepper({
  currentStage,
  completedStages,
  onStageClick,
}: WorkflowStepperProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStage);

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between gap-4">
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = completedStages.includes(step.id);
          const isCurrent = step.id === currentStage;
          const isAccessible = isCompleted || isCurrent || index === currentIndex + 1;
          const isPast = index < currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step */}
              <button
                onClick={() => isAccessible && onStageClick?.(step.id)}
                disabled={!isAccessible}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all
                  ${isCurrent ? 'bg-gradient-to-br from-green-100 to-teal-100 ring-2 ring-green-500' : ''}
                  ${isCompleted ? 'bg-green-50' : ''}
                  ${!isAccessible ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                  ${isAccessible && !isCurrent && !isCompleted ? 'hover:bg-blue-50' : ''}
                `}
              >
                {/* Icon with status */}
                <div className="relative">
                  <div className={`
                    text-3xl transition-transform
                    ${isCurrent ? 'scale-125' : ''}
                  `}>
                    {step.icon}
                  </div>
                  
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  
                  {isCurrent && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div className={`
                    text-sm font-semibold
                    ${isCurrent ? 'text-green-700' : ''}
                    ${isCompleted ? 'text-green-600' : ''}
                    ${!isAccessible ? 'text-gray-400' : 'text-gray-700'}
                  `}>
                    {step.label}
                  </div>
                  <div className={`
                    text-xs
                    ${isCurrent ? 'text-green-600' : ''}
                    ${!isAccessible ? 'text-gray-300' : 'text-gray-500'}
                  `}>
                    {step.description}
                  </div>
                </div>

                {/* Current indicator */}
                {isCurrent && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 
                    bg-green-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                    Текущий этап
                  </div>
                )}
              </button>

              {/* Connector line */}
              {index < WORKFLOW_STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-2">
                  <div className={`
                    h-full rounded transition-all
                    ${isPast ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
