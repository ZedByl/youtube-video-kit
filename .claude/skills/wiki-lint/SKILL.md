---
name: wiki-lint
description: Проверить целостность базы знаний docs/wiki — frontmatter, wikilinks, index.md, дубли, статусы — и записать отчёт в log.md. Использовать по просьбе «проверь вики», «lint», а также после крупных правок.
---

# Lint вики

Процесс 3 из `CLAUDE.md`.

1. Список страниц: `find docs/wiki -name '*.md' ! -name index.md ! -name log.md`.
2. Для каждой страницы:
   - frontmatter: `title`, `category` (= папка), `created`, `updated`, `sources`, `tags`, `status` ∈ draft|active|archived
   - ровно один H1, совпадает с `title`
   - есть в `docs/wiki/index.md`
3. Ссылки: все `[[wiki/…]]` и `[[raw/…]]` (без `#якоря` и `|алиаса`) ведут на существующий файл `docs/<путь>.md` (или файл с расширением для raw). Быстро: `grep -rhoE "\[\[(wiki|raw)/[^]|#]+" docs/wiki | sort -u` и проверить каждый путь.
4. Дубли: одна тема описана на двух страницах — оставить одну, на другой ссылка.
5. Статусы: `draft` со всеми заполненными разделами → `active`; страница видео после 7-дневных метрик → `archived`.
6. `raw/` не править — только сообщить, если в нём файл без frontmatter.
7. Исправить что можно, запись `lint` в `docs/wiki/log.md` (формат в `CLAUDE.md`), владельцу — короткий итог.
