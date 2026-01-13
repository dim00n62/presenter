# ❓ FAQ и Решение проблем

## Часто задаваемые вопросы

### Q: Как работает переход между этапами?

**A:** Переходы контролируются тремя факторами:

1. **Завершенные этапы** - можно вернуться на любой завершенный этап
2. **Текущий этап** - всегда доступен
3. **Следующий этап** - становится доступен только когда текущий завершен

```typescript
// В WorkflowStepper:
const isAccessible = 
  completedStages.includes(stage) ||  // Завершен
  stage === currentStage ||           // Текущий
  stageIndex === currentIndex + 1;    // Следующий
```

### Q: Можно ли пропустить этапы?

**A:** Зависит от этапа:

- ✅ **Speaker Notes** - можно пропустить (опциональный)
- ❌ **Documents, Analysis, Blueprint, Content** - обязательные
- ✅ **Export** - всегда доступен после Content

### Q: Что если анализ упал с ошибкой?

**A:** На каждом этапе есть возможность переделать:

```typescript
// В AnalysisStage:
<Button onPress={startAnalysis}>
  🔄 Переанализировать
</Button>
```

Это позволяет:
- Исправить проблему
- Попробовать снова
- Не блокирует дальнейший прогресс

### Q: Как редактировать уже созданную структуру?

**A:** BlueprintStage поддерживает:

1. **Добавление слайдов** - кнопка "➕ Добавить слайд"
2. **Удаление** - кнопка "🗑️ Удалить" на каждом слайде
3. **Перемещение** - кнопки ▲▼ для изменения порядка
4. **Редактирование** - кнопка "✏️ Редактировать" открывает форму

### Q: Сохраняется ли прогресс между визитами?

**A:** Да! Состояние хранится в:

1. **Backend database** - все данные (documents, analysis, blueprint, etc.)
2. **React state** - временное состояние на странице
3. **Project status** - определяет текущий этап при загрузке

```typescript
// При загрузке проекта:
const determineCurrentStage = (project) => {
  if (!documents.length) return 'documents';
  if (!analysis) return 'analysis';
  // ... etc
}
```

### Q: Можно ли вернуться и изменить что-то на предыдущем этапе?

**A:** ✅ Да! Это ключевая фича:

1. Кликните на нужный этап в WorkflowStepper
2. Внесите изменения
3. Результаты сохраняются
4. Вернитесь к текущей работе

**Важно:** Изменения на ранних этапах не сбрасывают последующие автоматически.

### Q: Как работает real-time прогресс?

**A:** Используется Server-Sent Events (SSE):

```typescript
const eventSource = new EventSource(`/api/analysis/${projectId}/progress`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setProgress(data.progress);
  setCurrentStep(data.step);
};
```

Backend отправляет обновления:
```javascript
res.write(`data: ${JSON.stringify({ progress: 50, step: 'Analyzing...' })}\n\n`);
```

## Решение проблем

### Проблема: WorkflowStepper не отображается

**Причина:** Скорее всего не импортирован компонент

**Решение:**
```typescript
import { WorkflowStepper } from '../components/WorkflowStepper';
```

### Проблема: Кнопка "Далее" не активируется

**Причина:** Этап не помечен как завершенный

**Решение:** Проверьте условие `canGoNext`:
```typescript
// В DocumentsStage:
const allParsed = documents.length > 0 && 
  documents.every(d => d.status === 'parsed');

<StagePanel canGoNext={allParsed} ... />
```

### Проблема: SSE не работает

**Причина:** Backend не настроен для SSE

**Решение:** Убедитесь, что headers установлены:
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

### Проблема: Слайды не сохраняются при редактировании

**Причина:** Локальное состояние не синхронизировано с backend

**Решение:** Добавьте сохранение при изменениях:
```typescript
const updateSlide = async (slideId, updates) => {
  // Локально
  setLocalBlueprint({...});
  
  // На сервер
  await api.updateBlueprintSlide(blueprintId, slideId, updates);
};
```

### Проблема: Типы TypeScript ругаются

**Причина:** Не хватает типизации для API

**Решение:** Добавьте интерфейсы:
```typescript
// types.ts
interface Analysis {
  classification: {...};
  entities: {...};
  // ...
}

// В api.ts
async getAnalyses(projectId: string): Promise<Analysis[]> {
  // ...
}
```

### Проблема: Компоненты HeroUI не работают

**Причина:** Не установлены зависимости

**Решение:**
```bash
npm install @heroui/react framer-motion
```

