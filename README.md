# StudyFlow

Канбан-доска для учета домашних заданий. Создано для школьников 10-17 лет и их родителей.

## Возможности

- Канбан-доска с колонками: Задали → Делаю → Готово → Повторить
- Drag-and-drop перемещение заданий
- Привязка к предметам с цветовыми метками
- Дедлайны и приоритеты
- Календарь на неделю с отображением заданий
- Совместный доступ к доске (по приглашению)
- Realtime-синхронизация между устройствами
- Темная тема
- PWA (установка на устройство)
- Адаптивный интерфейс (mobile-first)

## Стек технологий

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Drag-and-drop**: dnd-kit
- **State**: Zustand
- **Backend**: Supabase (Auth + PostgreSQL + Realtime)
- **Тесты**: Playwright (E2E)

## Быстрый старт

### Требования

- Node.js 20+
- npm 10+
- Аккаунт Supabase

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/username/studyflow.git
cd studyflow

# Установить зависимости
npm install

# Создать файл переменных окружения
cp .env.example .env.local
```

Заполнить `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Настройка Supabase

1. Создать проект на [supabase.com](https://supabase.com)
2. Выполнить миграции из `supabase/migrations/` в SQL Editor
3. Скопировать URL и anon key из Settings → API

### Разработка

```bash
# Запустить dev-сервер
npm run dev

# Линтинг
npm run lint

# Сборка
npm run build

# E2E тесты
npm run test:e2e
```

## Docker

### Локальная сборка

```bash
# Создать .env файл
cp .env.example .env

# Собрать и запустить (по умолчанию порт 3000)
docker-compose up --build -d

# Или с кастомным портом
APP_PORT=8080 docker-compose up --build -d

# Приложение доступно на http://localhost:3000
```

### Production

```bash
# Создать .env файл
cp .env.example .env
# Заполнить VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, APP_PORT

# Запустить с готовым образом из GHCR
docker-compose -f docker-compose.prod.yml up -d
```

Или вручную:
```bash
docker run -d \
  -p 3000:80 \
  -e VITE_SUPABASE_URL=https://xxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-anon-key \
  --name studyflow \
  ghcr.io/dnovichkov/studyflow:latest
```

## Структура проекта

```
studyflow/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui компоненты
│   │   ├── board/       # Board, Column, TaskCard, TaskDialog
│   │   ├── calendar/    # WeekView
│   │   ├── auth/        # ProtectedRoute
│   │   └── layout/      # Header
│   ├── hooks/           # useAuth, useRealtime, useTheme
│   ├── stores/          # Zustand (boardStore)
│   ├── lib/             # supabase, utils
│   ├── pages/           # Страницы приложения
│   └── types/           # TypeScript типы
├── supabase/
│   └── migrations/      # SQL миграции
├── e2e/                 # Playwright тесты
├── nginx/               # Конфиг nginx для Docker
└── public/              # Статика (manifest, icons)
```

## CI/CD

GitHub Actions автоматически:
- Собирает Docker-образ при push в `main`
- Публикует в GitHub Container Registry

Секреты в репозитории не требуются — переменные передаются при запуске контейнера.

## Лицензия

MIT
