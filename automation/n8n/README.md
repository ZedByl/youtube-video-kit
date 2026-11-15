# n8n-workflow канала (необязательно)

Два workflow для уже развёрнутого n8n. Оба коммитят markdown-файлы в GitHub-репозиторий проекта через GitHub REST API; после этого делаешь `git pull`, и данные видны в Obsidian и Claude.

| Файл                 | Что делает                                                       | Расписание (Europe/Berlin) | Telegram |
| -------------------- | ---------------------------------------------------------------- | -------------------------- | -------- |
| `channel-stats.json` | Статистика своего канала + последние 5 видео, дельта к прошлому снимку → `docs/raw/stats/` | ежедневно 09:00 | да |
| `trends.json`        | Outlier-ы и свежие видео каналов-ориентиров, комментарии к топ-5 → `docs/raw/trends/` | понедельник 08:00 | нет |
| `channels.json`      | Список каналов-ориентиров (копия того, что зашито в ноду `Channels list`) | — | — |

## 1. Credentials в n8n

Создай три credential с **точно такими именами** — тогда при импорте n8n подставит их сам (иначе выбери вручную в красных нодах):

| Имя               | Тип          | Поля                                                                                                                          |
| ----------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `YouTube API key` | Query Auth   | Name: `key`, Value: ключ YouTube Data API v3 (Google Cloud Console → APIs & Services → Credentials)                           |
| `GitHub token`    | Header Auth  | Name: `Authorization`, Value: `Bearer <fine-grained PAT>` с правом **Contents: Read and write** только на репозиторий проекта |
| `Telegram bot`    | Telegram API | Access Token от @BotFather                                                                                                    |

### Ключ YouTube Data API v3

1. Открой [console.cloud.google.com](https://console.cloud.google.com) под Google-аккаунтом (можно тем же, что у канала).
2. Вверху → выбор проекта → **New Project** → имя, например `my-channel` → **Create**, затем переключись на него.
3. **APIs & Services → Library** → найди **YouTube Data API v3** → **Enable**.
4. **APIs & Services → Credentials → Create credentials → API key**. Скопируй ключ.
5. В карточке ключа (**Edit API key**):
   - **API restrictions → Restrict key** → отметь только **YouTube Data API v3**;
   - по желанию **Application restrictions → IP addresses** → IP сервера с n8n.
   - **Save**.
6. Billing подключать не нужно: бесплатная квота — 10 000 units в день.

Проверка ключа: открой в браузере `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=@YouTube&key=<КЛЮЧ>` — должен вернуться JSON с `items`. Ошибка `403 accessNotConfigured` значит, что API не включён (шаг 3); новый ключ иногда начинает работать через несколько минут.

Credential в n8n: **Credentials → Add credential → Query Auth** → имя `YouTube API key`, **Name** = `key`, **Value** = ключ → **Save**.

### GitHub-токен

Репозиторий канала: `<owner>/<repo>` на GitHub (в ноде Config: `githubOwner` = `<owner>`, `githubRepo` = `<repo>`, `branch` = `main`).

1. GitHub → аватар → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** (или сразу [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)).
2. **Token name**: `n8n-channel`; **Expiration**: например 1 год (поставь напоминание продлить).
3. **Repository access → Only select repositories** → ваш репозиторий.
4. **Permissions → Repository permissions → Contents: Read and write** (Metadata: Read-only добавится сам). Больше ничего не нужно.
5. **Generate token** → скопируй `github_pat_…` (показывается один раз).

Проверка: `curl -H "Authorization: Bearer <ТОКЕН>" https://api.github.com/repos/<owner>/<repo>/contents/docs/raw/stats` — должен вернуться JSON с `.gitkeep`.

Credential в n8n: **Credentials → Add credential → Header Auth** → имя `GitHub token`, **Name** = `Authorization`, **Value** = `Bearer github_pat_…` (слово `Bearer` и пробел обязательны) → **Save**.

### ID своего канала

Когда канал появится: [youtube.com/account_advanced](https://www.youtube.com/account_advanced) → **Channel ID** (`UC…`). Это значение вписывается в `channelId` в ноде Config workflow `channel-stats`.

### Telegram

`chat_id`: напиши боту любое сообщение и открой `https://api.telegram.org/bot<TOKEN>/getUpdates` — поле `message.chat.id`.

## 2. Импорт

1. n8n → **Workflows → Import from File** → `channel-stats.json`, затем `trends.json`.
2. В каждом workflow открой ноду **Config** и заполни:
   - `githubOwner`, `githubRepo`, `branch` (по умолчанию `main`);
   - в `channel-stats`: `channelId` (UC… своего канала) и `telegramChatId`;
   - в `trends`: `minScore` (порог outlier, по умолчанию 2), `minMedian` (каналы с медианой просмотров ниже этого числа не попадают в outlier-ы и свежие, а идут в раздел «Малые каналы»; по умолчанию 1000) и `commentVideos` (по скольким видео собирать комментарии).
3. Пока канала нет, оставь `channelId` пустым — workflow будет тихо завершаться на ноде «Канал не задан».
4. Включи workflow (Active).

## 3. Проверка

- **Execute workflow** в `trends` → в репозитории появляется коммит `trends: отчёт по каналам-ориентирам YYYY-MM-DD`. Раздел «Не найдены» в отчёте — каналы, чьи handles надо поправить.
- В `channel-stats` для теста можно временно подставить ID любого публичного канала → коммит в `docs/raw/stats/` и сообщение в Telegram. Повторный запуск в тот же день перезаписывает сегодняшний снимок; дельта считается к последнему снимку за предыдущие дни.

## Каналы-ориентиры

В `channels.json` — пример; заполни свои каналы (их список — в `docs/wiki/competitors/benchmark-channels.md`). После первого запуска сверь раздел «Не найдены». Если handle не находится, впиши `id` канала (UC…) — он приоритетнее. После правки `channels.json` скопируй массив в ноду `Channels list` в `trends`.

## Квота YouTube API

Без `search.list`: на канал ~3 units, плюс по 1 unit на комментарии к каждому из топ-видео. 25 каналов ≈ 80 units за запуск при лимите 10 000/день.

## Дальше

- YouTube Analytics API (CTR, удержание, источники трафика) — после запуска канала, через OAuth2 credential (см. `docs/wiki/metrics/kpi-and-analytics.md`).
