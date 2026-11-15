// edit.json + длительности озвучки → timeline.json (всё в кадрах).
// Реплики идут подряд: leadIn → pauseBefore? → реплика → pauseAfter (или settings.gap) → … → tail.
// Сцены — сплошная дорожка: сцена длится до начала следующей.
// В конце пересобирает src/episodes.ts — видео появляется в Remotion Studio без правки Root.tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Anchor, AudioCue, Timeline, TimedBlock, TimedCue, TimedLine } from "../src/types";
import { audioDuration, episodeId, mmss, paths, readEdit, registerEpisodes } from "./lib";

const id = episodeId();
const edit = readEdit(id);
const { fps, width, height, leadIn, gap, tail, transitionFrames } = edit.settings;
const { voiceDir, publicDir, timeline: outFile } = paths(id);
const sec = (s: number) => Math.round(s * fps);
const warnings: string[] = [];

// --- реплики ---
let t = sec(leadIn);
const lines: TimedLine[] = edit.lines.map((l) => {
  t += sec(l.pauseBefore ?? 0);
  let d = audioDuration(join(voiceDir, `${l.id}.wav`));
  const voiced = d !== null;
  if (d === null) {
    // озвучки ещё нет — оценка по темпу ~140 слов/мин, реплика идёт без звука
    d = (l.text.split(/\s+/).length / 140) * 60;
    warnings.push(`нет озвучки ${l.id}, длительность оценена: ${d.toFixed(1)} с`);
  }
  const line: TimedLine = { ...l, from: t, duration: Math.max(1, sec(d)), file: voiced ? `episodes/${id}/voice/${l.id}.wav` : "" };
  t += line.duration + sec(l.pauseAfter ?? gap);
  return line;
});
const durationInFrames = t + sec(tail);
const byId = new Map(lines.map((l) => [l.id, l]));

// --- якоря: "start", "end", "L03", "L03:end", "L03+1.5", "L03:end-0.5" ---
const resolve = (a: Anchor): number => {
  const m = /^([A-Za-z0-9_]+)(:end)?([+-]\d+(?:\.\d+)?)?$/.exec(a.trim());
  if (!m) throw new Error(`Неверный якорь: ${a}`);
  const [, ref, isEnd, off] = m;
  let f: number;
  if (ref === "start") f = 0;
  else if (ref === "end") f = durationInFrames;
  else {
    const l = byId.get(ref);
    if (!l) throw new Error(`Якорь ссылается на несуществующую реплику: ${a}`);
    f = isEnd ? l.from + l.duration : l.from;
  }
  return Math.min(durationInFrames, Math.max(0, f + (off ? sec(parseFloat(off)) : 0)));
};

// блок, к которому привязан якорь: по реплике; start — первый блок, end — последний
const blockIds = (edit.blocks ?? []).map((b) => b.id);
const blockOf = (a: Anchor) => {
  const ref = a.trim().split(/[:+-]/)[0];
  if (ref === "start") return blockIds[0];
  if (ref === "end") return blockIds.at(-1);
  return byId.get(ref)?.block;
};