И настройте tailwind.config.js:
```javascript
const { heroui } = require("@heroui/react");

module.exports = {
  content: [
    "./node_modules/@heroui/react/**/*.{js,ts,jsx,tsx}"
  ],
  plugins: [heroui()],
}
```

## Производительность

### Оптимизация 1: Ленивая загрузка этапов

```typescript
// ProjectPageV2.tsx
const DocumentsStage = lazy(() => import('./stages/DocumentsStage'));
const AnalysisStage = lazy(() => import('./stages/AnalysisStage'));
// ...

<Suspense fallback={<Loading />}>
  {currentStage === 'documents' && <DocumentsStage {...} />}
</Suspense>
```

### Оптимизация 2: Мемоизация

```typescript
const memoizedBlueprint = useMemo(() => blueprint, [blueprint]);

const handleSlideUpdate = useCallback((slideId, updates) => {
  // ...
}, [blueprint]);
```

### Оптимизация 3: Виртуализация длинных списков

Если слайдов > 50:
```typescript
import { Virtualizer } from '@tanstack/react-virtual';

<Virtualizer
  count={slides.length}
  getScrollElement={() => parentRef.current}
  estimateSize={() => 150}
>
  {virtualRow => <SlideCard slide={slides[virtualRow.index]} />}
</Virtualizer>
```

## Кастомизация

### Изменить цветовую схему

В `WorkflowStepper.tsx`:
```typescript
const isCurrent = step.id === currentStage;

className={`
  ${isCurrent ? 'bg-gradient-to-br from-blue-100 to-purple-100' : ''}
  ${isCurrent ? 'ring-2 ring-blue-500' : ''}
`}
```

### Добавить новый этап

1. Добавить в `WorkflowStage` type:
```typescript
export type WorkflowStage = 
  | ... existing stages
  | 'my_new_stage';
```

2. Добавить в `WORKFLOW_STEPS`:
```typescript
{
  id: 'my_new_stage',
  label: 'Новый этап',
  icon: '🆕',
  description: 'Описание',
}
```

3. Создать компонент:
```typescript
// stages/MyNewStage.tsx
export function MyNewStage({ ... }) {
  return <StagePanel ...>...</StagePanel>
}
```

4. Добавить в ProjectPageV2:
```typescript
{currentStage === 'my_new_stage' && (
  <MyNewStage {...} />
)}
```

### Изменить иконки

Просто замените эмодзи в `WORKFLOW_STEPS`:
```typescript
{
  id: 'documents',
  icon: '📂',  // Вместо 📄
  // ...
}
```

## Интеграция с существующим кодом

### Миграция с старой версии

```typescript
// Было:
<Route path="/project/:projectId" element={<ProjectPage />} />

// Стало:
<Route path="/project/:projectId" element={<ProjectPageV2 />} />

// Или обе версии:
<Route path="/project/:projectId" element={<ProjectPageV2 />} />
<Route path="/project/:projectId/v1" element={<ProjectPage />} />
```

### Переиспользование существующих компонентов

```typescript
// В DocumentsStage.tsx используем существующий:
import { DocumentUpload } from '../DocumentUpload';

<DocumentUpload
  projectId={projectId}
  onDocumentUploaded={handleUpload}
/>
```

## Безопасность

### Валидация на клиенте

```typescript
const canProceed = () => {
  if (currentStage === 'documents') {
    return documents.every(d => d.status === 'parsed');
  }
  if (currentStage === 'blueprint') {
    return blueprint?.status === 'approved';
  }
  // ...
};
```

### Проверка прав доступа

```typescript
useEffect(() => {
  const checkAccess = async () => {
    const hasAccess = await api.checkProjectAccess(projectId);
    if (!hasAccess) {
      navigate('/');
    }
  };
  checkAccess();
}, [projectId]);
```

## Тестирование

### Unit тесты

```typescript
describe('WorkflowStepper', () => {
  it('highlights current stage', () => {
    render(
      <WorkflowStepper 
        currentStage="analysis"
        completedStages={['documents']}
      />
    );
    
    expect(screen.getByText('Анализ')).toHaveClass('ring-2');
  });
});
```

### E2E тесты

```typescript
describe('Complete Workflow', () => {
  it('goes through all stages', async () => {
    await page.goto('/project/123');
    
    // Upload
    await page.setInputFiles('input[type=file]', 'test.pdf');
    await page.waitForSelector('text=Готово');
    await page.click('text=Начать анализ');
    
    // Analysis
    await page.waitForSelector('text=Анализ завершен');
    // ...
  });
});
```
