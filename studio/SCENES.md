# Шпаргалка монтажа

Для агента: читать этот файл вместо `src/`. Источник истины — `src/types.ts`; при изменении сцен обновить и этот файл. Живой пример всех основных приёмов — `episodes/000/`.

## Файлы видео

- `episodes/NNN/edit.json` — настройки, голоса, `hero`; `lines`/`scenes` обычно пустые — монтаж в блоках
- `episodes/NNN/blocks/NN-slug.json` — один блок сценария. Склеивается с `edit.json` в порядке имён файлов (`scripts/lib.ts` → `readEdit`)
- `episodes/NNN/description.md` — ручные секции описания (`## intro`, `## sources`, `## hashtags`, `## pinned`)
- `episodes/NNN/thumbnails.json` — варианты превью: `[{ "id": "A", "props": { "image": "episodes/NNN/img/x.jpg", "year": "1969", "line": "2–4 слова" } }]`, рендер `npx remotion still TNNN-A out/thumb-NNN-a.png`
- `studio/channel.json` — имя канала (заставка), `language` (TTS, субтитры), `locale` (формат чисел), `quotes`, тексты плашки подписки, подписи для описания

Новое видео: скопировать `edit.json` из `episodes/000/` в `episodes/NNN/`, поменять `id`, `title`, голоса; блоки — в `blocks/`. В Remotion Studio оно появится после `npm run timeline -- NNN`.

```json
{
  "block": { "id": "2", "title": "Golden age" },
  "status": "черновик агента, не проверен",
  "assets": { "key": { "src": "img/x.jpg", "title": "…", "author": "…", "license": "CC0", "url": "https://commons…", "credit": "Photo: …" } },
  "lines": [{ "id": "L201", "speaker": "ANNA", "text": "…", "pauseAfter": 0.8 }],
  "scenes": [{ "id": "S201", "at": "L201", "type": "bigDate", "text": "1845" }],
  "overlays": [], "music": [], "sfx": [], "chapters": [{ "at": "L201", "title": "…" }]
}
```

- **id:** реплики `L<блок><nn>` (L201), сцены `S<блок><nn>`, музыка `M<блок><nn>`, SFX `X<блок><nn>`, плашки `O<блок><nn>`. Повтор id — ошибка сборки
- **speaker:** имя голоса из `edit.json → voices` (любое: `HOST`, `ANNA`…)
- **Якорь `at`:** `L201` — начало реплики, `L201:end` — её конец, `L201+1.5` / `L201:end-0.4` — сдвиг в секундах, `start` / `end` — начало и конец видео
- **Длительность сцены:** до начала следующей сцены
- **Переход `transition`:** `fade` по умолчанию, `cut` или `dip` (из чёрного)
- **Ассеты:** файлы в `public/episodes/NNN/` (`img/`, `video/`, `music/`, `sfx/`), в JSON — путь внутри этой папки. `license: "own"` — своя съёмка (url не нужен)
- **Музыка:** `{ id, asset, at, until?, volume?, duck?, loop?, trimBefore?, fadeIn?, fadeOut? }`; `duck` — громкость под речью (работает и у SFX); `trimBefore` — сколько секунд отрезать от начала файла
- **Реплика:** `*слово*` — выделение, не озвучивается. `pauseAfter` — тишина после реплики (по умолчанию `settings.gap`). `pauseBefore` — добавочная тишина перед репликой: дать доиграть заставке (titleCard рисуется 2 с, нужно ~4 с без речи) или сцене без слов

## Сцены

Лимиты — сколько знаков влезает в кадр; проверяет `npm run check`.

