// frontend/src/components/StagePanel.tsx

import { ReactNode } from 'react';
import { Card, Button } from '@heroui/react';

interface StagePanelProps {
  title: string;
  icon: string;
  description?: string;
  children: ReactNode;
  
  // Navigation
  canGoNext?: boolean;
  canGoPrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  
  nextLabel?: string;
  nextIcon?: string;
  
  // Status
  status?: 'idle' | 'loading' | 'success' | 'error';
  statusMessage?: string;
}

export function StagePanel({
  title,
  icon,
  description,
  children,
  canGoNext = false,
  canGoPrev = false,
  onNext,
  onPrev,
  nextLabel = 'Далее',
  nextIcon = '→',
  status = 'idle',
  statusMessage,
}: StagePanelProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-5xl">{icon}</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {status !== 'idle' && (
          <div className={`
            px-4 py-2 rounded-lg font-semibold text-sm
            ${status === 'loading' ? 'bg-blue-100 text-blue-700' : ''}
            ${status === 'success' ? 'bg-green-100 text-green-700' : ''}
            ${status === 'error' ? 'bg-red-100 text-red-700' : ''}
          `}>
            {status === 'loading' && '⏳ Обработка...'}
            {status === 'success' && '✅ Готово'}
            {status === 'error' && '❌ Ошибка'}
          </div>
        )}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <Card className="p-4 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">{statusMessage}</p>
        </Card>
      )}

      {/* Content */}
      <Card className="p-6">
        {children}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {canGoPrev && onPrev && (
            <Button
              variant="light"
              onPress={onPrev}
              startContent={<span>←</span>}
            >
              Назад
            </Button>
          )}
        </div>

        <div>
          {canGoNext && onNext && (
            <Button
              color="default"
              size="lg"
              onPress={onNext}
              endContent={<span>{nextIcon}</span>}
              className="shadow-md"
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
