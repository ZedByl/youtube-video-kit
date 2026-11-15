# Инструкции для агентов

Все правила, структура и процессы этого репозитория — в [`CLAUDE.md`](CLAUDE.md). Прочитай его целиком перед любой работой: он одинаково применим к Claude Code, Codex, Cursor и другим агентам.

Коротко:

- `docs/raw/` — неизменяемые исходники, `docs/wiki/` — база знаний, которую ведёт агент (index.md + log.md обновляются при каждой операции)
- `studio/` — монтаж видео кодом (Remotion); перед работой с ним — `studio/SCENES.md`
- Если `docs/wiki/identity/channel-concept.md` ещё шаблон — начни с онбординга (`.claude/skills/onboarding/SKILL.md`)
- Процедуры: `.claude/skills/` — onboarding, new-video, edit-block, wiki-lint
