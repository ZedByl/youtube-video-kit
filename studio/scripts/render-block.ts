// Рендер одного блока: npm run render:block -- 001 2 [--frames-only]
// out/001-b2.mp4 — блок; out/001-b2/Sxxx.jpg — кадр из середины каждой сцены (вход для qa); out/001-b2-sheet.jpg — контакт-лист
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { episodeId, mmss, STUDIO } from "./lib";
import { blockScenes, loadBlock } from "./blocks";

const id = episodeId();
const { tl, block, video, framesDir, sheet } = loadBlock(id, process.argv[3]);
const t = (f: number) => mmss(f, tl.fps);

// --frames-only: только кадры и контакт-лист из уже отрендеренного блока
const framesOnly = process.argv.includes("--frames-only");
const started = Date.now();
if (!framesOnly || !existsSync(video)) {
  console.log(`Рендер блока ${block.id} (${t(block.from)}–${t(block.to)}, ${block.to - block.from} кадров)…`);
  const r = spawnSync("npx", ["remotion", "render", `E${id}`, video, `--frames=${block.from}-${block.to - 1}`, "--log=error"], { cwd: STUDIO, encoding: "utf8" });
  writeFileSync(join(STUDIO, "out", `${id}-b${block.id}-render.log`), `${r.stdout}\n${r.stderr}`);
  if (r.status !== 0) {
    console.error(`Рендер упал, лог: out/${id}-b${block.id}-render.log\n${r.stderr.split("\n").slice(-15).join("\n")}`);
    process.exit(1);
  }
}

// кадр из середины каждой сцены (у счётчиков и дат — из конца, когда анимация закончилась); время — относительно начала блока
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
const scenes = blockScenes(tl, block);
for (const s of scenes) {
  const [a, b] = [Math.max(s.from, block.from), Math.min(s.from + s.duration, block.to)];
  const mid = (s.type === "stat" || s.type === "bigDate" ? b - 12 : (a + b) / 2) - block.from;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", (mid / tl.fps).toFixed(2), "-i", video, "-frames:v", "1", "-vf", "scale=768:-1", "-q:v", "4", join(framesDir, `${s.id}.jpg`)]);
}
const cols = Math.min(6, scenes.length);
const rows = Math.ceil(scenes.length / cols);
execFileSync("ffmpeg", ["-y", "-v", "error", "-pattern_type", "glob", "-i", join(framesDir, "*.jpg"), "-vf", `scale=320:-1,tile=${cols}x${rows}:padding=4`, "-frames:v", "1", "-q:v", "4", sheet]);

console.log(`Готово за ${Math.round((Date.now() - started) / 1000)} с: out/${id}-b${block.id}.mp4, ${scenes.length} кадров сцен, контакт-лист out/${id}-b${block.id}-sheet.jpg (порядок: ${scenes.map((s) => s.id).join(" ")})`);