| type | Параметры | Лимиты |
| --- | --- | --- |
| `black` | — | |
| `archivePhoto` | `asset`, `caption?`, `move? {fromScale,toScale,fromX,toX,fromY,toY,fromPosY,toPosY,end}` (X/Y в %; PosY — панорама по высокому кадру, только cover; `end` 0–1 — к какой доле сцены движение заканчивается), `tone? sepia\|mono\|none`, `fit? cover\|contain` (contain — для портретных кадров) | caption ≤ 70 |
| `videoClip` | `asset`, `trimBefore?` (с), `playbackRate?`, `zoom?` (убрать вшитые чёрные поля), `caption?` — звук клипа выключен | caption ≤ 70 |
| `bigDate` | `text`, `sub?`, `morphTo?` (перелистывает отличающиеся символы), `morphAt?` (доля сцены) | text ≤ 12, sub ≤ 50 |
| `stat` | `from`, `to`, `label`, `prefix?`, `suffix?`, `fromLabel?`, `toLabel?` — счётчик | label ≤ 50 |
| `timeline` | `title?`, `items [{year,label,at?}]`; после последней вехи — пунктир; `at` — веха появляется на якоре | year ≤ 6, label ≤ 1500/(n·17,5): 3 вехи → 28, 5 вех → 17 |
| `split` | `left`/`right`: `{ asset? \| placeholder?, label }` + стрелка — «тогда → сейчас» | label ≤ 10, placeholder ≤ 22 |
| `map` | `view {center,scale,toCenter?,toScale?}`, `points [{name,coord,primary?,labelSide?,at?}]`, `routes? [{from,to,label?,at?}]`, `active? ["DEU","FRA"]` (коды ADM0_A3 — светлые страны), `highlight? ["Bayern"]` (регионы), `meridian? {lon,label?}`, `ring? {coord,km,label?,at?}` — круг радиусом km; `sweep? {fromLon,toLon,at?,until?,label?,minutes?}` — бегущая линия долготы. Данные: Европа 1:10m, остальной мир 1:50m | name ≤ 20, labels ≤ 20 |
| `yearStrip` | `year`, `title?`, `marks [{month 1–12, date, label}]`, `active?` — год с отметками; с `active` прежние приглушены, следующие скрыты (возвращающаяся глава) | year ≤ 12, title ≤ 50, date ≤ 6, label ≤ 16 |
| `network` | `title?`, `nodes [{id,label,sub?,x,y,primary?}]` (x/y — центр карточки в % кадра), `links [{from,to,dashed?}]`, `shown?` — сколько узлов видны с первого кадра | title ≤ 50, label ≤ 20, sub ≤ 24 |
| `dotGrid` | `total`, `keep?`, `highlight?`, `label`, `fromLabel?`, `toLabel?` — точка = человек/вещь; при `keep` лишние гаснут, `highlight` выделяются акцентом | total ≤ 3000, label ≤ 50 |
| `quote` | `text`, `author?`, `note?`, `style? quote\|engraving` — цитата проявляется по словам; `engraving` — надпись на металле | text ≤ 120 (engraving ≤ 20), author ≤ 50, note ≤ 90 |
| `terminal` | `title?`, `lines []` — ретро-экран, строки печатаются за 75 % сцены. Только факты из сценария | ≤ 8 строк, строка ≤ 48 |
| `callout` | `asset`, `box {x,y,w,h}` (в % исходного снимка), `label?`, `caption?`, `tone?` — общий план → наезд на деталь | caption ≤ 70, label ≤ 30 |
| `checklist` | `title?`, `items []`, `mark? check\|warn`, `note?` — пункты по очереди за 70 % сцены | ≤ 6 пунктов, пункт ≤ 44 |
| `nameGrid` | `title?`, `names []`, `highlight? []`, `note?` — таблички с названиями, потом `highlight` горят акцентом | ≤ 16 названий, ≤ 22 знака (больше 12 названий — ≤ 16) |
| `priceRange` | `title?`, `items [{label,from,to,primary?}]`, `unit?`, `note?`, `shown?` — диапазоны на лог-шкале | ≤ 4 полос, label ≤ 14 |
| `document` | `title`, `fields [{label,value?,mark?}]`, `stamp?`, `note?` — бланк: поля печатаются машинописью, `mark` обводятся. Только факты из сценария | ≤ 5 полей, label ≤ 16, value ≤ 24, title ≤ 24, stamp ≤ 5 |
| `titleCard` | `subtitle?` — заставка канала (имя из `channel.json`) | subtitle ≤ 45 |
| `placeholder` | `label`, `note?`, `mood? ruins\|macro\|archive` — видно, чего не хватает | label ≤ 45, note ≤ 90 |

