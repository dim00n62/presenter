# 🎯 Пошаговый Workflow для Presentation Agent

## 📋 Обзор

Новая версия интерфейса с пошаговым управлением создания презентации. Пользователь полностью контролирует процесс и может возвращаться на предыдущие этапы.

## 🎨 Новые компоненты

### 1. WorkflowStepper
**Файл:** `frontend/src/components/WorkflowStepper.tsx`

Визуальный индикатор прогресса с 7 этапами:
- ⚙️ Настройка проекта
- 📄 Загрузка документов
- 🔍 AI анализ
- 📋 Структура презентации
- ✍️ Генерация контента
- 🎤 Заметки докладчика
- 💾 Экспорт PPTX

**Особенности:**
- Кликабельные этапы (доступны только пройденные и следующий)
- Индикаторы завершения (✓)
- Текущий этап подсвечен
- Анимированные переходы

### 2. StagePanel
**Файл:** `frontend/src/components/StagePanel.tsx`

Универсальная обертка для каждого этапа со встроенной навигацией.

**Props:**
```typescript
{
  title: string;          // Заголовок этапа
  icon: string;           // Эмодзи иконка
  description?: string;   // Описание
  children: ReactNode;    // Контент этапа
  
  // Навигация
  canGoNext?: boolean;    // Можно ли идти дальше
  canGoPrev?: boolean;    // Можно ли вернуться
  onNext?: () => void;
  onPrev?: () => void;
  
  // Статус
  status?: 'idle' | 'loading' | 'success' | 'error';
}
```

### 3. Stage компоненты

#### DocumentsStage (`frontend/src/components/stages/DocumentsStage.tsx`)
- Загрузка файлов
- Отслеживание парсинга
- Индикатор готовности к анализу

#### AnalysisStage (`frontend/src/components/stages/AnalysisStage.tsx`)
- Ручной запуск AI анализа
- Real-time прогресс через SSE
- Отображение результатов анализа
- Возможность переанализа

#### BlueprintStage (`frontend/src/components/stages/BlueprintStage.tsx`)
- Генерация структуры с помощью AI
- Редактирование слайдов (добавление, удаление, перемещение)
- Утверждение структуры
- Перегенерация структуры

#### ContentStage (`frontend/src/components/stages/ContentStage.tsx`)
- Генерация контента для всех слайдов
- Прогресс генерации
- Превью созданного контента
- Перегенерация

#### SpeakerNotesStage (`frontend/src/components/stages/SpeakerNotesStage.tsx`)
- Генерация заметок для выступления
- Редактирование заметок
- Возможность пропустить этап

#### ExportStage (`frontend/src/components/stages/ExportStage.tsx`)
- Выбор темы оформления
- Настройки экспорта
- Скачивание PPTX
- Повторный экспорт с другими настройками

### 4. ProjectPageV2
**Файл:** `frontend/src/pages/ProjectPageV2.tsx`

Новая версия страницы проекта с:
- Управлением состоянием workflow
- Автоматическим определением текущего этапа
- Навигацией между этапами
- Отслеживанием завершенных этапов

## 🔧 Интеграция

### Шаг 1: Добавить файлы

Скопируйте все созданные файлы в соответствующие директории:

```bash
# Основные компоненты
frontend/src/components/WorkflowStepper.tsx
frontend/src/components/StagePanel.tsx

# Stage компоненты
frontend/src/components/stages/DocumentsStage.tsx
frontend/src/components/stages/AnalysisStage.tsx
frontend/src/components/stages/BlueprintStage.tsx
frontend/src/components/stages/ContentStage.tsx
frontend/src/components/stages/SpeakerNotesStage.tsx
frontend/src/components/stages/ExportStage.tsx

# Новая версия страницы
frontend/src/pages/ProjectPageV2.tsx
```

### Шаг 2: Создать директорию stages

```bash
mkdir -p frontend/src/components/stages
```

### Шаг 3: Обновить роутинг

В `frontend/src/App.tsx`:

