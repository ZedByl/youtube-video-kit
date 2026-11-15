import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Edit, EditBlock } from "../src/types";

export const STUDIO = resolve(import.meta.dirname, "..");

// Настройки канала: язык озвучки и субтитров, подписи для описания (studio/channel.json)
export const channel = JSON.parse(readFileSync(join(STUDIO, "channel.json"), "utf8")) as {
  name: string;
  language: string;
  locale: string;
  labels: Record<string, string>;
};

// Ассет без внешней атрибуции: своя съёмка или заглушка — для него не нужны url и строка в описании
export const OWN_LICENSE = /^(own|eigene|свой|своя|placeholder|platzhalter|заглушка)/i;

export const episodeId = () => {
  const id = process.argv[2];
  if (!id) {
    console.error("Укажите номер видео: npm run <script> -- 001");
    process.exit(1);
  }
  return id;
};

export const paths = (id: string) => ({
  edit: join(STUDIO, "episodes", id, "edit.json"),
  timeline: join(STUDIO, "episodes", id, "timeline.json"),
  episodeDir: join(STUDIO, "episodes", id),
  publicDir: join(STUDIO, "public", "episodes", id),
  voiceDir: join(STUDIO, "public", "episodes", id, "voice"),
  blocksDir: join(STUDIO, "episodes", id, "blocks"),
  outDir: join(STUDIO, "out"),
});

// edit.json + episodes/<id>/blocks/*.json (по порядку имён) → один Edit.
// Блоки дописываются в конец: реплики, сцены, звук и главы склеиваются, ассеты объединяются
export const readEdit = (id: string): Edit => {
  const { edit: file, blocksDir } = paths(id);
  const edit: Edit = JSON.parse(readFileSync(file, "utf8"));
  const blocks = [...(edit.blocks ?? [])];
  // реплики edit.json: блок по списку edit.blocks (start — первая реплика блока)
  let cur: string | undefined;
  for (const l of edit.lines) {
    cur = blocks.find((b) => b.start === l.id)?.id ?? cur;
    l.block ??= cur;
  }
  const files = existsSync(blocksDir) ? readdirSync(blocksDir).filter((f) => f.endsWith(".json")).sort() : [];
  for (const f of files) {
    const b: EditBlock = JSON.parse(readFileSync(join(blocksDir, f), "utf8"));
    if (!b.lines.length) continue;
    blocks.push({ ...b.block, start: b.lines[0].id });
    Object.assign(edit.assets, b.assets);
    edit.lines.push(...b.lines.map((l) => ({ ...l, block: b.block.id })));
    edit.scenes.push(...b.scenes);
    edit.overlays.push(...(b.overlays ?? []));
    edit.music.push(...(b.music ?? []));
    edit.sfx.push(...(b.sfx ?? []));
    edit.chapters.push(...(b.chapters ?? []));
  }
  edit.blocks = blocks;
  const ids = new Set<string>();
  for (const x of [...edit.lines, ...edit.scenes, ...edit.overlays, ...edit.music, ...edit.sfx]) {
    if (ids.has(x.id)) throw new Error(`Повтор id ${x.id}`);
    ids.add(x.id);
  }
  return edit;
};

// src/episodes.ts — список видео (episodes/*/timeline.json) и превью (episodes/*/thumbnails.json) для Remotion Studio.
// Пересобирается после каждого timeline, поэтому новое видео появляется в Studio само
export const registerEpisodes = () => {
  const dir = join(STUDIO, "episodes");
  const ids = readdirSync(dir).filter((d) => existsSync(join(dir, d, "timeline.json"))).sort();
  const thumbs = ids.filter((d) => existsSync(join(dir, d, "thumbnails.json")));
  const v = (d: string) => d.replace(/\W/g, "_");
  const src = [
    "// Сгенерировано scripts/lib.ts → registerEpisodes (запускается из npm run timeline). Руками не редактировать",
    'import type { ThumbnailProps } from "./Thumbnail";',
    'import type { Timeline } from "./types";',
    ...ids.map((d) => `import t${v(d)} from "../episodes/${d}/timeline.json";`),
    ...thumbs.map((d) => `import th${v(d)} from "../episodes/${d}/thumbnails.json";`),
    "",
    `export const episodes: Timeline[] = [${ids.map((d) => `t${v(d)} as unknown as Timeline`).join(", ")}];`,
    "",
    '// thumbnails.json: [{ "id": "A", "props": ThumbnailProps }] → Still T<видео>-<id>',
    "type Thumb = { id: string; props: ThumbnailProps };",
    `export const thumbnails: Thumb[] = [${thumbs.map((d) => `...(th${v(d)} as Thumb[]).map((t) => ({ ...t, id: \`T${d}-\${t.id}\` }))`).join(", ")}];`,
    "",
  ].join("\n");
  writeFileSync(join(STUDIO, "src", "episodes.ts"), src);
};

// "2:15", "135", "1:02:03" → секунды
export const parseTime = (s: string) => s.split(":").reduce((acc, p) => acc * 60 + parseFloat(p), 0);
export const mmss = (frames: number, fps: number) => {
  const s = Math.floor(frames / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Текст для озвучки: без markdown-выделений
export const speakable = (text: string) => text.replace(/\*/g, "").trim();

export const audioDuration = (file: string): number | null => {
  if (!existsSync(file)) return null;
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
  return parseFloat(out);
};
