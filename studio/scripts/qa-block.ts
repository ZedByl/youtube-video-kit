// Локальная проверка отрендеренного блока: npm run qa -- 001 2 (после render:block)
// ffmpeg: чёрные куски, тишина, громкость. gemma4 (ollama): кадр каждой сцены — заглушка / чёрный кадр.
// Итог — короткий out/001-b2-qa.md: Claude читает его, а не картинки
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TimedScene } from "../src/types";
import { blockScenes, loadBlock } from "./blocks";
import { channel, episodeId, mmss } from "./lib";
import { askJson, MODEL, ollamaUp } from "./ollama";

const id = episodeId();
const { tl, block, video, framesDir, report } = loadBlock(id, process.argv[3]);
if (!existsSync(video)) {
  console.error(`Нет ${video}. Сначала: npm run render:block -- ${id} ${block.id}`);
  process.exit(1);
}
const fps = tl.fps;
const t = (f: number) => mmss(f, fps);
const abs = (sec: number) => block.from + Math.round(sec * fps); // время в файле блока → кадр видео
const scenes = blockScenes(tl, block);
const sceneAt = (f: number) => scenes.find((s) => f >= s.from && f < s.from + s.duration);
const errors: string[] = [];
const info: string[] = [];

const ffmpeg = (filters: string[]) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", video, ...filters, "-f", "null", "-"], { encoding: "utf8" }).stderr;

// --- чёрные куски дольше 1 с вне сцен black (pix_th низкий: фон bgDeep не должен считаться чёрным) ---
for (const m of ffmpeg(["-vf", "blackdetect=d=1:pix_th=0.03", "-an"]).matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)) {
  const [from, to] = [abs(+m[1]), abs(+m[2])];
  const s = sceneAt(from + 1);
  if (s?.type !== "black") errors.push(`${t(from)}–${t(to)} ${s?.id ?? ""} — чёрный экран ${((to - from) / fps).toFixed(1)} с`);
}

// --- тишина дольше 2 с, если её не задали через pauseAfter / pauseBefore ---
const pauses = new Set([
  ...tl.lines.filter((l) => (l.pauseAfter ?? 0) >= 2).map((l) => l.from + l.duration),
  ...tl.lines.flatMap((l, i) => ((l.pauseBefore ?? 0) >= 1.5 && i > 0 ? [tl.lines[i - 1].from + tl.lines[i - 1].duration] : [])),
]);
for (const m of ffmpeg(["-af", "silencedetect=n=-45dB:d=2", "-vn"]).matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) {
  const [from, to] = [abs(+m[1]), abs(+m[2])];
  if (![...pauses].some((p) => Math.abs(p - from) < fps)) errors.push(`${t(from)}–${t(to)} — тишина ${((to - from) / fps).toFixed(1)} с`);
}

// --- громкость блока (норма после finalize −14 LUFS; до него ориентир −18…−22) ---
const loud = /I:\s+(-?[\d.]+) LUFS/.exec(ffmpeg(["-af", "ebur128=framelog=quiet", "-vn"]).split("Summary:")[1] ?? "");
if (loud) info.push(`громкость блока ${loud[1]} LUFS (до finalize)`);

// --- gemma4: кадр каждой сцены ---
const expected = (s: TimedScene) => s.type === "placeholder" || (s.type === "split" && (!s.left.asset || !s.right.asset));
const PROMPT = `Frame from a documentary video. Check ONLY for these problems: (a) placeholder: frame shows the word ${channel.labels.placeholder} or a stand-in card instead of real footage; (b) black: frame is fully black or empty; (c) text: some text is cut off at the frame edge or overlaps other text. Return JSON {"problem":"none|placeholder|black|text","note":"max 8 words"}.`;
const holes: string[] = [];

const main = async () => {
  if (await ollamaUp()) {
    for (const s of scenes) {
      const file = join(framesDir, `${s.id}.jpg`);
      if (!existsSync(file)) continue;
      const r = await askJson<{ problem: string; note?: string }>(PROMPT, [readFileSync(file).toString("base64")]);
      const where = `${t(s.from)} ${s.id} ${s.type}`;
      if (expected(s)) {
        holes.push(where);
        if (r.problem !== "placeholder") info.push(`${where} — заглушка, но ${MODEL} её не увидел (${r.problem})`);
      } else if (r.problem === "placeholder" || (r.problem === "black" && s.type !== "black")) {
        errors.push(`${where} — ${r.problem}: ${r.note ?? ""}`);
      } else if (r.problem === "text") {
        info.push(`${where} — возможно, текст обрезан: ${r.note ?? ""} (ненадёжно, проверить глазами)`);
      }
    }
  } else info.push("ollama не запущен — проверка кадров пропущена");

  const md = [
    `# QA ${id} · блок ${block.id} ${block.title} (${t(block.from)}–${t(block.to)})`,
    "",
    errors.length ? `## Ошибки (${errors.length})\n\n${errors.map((e) => `- ${e}`).join("\n")}` : "Ошибок нет.",
    holes.length ? `\nЗаглушки, ожидаемо (${holes.length}): ${holes.join("; ")}` : "",
    info.length ? `\n${info.map((i) => `- ${i}`).join("\n")}` : "",
    "",
  ]
    .filter((x, i, a) => x || i === a.length - 1)
    .join("\n");
  writeFileSync(report, md);
  console.log(md);
};
main();
