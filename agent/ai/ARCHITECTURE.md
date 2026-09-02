# Frontend Architecture — Feature-Sliced Design (FSD)

## Архитектурный подход

Проект использует **Feature-Sliced Design (FSD)** — архитектуру для крупных frontend-приложений.

Основная идея: код разделяется **по бизнес-возможностям**, а не по типам файлов.

## Структура

```text
src/
├── app/          # Инициализация приложения
├── pages/        # Страницы
├── widgets/      # Крупные блоки интерфейса
├── features/     # Пользовательские сценарии
├── entities/     # Бизнес-сущности
├── shared/       # Общие компоненты
│   ├── api/
│   ├── ui/
│   ├── lib/
│   ├── hooks/
│   ├── config/
│   ├── assets/
│   └── types/
```

## Ответственность слоёв

| Слой | Назначение |
|------|------------|
| app | Router, Providers, Theme, Store |
| pages | Сборка страницы из widgets/features |
| widgets | Крупные UI-блоки |
| features | Завершённые пользовательские действия |
| entities | Бизнес-модель и отображение сущностей |
| shared | Переиспользуемый код |

## Что хранить

### app
- Router
- QueryClient
- Providers
- Theme
- Store

### pages
```text
pages/
 └── Disease/
     ├── ui/
     └── index.ts
```

### widgets
```text
widgets/
 ├── Sidebar/
 ├── Header/
 ├── Timeline/
 └── DiseaseCard/
```

### features
```text
features/
 ├── SearchDisease/
 ├── Authorization/
 ├── ExportPdf/
 └── BookmarkDisease/
```

Каждая feature:

```text
Feature/
├── api/
├── model/
├── ui/
├── lib/
├── config/
└── index.ts
```

### entities

```text
entities/
├── Disease/
├── Patient/
├── Pathogenesis/
└── Recommendation/
```

Структура сущности:

```text
Disease/
├── api/
├── model/
├── ui/
├── lib/
└── index.ts
```

### shared

```text
shared/
├── api/
├── ui/
├── hooks/
├── lib/
├── config/
├── assets/
├── types/
└── constants/
```

## Правила зависимостей

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

Запрещено направлять зависимости вверх.

## Для проекта Curatio

```text
pages/
├── Dashboard
├── Disease
├── Pathogenesis
└── Settings

widgets/
├── Sidebar
├── Timeline
├── RecommendationTree

features/
├── SearchDisease
├── CompareDiseases
├── ExportPdf
├── Login

entities/
├── Disease
├── Patient
├── Recommendation
├── Pathogenesis
```

## Checklist

- Бизнес-логика в features/entities
- Shared только общий код
- Widgets не содержат бизнес-логики
- Pages только собирают экран
- App только конфигурация
- Зависимости только сверху вниз
