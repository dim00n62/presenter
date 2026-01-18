# 🚀 Быстрый старт: Внедрение пошагового Workflow

## ✅ Что нужно сделать

### 1. Скопировать файлы

```bash
# Основные компоненты
cp workflow-components/components/WorkflowStepper.tsx frontend/src/components/
cp workflow-components/components/StagePanel.tsx frontend/src/components/

# Stage компоненты
mkdir -p frontend/src/components/stages
cp workflow-components/components/stages/*.tsx frontend/src/components/stages/

# Новая страница
cp workflow-components/pages/ProjectPageV2.tsx frontend/src/pages/
```

### 2. Обновить App.tsx

```typescript
import { ProjectPageV2 } from './pages/ProjectPageV2';

// В Routes:
<Route path="/project/:projectId" element={<ProjectPageV2 />} />
```

### 3. Добавить API методы

Добавьте в `frontend/src/lib/api.ts`:

```typescript
// Анализ
startAnalysis(projectId, documentIds)
getAnalyses(projectId)

// Структура
generateBlueprint(projectId)

// Контент
generateAllSlides(projectId, blueprintId)
getSlideContents(projectId)

// Заметки
generateSpeakerNotes(projectId, slideIds)
saveSpeakerNotes(projectId, notes)

// Экспорт
exportPPTX(projectId, options)
```

### 4. Проверить backend endpoints

Убедитесь что есть:
- `POST /api/analysis/:projectId/start`
- `GET /api/analysis/:projectId/progress` (SSE)
- `POST /api/blueprints/:projectId/generate`
- `POST /api/generation/:projectId/slides`
- `GET /api/generation/:projectId/progress` (SSE)

### 5. Запустить

```bash
cd frontend
npm install
npm run dev
```

## 🎯 Результат

Пользователи получат:
- 📊 Визуальный прогресс по этапам
- 🎮 Полный контроль процесса
- ↩️ Возможность вернуться назад
- 🔄 Перегенерация на любом этапе
- ✨ Красивый современный UI

## 📚 Подробности

См. WORKFLOW_INTEGRATION.md для полной документации.
