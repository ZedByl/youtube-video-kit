// Таймкоды из заметок владельца → блок, сцена и реплика: npm run where -- 001 2:15 3:40
// Чтобы не читать timeline.json целиком
import { readFileSync } from "node:fs";
import type { Timeline } from "../src/types";
import { episodeId, mmss, parseTime, paths } from "./lib";

const id = episodeId();
const tl: Timeline = JSON.parse(readFileSync(paths(id).timeline, "utf8"));
const times = process.argv.slice(3);
if (!times.length) {
  console.error("Укажите таймкоды: npm run where -- 001 2:15 3:40");
  process.exit(1);
}
const t = (f: number) => mmss(f, tl.fps);
const short = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}…` : s);

for (const arg of times) {
  const f = Math.round(parseTime(arg) * tl.fps);
  const block = tl.blocks.find((b) => f >= b.from && f < b.to);
  const scene = tl.scenes.find((s) => f >= s.from && f < s.from + s.duration);
  const line = tl.lines.find((l) => f >= l.from && f < l.from + l.duration);
  const prev = [...tl.lines].reverse().find((l) => l.from <= f);
  const parts = [`${arg}`, block ? `блок ${block.id}` : "вне блоков"];
  if (scene) parts.push(`${scene.id} ${scene.type} (${t(scene.from)}–${t(scene.from + scene.duration)})`);
  if (line) parts.push(`${line.id} ${line.speaker} «${short(line.text)}»`);
  else if (prev) parts.push(`пауза после ${prev.id}`);
  console.log(parts.join(" · "));
}
