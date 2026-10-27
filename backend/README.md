# Backend

NestJS API: эталоны (MusicXML / MIDI), транскрипция через Python-сайдкар, анализ исполнения, хранение попыток (Prisma + SQLite).

Запуск, команды и описание API см. в [корневом README](../README.md), устройство анализа в [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

```bash
npm run start:dev -w backend   # режим разработки на :3000
npm test -w backend            # юнит-тесты
npm run db:migrate -w backend  # новая миграция после правки prisma/schema.prisma
```

Настройки в `backend/.env` (пример: `.env.example`): `DATABASE_URL`, `PORT`, `TRANSCRIBER_URL`, `UPLOADS_DIR`.