// --- сцены ---
const placed = edit.scenes.map((s) => ({ ...s, from: resolve(s.at), block: blockOf(s.at) })).sort((a, b) => a.from - b.from);
if (placed[0] && placed[0].from !== 0) warnings.push(`первая сцена ${placed[0].id} начинается не с 0`);
// at у точек карты, вех таймлайна, ring карты → from; at у маршрутов карты → startFrame; sweep карты at/until → from/to; кадры от начала сцены.
// Новая сцена с моментами по якорям: перевести их в кадры здесь, по образцу map
const local = <T extends { at?: Anchor }>(xs: T[], from: number) => xs.map((x) => (x.at ? { ...x, from: resolve(x.at) - from } : x));
const scenes = placed.map((s, i) => {
  const end = placed[i + 1]?.from ?? durationInFrames;
  const duration = end - s.from;
  if (duration < fps) warnings.push(`сцена ${s.id} короче секунды (${duration} кадров)`);
  if (s.type === "map") {
    const sweep = s.sweep && { ...s.sweep, ...(s.sweep.at ? { from: resolve(s.sweep.at) - s.from } : {}), ...(s.sweep.until ? { to: resolve(s.sweep.until) - s.from } : {}) };
    const routes = s.routes?.map((r) => (r.at ? { ...r, startFrame: resolve(r.at) - s.from } : r));
    return { ...s, duration, points: local(s.points, s.from), ...(sweep ? { sweep } : {}), ...(routes ? { routes } : {}), ...(s.ring ? { ring: local([s.ring], s.from)[0] } : {}) };
  }
  if (s.type === "timeline") return { ...s, duration, items: local(s.items, s.from) };
  return { ...s, duration };
});

// pressAt/bellAt у плашки подписки → pressFrom/bellFrom, кадры от начала плашки
const overlays = edit.overlays.map((o) => {
  const from = resolve(o.at);
  const cues = o.type === "subscribe" ? { ...(o.pressAt ? { pressFrom: resolve(o.pressAt) - from } : {}), ...(o.bellAt ? { bellFrom: resolve(o.bellAt) - from } : {}) } : {};
  return { ...o, from, durationInFrames: sec(o.duration), ...cues };
});

const cue = ({ at, until, asset, ...rest }: AudioCue): TimedCue => {
  const from = resolve(at);
  const to = until ? resolve(until) : durationInFrames;
  const a = edit.assets[asset];
  if (!a) throw new Error(`Нет ассета ${asset}`);
  const fileFrames = rest.loop ? sec(audioDuration(join(publicDir, a.src)) ?? 0) - sec(rest.trimBefore ?? 0) : 0;
  return { ...rest, asset, from, duration: Math.max(1, to - from), src: `episodes/${id}/${a.src}`, ...(fileFrames > 0 ? { fileFrames } : {}) };
};

// --- блоки: от первой реплики или сцены блока до начала следующего ---
// pauseBefore первой реплики принадлежит её блоку: блок начинается сразу после предыдущей реплики (так в него попадает заставка)
const starts = (edit.blocks ?? []).map((b, i) => {
  const fl = byId.get(b.start);
  const prev = fl ? lines[lines.indexOf(fl) - 1] : undefined;
  const first = !fl ? durationInFrames : fl.pauseBefore && prev ? prev.from + prev.duration : fl.from;
  const sceneFrom = Math.min(first, ...scenes.filter((s) => s.block === b.id).map((s) => s.from));
  return { ...b, from: i === 0 ? 0 : sceneFrom };
});
const blocks: TimedBlock[] = starts.map((b, i) => ({ id: b.id, title: b.title, from: b.from, to: starts[i + 1]?.from ?? durationInFrames }));

const timeline: Timeline = {
  id,
  title: edit.title,
  generatedAt: new Date().toISOString(),
  fps,
  width,
  height,
  durationInFrames,
  transitionFrames,
  assets: edit.assets,
  lines,
  scenes,
  overlays,
  music: edit.music.map(cue),
  sfx: edit.sfx.map(cue),
  chapters: edit.chapters.map((c) => ({ from: resolve(c.at), title: c.title })),
  blocks,
  speech: lines.filter((l) => l.file).map((l) => [l.from, l.from + l.duration]),
};

writeFileSync(outFile, JSON.stringify(timeline, null, 2) + "\n");
registerEpisodes();
console.log(`timeline.json: ${lines.length} реплик, ${scenes.length} сцен, длительность ${mmss(durationInFrames, fps)} (${durationInFrames} кадров)`);
for (const b of blocks) console.log(`  блок ${b.id} ${mmss(b.from, fps)}–${mmss(b.to, fps)} ${b.title}`);
for (const w of warnings) console.warn(`⚠️  ${w}`);
