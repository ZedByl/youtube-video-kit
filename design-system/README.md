# Дизайн-система

Сейчас здесь нейтральная заглушка: тёмно-серый фон, синий акцент, Inter / Lora / JetBrains Mono. Она нужна, чтобы студия работала из коробки, — замените её своим стилем.

## Что где

| Что | Где |
| --- | --- |
| Цвета, стили текста, отступы, линии, прозрачности, тени | `tokens.json` — источник истины |
| Шрифты (загрузка из Google Fonts) | `studio/src/theme.ts` → `fonts` |
| Имя канала на заставке, тексты плашки подписки | `studio/channel.json` |
| Заставка | `studio/src/scenes/TitleCard.tsx` |
| Шаблон превью | `studio/src/Thumbnail.tsx` |
| Плёночное зерно | токен `grain-default` в `tokens.json` (0 — выключено, 0.05–0.1 — заметно) |

## Как поменять стиль

1. Цвета — значения `value` в `tokens.json → color.tokens`. **Имена токенов не менять** — сцены обращаются к ним как `colors.accent`, `colors.bgDeep` и т. д.
2. Контраст: текст `text` на `bg`/`bgDeep` — не ниже 7:1, `accent` как текст — не ниже 4.5:1
3. Шрифты — заменить импорты в `studio/src/theme.ts` на любые из `@remotion/google-fonts` (нужна кириллица — проверить, что у шрифта есть subset `cyrillic`)
4. Логотип в заставку — SVG прямо в `TitleCard.tsx` или файл в `studio/public/` через `staticFile`
5. Проверка: `cd studio && npm run typecheck && npm run render:block -- 000 0` и посмотреть `out/000-b0-sheet.jpg`
6. Описать стиль словами (зачем такие цвета, что запрещено) — в `docs/wiki/identity/channel-concept.md`, раздел «Визуальный стиль»
