// frontend/src/components/AnalysisStage.tsx

/**
 * УЛУЧШЕННЫЙ Analysis Stage - Действенный и Прозрачный
 * 
 * Показывает ЧТО нашли, ЧЕГО не хватает и ЧТО делать дальше
 */

import { useState, useEffect } from 'react';
import {
  Card, Button, Progress, Chip, Alert,
  Accordion, AccordionItem, Divider
} from '@heroui/react';
import { api } from '../../lib/api';

interface Props {
  projectId: string;
  onContinue?: () => void;
  onPrev?: () => void;
}

export function AnalysisStage({ projectId, onContinue, onPrev }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExistingAnalysis();
  }, [projectId]);

  const loadExistingAnalysis = async () => {
    try {
      const result = await api.getAnalysis(projectId);
      if (result.analysis) {
        setAnalysis(result.analysis);
      }
    } catch (err) {
      console.log('Анализ ещё не выполнен');
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.analyze(projectId);

      let attempts = 0;
      const maxAttempts = 40;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const result = await api.getAnalysis(projectId);
          if (result.analysis) {
            setAnalysis(result.analysis);
            setLoading(false);
            clearInterval(pollInterval);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setLoading(false);
            setError('Превышено время ожидания анализа');
          }
        } catch (pollError) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setLoading(false);
            setError('Не удалось получить результаты анализа');
          }
        }
      }, 3000);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Не удалось запустить анализ');
    }
  };

  // Подсчёт метрик
  const getMetricCounts = () => {
    if (!analysis?.metrics) return { total: 0, byType: {} };

    const counts: any = {
      total: 0,
      byType: {}
    };

    Object.entries(analysis.metrics).forEach(([type, items]: [string, any]) => {
      const count = Array.isArray(items) ? items.length : 0;
      counts.byType[type] = count;
      counts.total += count;
    });

    return counts;
  };

  // Проверка полноты данных
  const isDataComplete = () => {
    return analysis?.quality?.completeness >= 70;
  };

  // Критичные пробелы
  const getCriticalGaps = () => {
    return analysis?.quality?.issues?.filter((i: any) => i.severity === 'high') || [];
  };

  // Переводы типов документов
  const translateDocType = (type: string) => {
    const translations: Record<string, string> = {
      'financial_report': 'Финансовый отчёт',
      'technical_specification': 'Техническая спецификация',
      'status_report': 'Статус-отчёт',
      'architecture_document': 'Архитектурный документ',
      'security_audit': 'Аудит безопасности',
      'development_plan': 'План разработки',
      'infrastructure_report': 'Инфраструктурный отчёт',
      'analytics_report': 'Аналитический отчёт',
      'process_documentation': 'Процессная документация',
      'budget_document': 'Бюджетный документ',
      'meeting_notes': 'Протокол встречи',
      'unknown': 'Неопределённый'
    };
    return translations[type] || type;
  };

  // Переводы типов презентаций
  const translatePresentationType = (type: string) => {
    const translations: Record<string, string> = {
      'pitch': 'Питч',
      'status_report': 'Статус-отчёт',
      'architecture_review': 'Архитектурный обзор',
      'security_review': 'Обзор безопасности',
      'technical_deep_dive': 'Технический deep-dive',
      'executive_summary': 'Executive summary',
      'investor_pitch': 'Презентация для инвесторов',
      'product_launch': 'Запуск продукта',
      'business_review': 'Бизнес-обзор',
      'team_update': 'Обновление для команды'
    };
    return translations[type] || type;
  };

  // Переводы типов графиков
  const translateChartType = (type: string) => {
    const translations: Record<string, string> = {
      'gantt_chart': 'Диаграмма Ганта',
      'pie_chart': 'Круговая диаграмма',
      'bar_chart': 'Столбчатая диаграмма',
      'line_chart': 'Линейный график',
      'architecture_diagram': 'Архитектурная диаграмма',
      'flow_diagram': 'Блок-схема',
      'table': 'Таблица',
      'network_diagram': 'Сетевая диаграмма',
      'sequence_diagram': 'Диаграмма последовательности',
      'funnel': 'Воронка',
      'scatter': 'Точечная диаграмма'
    };
    return translations[type] || type;
  };

  // Переводы серьёзности
  const translateSeverity = (severity: string) => {
    const translations: Record<string, string> = {
      'low': 'Низкая',
      'medium': 'Средняя',
      'high': 'Высокая',
      'critical': 'Критическая'
    };
    return translations[severity] || severity;
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          <Progress isIndeterminate color="primary" />
          <div className="text-center">
            <p className="text-lg font-medium">🤖 AI анализирует ваши документы...</p>
            <p className="text-sm text-gray-500 mt-2">
              Извлечение данных, выявление пробелов, генерация рекомендаций
            </p>
            <p className="text-xs text-gray-400 mt-1">Обычно занимает 30-90 секунд</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2">Анализ документов</h2>
            <p className="text-gray-600">
              Позвольте AI проанализировать документы для извлечения ключевой информации и выявления пробелов
            </p>
          </div>
          <Button
            color="primary"
            size="lg"
            onClick={runAnalysis}
            className="px-8"
          >
            ▶️ Запустить анализ
          </Button>
          <p className="text-xs text-gray-500 mt-4">
            Убедитесь, что вы загрузили и обработали документы
          </p>
        </div>
      </Card>
    );
  }

  const metricCounts = getMetricCounts();
  const criticalGaps = getCriticalGaps();
  const dataComplete = isDataComplete();

  return (
    <div className="space-y-6">
      {/* ЗАГОЛОВОК: Обзор статуса */}
      <Card className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">
                {dataComplete ? '✅' : '⚠️'} Анализ завершён
              </h2>
              <Chip
                color={dataComplete ? 'success' : 'warning'}
                variant="flat"
              >
                Полнота: {analysis.quality?.completeness}%
              </Chip>
            </div>
            <p className="text-gray-600">
              Извлечено {metricCounts.total} показателей •
              Определён тип: {translateDocType(analysis.classification?.type)}
            </p>
          </div>
          <Button
            color="default"
            variant="bordered"
            onClick={runAnalysis}
          >
            🔄 Повторить анализ
          </Button>
        </div>

        {/* Быстрая статистика */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Тип документа</p>
            <p className="text-lg font-bold">
              {translateDocType(analysis.classification?.type)}
            </p>
            <p className="text-xs text-gray-500">
              Уверенность: {analysis.classification?.confidence}%
            </p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Извлечено данных</p>
            <p className="text-lg font-bold">{metricCounts.total}</p>
            <p className="text-xs text-gray-500">показателей найдено</p>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Тип презентации</p>
            <p className="text-lg font-bold">
              {translatePresentationType(analysis.recommendations?.presentationType)}
            </p>
            <p className="text-xs text-gray-500">
              {analysis.recommendations?.slideCount?.recommended} слайдов
            </p>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Проблемы</p>
            <p className="text-lg font-bold text-orange-600">
              {criticalGaps.length}
            </p>
            <p className="text-xs text-gray-500">критичных пробелов</p>
          </div>
        </div>
      </Card>

      {/* КРИТИЧНО: Предупреждение о пробелах */}
      {!dataComplete && (
        <Alert
          color="warning"
          title="⚠️ Обнаружены неполные данные"
          description={`Найдено только ${analysis.quality?.completeness}% ожидаемых данных для ${translatePresentationType(analysis.recommendations?.presentationType)}`}
        >
          <div className="mt-4 space-y-3">
            <div>
              <p className="font-medium mb-2">Отсутствует критичная информация:</p>
              <ul className="space-y-1 text-sm">
                {analysis.quality?.gaps?.map((gap: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500">❌</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {criticalGaps.length > 0 && (
              <div>
                <p className="font-medium mb-2">Проблемы высокой важности:</p>
                <div className="space-y-2">
                  {criticalGaps.map((issue: any, i: number) => (
                    <div key={i} className="p-3 bg-red-50 rounded border border-red-200">
                      <p className="font-medium text-sm">
                        {issue.type?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-700 mt-1">{issue.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Divider />

            <div className="flex gap-3">
              <Button color="warning" variant="flat" onClick={onPrev}>
                📎 Загрузить дополнительные документы
              </Button>
              <Button color="default" variant="bordered">
                ✏️ Изменить цель презентации
              </Button>
              <Button
                color="default"
                variant="light"
                onClick={onContinue}
              >
                Продолжить с имеющимися данными →
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* ПОЗИТИВНО: Готово к генерации */}
      {dataComplete && (
        <Card className="p-6 bg-green-50 border-2 border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-900 mb-2">
                ✅ Готово к генерации презентации!
              </h3>
              <p className="text-green-800 mb-4">
                Найдены все необходимые данные для{' '}
                <strong>{translatePresentationType(analysis.recommendations?.presentationType)}</strong>.
                AI может сгенерировать презентацию на {analysis.recommendations?.slideCount?.recommended} слайдов.
              </p>
              <div className="flex gap-3">
                <Button
                  color="success"
                  size="lg"
                  onClick={onContinue}
                >
                  🚀 Создать структуру презентации
                </Button>
                <Button
                  color="default"
                  variant="bordered"
                >
                  📋 Посмотреть детали ниже
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ДЕТАЛЬНО: Извлечённые данные */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">📊 Извлечённые данные</h3>

        <Accordion variant="splitted">
          <>
            {/* Финансовые метрики */}
            {analysis.metrics?.financial?.length > 0 && (
              <AccordionItem
                key="financial"
                title={
                  <div className="flex items-center gap-2">
                    <span>💰 Финансовые показатели</span>
                    <Chip size="sm" variant="flat" color="primary">
                      Найдено: {analysis.metrics.financial.length}
                    </Chip>
                  </div>
                }
              >
                <div className="space-y-3">
                  {analysis.metrics.financial.map((metric: any, i: number) => (
                    <div key={i} className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{metric.name}</h4>
                        <Chip size="sm" color="success">
                          Уверенность: {metric.confidence}%
                        </Chip>
                      </div>
                      <p className="text-lg font-bold text-blue-900">{metric.value}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Источник: {metric.source}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            )}

            {/* Риски */}
            {analysis.metrics?.risk?.length > 0 && (
              <AccordionItem
                key="risks"
                title={
                  <div className="flex items-center gap-2">
                    <span>⚠️ Выявленные риски</span>
                    <Chip size="sm" variant="flat" color="warning">
                      Найдено: {analysis.metrics.risk.length}
                    </Chip>
                  </div>
                }
              >
                <div className="space-y-3">
                  {analysis.metrics.risk.map((risk: any, i: number) => (
                    <div key={i} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{risk.name}</h4>
                        <Chip
                          size="sm"
                          color={risk.severity === 'high' ? 'danger' : 'warning'}
                        >
                          {translateSeverity(risk.severity)}
                        </Chip>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{risk.description}</p>
                      {risk.mitigation && (
                        <div className="mt-2 p-2 bg-white rounded">
                          <p className="text-xs font-medium text-gray-600">Митигация:</p>
                          <p className="text-xs">{risk.mitigation}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Источник: {risk.source}</p>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            )}

            {/* Соответствие требованиям */}
            {analysis.metrics?.compliance?.length > 0 && (
              <AccordionItem
                key="compliance"
                title={
                  <div className="flex items-center gap-2">
                    <span>📜 Соответствие требованиям</span>
                    <Chip size="sm" variant="flat" color="success">
                      Регуляций: {analysis.metrics.compliance.length}
                    </Chip>
                  </div>
                }
              >
                <div className="space-y-3">
                  {analysis.metrics.compliance.map((comp: any, i: number) => (
                    <div key={i} className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{comp.regulation}</h4>
                        <Chip
                          size="sm"
                          color={comp.status === 'compliant' ? 'success' : 'danger'}
                        >
                          {comp.status === 'compliant' ? 'Соответствует' : 'Не соответствует'}
                        </Chip>
                      </div>
                      <p className="text-sm text-gray-700">{comp.notes}</p>
                      <p className="text-xs text-gray-500 mt-2">Источник: {comp.source}</p>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            )}

            {/* Технические метрики */}
            {analysis.metrics?.technical?.length > 0 && (
              <AccordionItem
                key="technical"
                title={
                  <div className="flex items-center gap-2">
                    <span>⚙️ Технические показатели</span>
                    <Chip size="sm" variant="flat">
                      Найдено: {analysis.metrics.technical.length}
                    </Chip>
                  </div>
                }
              >
                <div className="space-y-3">
                  {analysis.metrics.technical.map((metric: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{metric.name}</h4>
                        <Chip size="sm" color="primary">
                          Уверенность: {metric.confidence}%
                        </Chip>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Источник: {metric.source}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            )}

            {/* Бизнес-метрики */}
            {analysis.metrics?.business?.length > 0 && (
              <AccordionItem
                key="business"
                title={
                  <div className="flex items-center gap-2">
                    <span>📈 Бизнес-показатели</span>
                    <Chip size="sm" variant="flat">
                      Найдено: {analysis.metrics.business.length}
                    </Chip>
                  </div>
                }
              >
                <div className="space-y-3">
                  {analysis.metrics.business.map((metric: any, i: number) => (
                    <div key={i} className="p-4 bg-indigo-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{metric.name}</h4>
                        <Chip size="sm" color="secondary">
                          Уверенность: {metric.confidence}%
                        </Chip>
                      </div>
                      <p className="text-lg font-bold text-indigo-900">{metric.value}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        Источник: {metric.source}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionItem>
            )}
          </>
        </Accordion>
      </Card>

      {/* ДЕЙСТВИЯ: Рекомендуемые визуализации */}
      {analysis.recommendations?.visualizations?.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">📊 Графики, которые создаст AI</h3>

          <div className="space-y-3">
            {analysis.recommendations.visualizations.map((viz: any, i: number) => {
              const hasData = !viz.dataSource?.includes('Требуется');

              return (
                <div
                  key={i}
                  className={`p-4 rounded-lg border-2 ${hasData
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-300'
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">
                          {hasData ? '✅' : '⚠️'}
                        </span>
                        <h4 className="font-semibold">
                          {translateChartType(viz.type)}
                        </h4>
                      </div>
                      <p className="font-medium text-gray-800">{viz.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{viz.reasoning}</p>
                    </div>
                    <Chip
                      size="sm"
                      color={hasData ? 'success' : 'warning'}
                      variant="flat"
                    >
                      {hasData ? 'Можно создать' : 'Нужны данные'}
                    </Chip>
                  </div>
                  {!hasData && (
                    <p className="text-xs text-gray-500 mt-2">
                      📎 Загрузите документы с {viz.dataSource?.replace('Требуется', '').toLowerCase()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}