- **Карта:** координаты `[долгота, широта]`; `scale` ~2600 — Западная Европа, ~3300 — одна страна размера Германии, ~520 с центром `[2,40]` — от Канады до Индии. Точки под речь — `at: "L106+1.4"` (check предупредит, если якорь вне сцены)
- **Разнообразие:** в блоке не больше ~40 % `archivePhoto` и не три `bigDate`/`stat` подряд; хроника — `videoClip`, связи и деньги — `network`, «тогда → сейчас» — `split`, «сколько людей/вещей» — `dotGrid`, «посмотри на эту деталь» — `callout`, слова человека — `quote`, правила и советы — `checklist`, цены и порядки величин — `priceRange`, бумаги — `document`
- **Повторы и статика (видео целиком, ловит `check`):** один ассет — ≤ 2 показов на видео и не в соседних сценах; герой из `hero` в `edit.json` — ≤ 3, каждый раз в новой подаче (фото / `callout` на другую деталь / `split`). Хроника считается по `asset@trimBefore`. Сцена > 15 с — только со сменой внутри (точки/вехи по `at`, `morphTo`, узлы `network` после `shown`), иначе резать на 2–3 сцены. Не три сцены одного `type` подряд (кроме `videoClip`). Ориентиры: средняя сцена 6–7 с, текстовая графика ≤ 35 % хронометража
- **Overlay `speakerTag`:** `{ id, at, duration, type: "speakerTag", speaker, role }`, role ≤ 30. Только при первом появлении голоса в видео, не поверх `titleCard`
- **Overlay `subscribe`:** `{ id, at, duration, type: "subscribe", variant: "mid"|"end", pressAt?, bellAt?, line1?, line2?, button?, buttonDone?, panel? bg|deep|none, sound? }` — плашка подписки на высоте speakerTag; тексты по умолчанию — `channel.json → subscribe`. `mid` (~5 с) — после самого сильного поворота, на спокойной сцене; `end` (~8–12 с) — под реплику про подписку, кнопка заливается на `pressAt`, колокольчик качается на `bellAt`. Звук встроен (`public/fx/cta-*.wav`, пересборка `npm run sfx:cta`). check: не одновременно с другой плашкой, не поверх `split`/`titleCard`, не в последние 20 с (конечная заставка YouTube). Та же плашка файлами с альфой для других монтажек — `npm run render:cta`

## Команды (из `studio/`)

| Команда | Что делает |
| --- | --- |
| `npm run tts:placeholder -- 001` | голоса-заглушки (macOS `say`), только изменённые реплики |
| `npm run tts:elevenlabs -- 001 [--dry] [--block 0,1] [--redo L301,L302]` | голоса ElevenLabs (ключ в `.env`, `voiceId` в `edit.json → voices`); `--dry` — сколько знаков уйдёт в API |
| `npm run timeline -- 001` | timeline.json, границы блоков, регистрация видео в Studio |
| `npm run check -- 001 2` | сводка блока: заглушки, тексты, файлы, лицензии, длительности, повторы, статика |
| `npm run where -- 001 2:15 3:40` | таймкод → блок, сцена, реплика |
| `npm run render:block -- 001 2` | рендер блока + кадр каждой сцены + контакт-лист в `out/` |
| `npm run qa -- 001 2` | локальная проверка блока (ffmpeg + ollama, если запущен) → `out/001-b2-qa.md` |
| `npm run studio` | Remotion Studio в браузере — смотреть видео целиком |
| `npm run render -- E001 out/001.mp4` | финальный рендер 1080p |
| `npm run finalize -- 001` | громкость −14 LUFS / −1 dBTP → `out/001-final.mp4` |
| `npm run meta -- 001` | субтитры SRT, `meta.md`, описание и закреплённый комментарий (если есть `description.md`) |
| `npm run find-assets -- "<что нужно>" --cat "Category:…" [--q "…"]` | кандидаты с Wikimedia Commons: лицензия + что на фото |
| `npm run find-assets -- --get "File:…" --ep 001 --key имя` | скачать файл и получить готовую запись для `assets` |
| `npm run render:cta [-- mid\|end]` | плашки подписки с альфой → `../assets/cta/` (.mov ProRes 4444 и .webm) |
| `npm run typecheck` | проверка типов после правки `src/` |

## Стиль

Токены — `../design-system/tokens.json`. `src/theme.ts` читает их напрямую: в сценах `colors.accent`, `text.caption`, `space.frameInset`, `shadow.caption` и т. д. Новые цвета и размеры — сначала в `tokens.json`, не числом в сцене. Шрифты — в `src/theme.ts` (`@remotion/google-fonts`). Зерно плёнки — токен `grain-default` (0 — выключено).

## Правила

Не читать `timeline.json`, логи рендера и сценарий целиком. Картинки открывать только при находках QA.