```typescript
import { ProjectPageV2 } from './pages/ProjectPageV2';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Используем новую версию */}
        <Route path="/project/:projectId" element={<ProjectPageV2 />} />
        {/* Или оставляем обе версии для сравнения */}
        <Route path="/project/:projectId/v1" element={<ProjectPage />} />
        <Route path="/project/:projectId/v2" element={<ProjectPageV2 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Шаг 4: Добавить недостающие API методы

В `frontend/src/lib/api.ts` добавьте методы:

```typescript
// Analysis
async startAnalysis(projectId: string, documentIds: string[]) {
  const response = await fetch(`/api/analysis/${projectId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentIds }),
  });
  return response.json();
}

async getAnalyses(projectId: string) {
  const response = await fetch(`/api/analysis/${projectId}`);
  return response.json();
}

// Blueprint
async generateBlueprint(projectId: string) {
  const response = await fetch(`/api/blueprints/${projectId}/generate`, {
    method: 'POST',
  });
  return response.json();
}

// Content
async generateAllSlides(projectId: string, blueprintId: string) {
  const response = await fetch(`/api/generation/${projectId}/slides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprintId }),
  });
  return response.json();
}

async getSlideContents(projectId: string) {
  const response = await fetch(`/api/generation/${projectId}/contents`);
  return response.json();
}

// Speaker Notes
async generateSpeakerNotes(projectId: string, slideIds: string[]) {
  const response = await fetch(`/api/speaker-notes/${projectId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slideIds }),
  });
  return response.json();
}

async saveSpeakerNotes(projectId: string, notes: any[]) {
  const response = await fetch(`/api/speaker-notes/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return response.json();
}

// Export
async exportPPTX(projectId: string, options: any) {
  const response = await fetch(`/api/presentations/${projectId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  return response.json();
}
```

### Шаг 5: Обновить backend routes (если нужно)

Проверьте, что у вас есть все необходимые эндпоинты:

- `POST /api/analysis/:projectId/start` - запуск анализа
- `GET /api/analysis/:projectId/progress` - SSE прогресса
- `GET /api/analysis/:projectId` - получить результаты
- `POST /api/blueprints/:projectId/generate` - создать структуру
- `POST /api/generation/:projectId/slides` - генерация контента
- `GET /api/generation/:projectId/progress` - SSE прогресса
- `POST /api/speaker-notes/:projectId/generate` - генерация заметок
- `POST /api/presentations/:projectId/export` - экспорт PPTX

## 🎯 Преимущества нового подхода

### 1. Контроль пользователя
- Пользователь сам решает, когда переходить к следующему этапу
- Можно вернуться на предыдущие этапы
- Возможность перегенерации на любом этапе

### 2. Прозрачность процесса
- Видно, на каком этапе находится проект
- Понятно, какие этапы пройдены
- Real-time обратная связь на каждом шаге

### 3. Гибкость
- Можно пропустить необязательные этапы (например, speaker notes)
- Экспериментирование с разными вариантами на каждом этапе
- Возможность редактирования результатов

### 4. UX
- Красивая визуализация прогресса
- Понятные иконки и статусы
- Минимум текста, максимум визуала

## 🚀 Дальнейшие улучшения

### Возможные доработки:
1. **Сохранение состояния** - автосохранение на каждом этапе
2. **История изменений** - версионирование blueprint и контента
3. **Шаблоны** - сохраненные структуры для повторного использования
4. **Коллаборация** - совместное редактирование
5. **Предпросмотр** - preview слайдов прямо в браузере
6. **Экспорт в другие форматы** - Google Slides, PDF, HTML

## 📝 Примечания

- Все компоненты используют HeroUI для единообразия
- SSE используется для real-time обновлений
- Состояние workflow хранится в React state (можно переключить на Redux/Zustand)
- Backend API предполагается уже существующий из текущего проекта

## 🎨 Стилизация

Компоненты используют:
- Tailwind CSS для стилей
- HeroUI компоненты
- Gradients для красивых карточек
- Анимации для переходов

Цветовая схема:
- Зеленый/Teal - основной (Sber)
- Синий - информация
- Фиолетовый - AI процессы
- Оранжевый/Розовый - креатив
