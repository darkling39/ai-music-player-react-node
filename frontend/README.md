# Frontend

React + Vite + shadcn/ui. Страницы: загрузка записи и история попыток (`/`), разбор попытки (`/attempts/:id`).

Запуск и общее описание см. в [корневом README](../README.md).

```bash
npm run dev -w frontend    # :5173, запросы /api проксируются на :3000
npm run build -w frontend
```

Код организован по возможностям: `src/features/<feature>/{api.ts,components,pages}`, общее в `src/lib`, shadcn-компоненты в `src/components/ui`.
