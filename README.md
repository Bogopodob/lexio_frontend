<p align="center">
  <span style="font-size:52px;font-weight:900;background:linear-gradient(135deg,#5AD4B5 0%,#5B74FF 100%);-webkit-background-clip:text;background-clip:text;color:transparent;">◈ LEXIO</span>
  <br/>
  <span style="font-size:20px;color:#94a3b8;">Фронтенд · учи языки красиво</span>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-5ad4b5?style=for-the-badge&logo=react&logoColor=white&labelColor=0f0f0f">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-5b74ff?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0f0f0f">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-5ad4b5?style=for-the-badge&logo=vite&logoColor=white&labelColor=0f0f0f">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_CSS-4-5b74ff?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=0f0f0f">
</p>

<p align="center">
  <img alt="3D" src="https://img.shields.io/badge/three.js_R3F-3D-0f0f0f?style=flat-square&logo=threedotjs&logoColor=white&labelColor=5ad4b5">
  <img alt="Charts" src="https://img.shields.io/badge/visx-charts-0f0f0f?style=flat-square&logoColor=white&labelColor=5b74ff">
  <img alt="Private" src="https://img.shields.io/badge/status-private-0f0f0f?style=flat-square&labelColor=94a3b8">
</p>

> SPA для языкового тренажёра **Lexio**: словари, интервальные повторения, достижения, серии и 3D-визуализации прогресса. Полный стек поднимается одной командой из [репозитория `infractructure`](https://github.com/Bogopodob/lexio_infractructure).

---

## 🖼️ Приложение в деле

<div align="center">
  <img src="app_preview_1.png" width="100%" style="border-radius:14px;border:1px solid #2b2b2b;box-shadow:0 20px 60px rgba(0,0,0,.6);"/>
  <br/><br/>
  <img src="app_preview_2.png" width="100%" style="border-radius:14px;border:1px solid #2b2b2b;box-shadow:0 20px 60px rgba(0,0,0,.6);"/>
  <br/><br/>
  <img src="app_preview_3.png" width="100%" style="border-radius:14px;border:1px solid #2b2b2b;box-shadow:0 20px 60px rgba(0,0,0,.6);"/>
  <br/><br/>
  <img src="app_preview_4.png" width="100%" style="border-radius:14px;border:1px solid #2b2b2b;box-shadow:0 20px 60px rgba(0,0,0,.6);"/>
  <br/>
</div>

> Нажми на скриншот — откроется в полном размере (~3600px).

---

## ✨ Возможности

- **Словари и поиск** — тысячи записей с переводами, частотные списки по частям речи;
- **Интервальные повторения** — умные сессии обучения с дистракторами и подсказками;
- **Геймификация** — достижения, серии (streak), еженедельная статистика, лидерборд друзей;
- **Личный контент** — карточки, фразы, медиа, озвучка и распознавание речи;
- **3D и графики** — прогресс визуализируется через `three.js` / `react-three-fiber` и `visx`-чарты;
- **Тёмная тема** — тёмный интерфейс с фирменным градиентом `#5AD4B5 → #5B74FF`.

## 🧱 Технологии

| Слой | Стек |
|---|---|
| Язык | TypeScript 5.9 |
| UI | React 19, React Router 6, HeroUI, Tailwind CSS 4, `@base-ui/react` |
| Анимации | framer-motion, GSAP, number-flow |
| 3D | three, `@react-three/fiber`, `@react-three/drei`, ogl |
| Графики | `@visx/*` (curve, gradient, grid, shape, scale…) |
| Сборка | Vite 7, API-урл через `VITE_API_URL` |

---

## 🚀 Быстрый старт

### Локальная разработка (фронтенд отдельно)

```bash
npm install
npm run dev        # http://localhost:5173
```

API урл по умолчанию — `/api` (тот же хост). Для отдельного API укажите вручную:

```bash
VITE_API_URL=http://localhost:8080/api npm run dev
```

### Полный стек (рекомендуется)

Backend, nginx, postgres, rabbitmq и vite-фронтенд поднимаются из [репозитория `infractructure`](https://github.com/Bogopodob/lexio_infractructure):

```bash
git clone git@github.com:Bogopodob/lexio_infractructure.git
cd infractructure
make up                 # dev-стек: php + vite фронтенд + postgres + rabbitmq + xdebug
make frontend-shell     # шелл в контейнер фронтенда
```

### Сборка для продакшена

```bash
npm run build          # tsc -b && vite build → dist/
```

При прод-сборке `VITE_API_URL` зашивается в бандл:

```bash
VITE_API_URL=http://api.lexio.curatio.space:81/api npm run build
```

Готовый `dist/` копируется в `frontend-dist/` — именно эту директорию nginx монтирует читать-only и раздаёт на `app.lexio.curatio.space:81`.

---

## 🌐 Ссылки

| Репозиторий | Назначение |
|---|---|
| [lexio_frontend](https://github.com/Bogopodob/lexio_frontend) | этот проект |
| [lexio_backend](https://github.com/Bogopodob/lexio_backend) | Laravel API (модули Auth/Catalog/Learning/Library/User) |
| [lexio_infractructure](https://github.com/Bogopodob/lexio_infractructure) | docker-compose (dev/prod), Makefile, deploy.sh |

---

<p align="center">
  <span style="color:#5ad4b5;">◈</span> <span style="color:#94a3b8;">Lexio — сделано с любовью к языкам</span>
</p>