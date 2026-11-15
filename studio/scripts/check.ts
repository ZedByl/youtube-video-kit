// Короткая сводка по видео или блоку: npm run check -- 001 [блок]
// Длительности, заглушки, нехватка файлов, слишком короткие/длинные сцены, повторы и тексты, которые не влезут в кадр
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { TimedScene, Timeline } from "../src/types";
import { episodeId, mmss, OWN_LICENSE, paths, readEdit, STUDIO } from "./lib";

const id = episodeId();
const only = process.argv[3];
const p = paths(id);
const edit = readEdit(id);
const tl: Timeline = JSON.parse(readFileSync(p.timeline, "utf8"));
const t = (f: number) => mmss(f, tl.fps);
const out: string[] = [];
const warn = (s: string) => out.push(`⚠️  ${s}`);

// timeline.json старше монтажа — сводка будет врать
const sources = [p.edit, ...(existsSync(p.blocksDir) ? readdirSync(p.blocksDir).map((f) => join(p.blocksDir, f)) : [])];
if (sources.some((f) => statSync(f).mtimeMs > statSync(p.timeline).mtimeMs)) warn(`timeline.json устарел: npm run timeline -- ${id}`);

const blocks = tl.blocks.filter((b) => !only || b.id === only);
if (only && !blocks.length) {
  console.error(`Нет блока ${only}. Есть: ${tl.blocks.map((b) => b.id).join(", ")}`);
  process.exit(1);
}
const inBlock = (from: number) => blocks.some((b) => from >= b.from && from < b.to);

// кадры внутри сцены, где что-то появляется по at (проставляет build-timeline)
const changes = (s: TimedScene): number[] => {
  const fs = (xs?: { from?: number }[]) => (xs ?? []).map((x) => x.from);
  const all = (() => {
    switch (s.type) {
      case "map":
        return [...fs(s.points), ...(s.routes ?? []).map((r) => r.startFrame), s.sweep?.from, s.sweep?.to, s.ring?.from];
      case "timeline":
        return fs(s.items);
      case "bigDate":
        return s.morphTo ? [Math.round(s.duration * (s.morphAt ?? 0.5))] : [];
      // узлы/полосы после shown вырастают по очереди — тот же расчёт, что в Network.tsx / PriceRange.tsx
      case "network":
      case "priceRange": {
        const [n, share, pad] = s.type === "network" ? [s.nodes.length, 0.8, 8] : [s.items.length, 0.6, 12];
        const shown = s.shown ?? 0;
        const fresh = Math.max(1, n - shown);
        return Array.from({ length: n - shown }, (_, i) => pad + ((s.duration * share) / fresh) * i);
      }
      default:
        return [];
    }
  })();
  return all.filter((f): f is number => f !== undefined);
};
// что показывает сцена: ассеты фото/callout/split, хроника — ассет@секунда (trimBefore)
const assetKeys = (s: TimedScene): string[] => {
  if (s.type === "videoClip") return [`${s.asset}@${s.trimBefore ?? 0}`];
  if (s.type === "split") return [s.left.asset, s.right.asset].filter((a): a is string => !!a);
  return "asset" in s && s.asset ? [s.asset] : [];
};
out.unshift(`${id} · ${t(tl.durationInFrames)} · ` + blocks.map((b) => `блок ${b.id} ${t(b.from)}–${t(b.to)} ${b.title}`).join(" | "));

const lines = tl.lines.filter((l) => inBlock(l.from));
const scenes = tl.scenes.filter((s) => inBlock(s.from));
out.push(`реплик ${lines.length}, сцен ${scenes.length}`);

// озвучка
const noVoice = lines.filter((l) => !l.file || !existsSync(join(STUDIO, "public", l.file))).map((l) => l.id);
if (noVoice.length) warn(`нет озвучки (длительность оценена): ${noVoice.join(", ")}`);

// длительность сцен
for (const s of scenes) {
  const sec = s.duration / tl.fps;
  if (s.type !== "black" && sec < 1.5) warn(`${t(s.from)} ${s.id} ${s.type} короткая: ${sec.toFixed(1)} с`);
  if (s.type === "archivePhoto" && sec > 12) warn(`${t(s.from)} ${s.id} фото держится ${sec.toFixed(1)} с`);
  // > 15 с без смены внутри: смена — точка/веха, появившиеся по at
  if (sec > 15 && s.type !== "titleCard" && s.type !== "black") {
    const cuts = [0, ...changes(s).filter((f) => f > 0 && f < s.duration), s.duration].sort((a, b) => a - b);
    const still = Math.max(...cuts.slice(1).map((f, i) => f - cuts[i])) / tl.fps;
    if (still > 15) warn(`${t(s.from)} ${s.id} ${s.type} держится ${sec.toFixed(1)} с${cuts.length > 2 ? `, без смены ${still.toFixed(1)} с` : ""} — нужна смена внутри`);
  }
}

// повторы по всему эпизоду: ассет ≤ 2 показов (герой из edit.hero — ≤ 3), хроника — по ассету и trimBefore
const shows = new Map<string, string[]>();
for (const s of tl.scenes) for (const k of assetKeys(s)) shows.set(k, [...(shows.get(k) ?? []), s.id]);
const blockIds = new Set(scenes.map((s) => s.id));
for (const [k, ids] of shows) {
  const max = edit.hero?.includes(k.split("@")[0]) ? 3 : 2;
  if (ids.length > max && ids.some((x) => blockIds.has(x))) warn(`ассет ${k}: ${ids.length} показов > ${max} (${ids.join(", ")})`);
}
// один ассет в соседних сценах
tl.scenes.forEach((s, i) => {
  const prev = tl.scenes[i - 1];
  if (blockIds.has(s.id) && prev && assetKeys(s).some((k) => assetKeys(prev).includes(k))) warn(`${t(s.from)} ${prev.id}–${s.id}: один ассет в соседних сценах`);
});
// три сцены одного типа подряд (хроника встык — нормальный монтаж, не считается)
tl.scenes.forEach((s, i) => {
  const [a, b] = [tl.scenes[i - 2], tl.scenes[i - 1]];
  if (blockIds.has(s.id) && a && b && a.type === s.type && b.type === s.type && !["videoClip", "black"].includes(s.type)) warn(`${t(s.from)} ${a.id}–${s.id}: три ${s.type} подряд`);
});

// файлы ассетов
const used = new Set<string>();
for (const s of scenes) {
  if ("asset" in s && s.asset) used.add(s.asset);
  if (s.type === "split") [s.left.asset, s.right.asset].forEach((a) => a && used.add(a));
}
for (const k of used) {
  const a = edit.assets[k];
  if (!a) warn(`нет ассета ${k} в assets`);
  else if (!existsSync(join(p.publicDir, a.src))) warn(`нет файла ${a.src} (ассет ${k})`);
  else if (!a.license || (!a.url && !OWN_LICENSE.test(a.license))) warn(`ассет ${k}: не заполнены license/url`);
}

// Тексты: лимит символов по размеру шрифта в сценах (оценка: ширина знака ≈ 0,55 кегля + трекинг)
const fit = (s: TimedScene, field: string, text: string | undefined, max: number) => {
  if (text && text.length > max) warn(`${t(s.from)} ${s.id}.${field}: ${text.length} знаков > ${max} — не влезет`);
};
// точки карты и вехи таймлайна с at: появляются внутри сцены
const inScene = (s: TimedScene, xs: { at?: string; from?: number }[]) => {
  for (const x of xs) if (x.from !== undefined && (x.from < 0 || x.from > s.duration - 15)) warn(`${t(s.from)} ${s.id}: at «${x.at}» вне сцены`);
};
for (const s of scenes) {
  switch (s.type) {
    case "archivePhoto":
    case "videoClip":
      fit(s, "caption", s.caption, 70);
      break;
    case "bigDate":
      fit(s, "text", s.text, 12);
      fit(s, "morphTo", s.morphTo, 12);
      fit(s, "sub", s.sub, 50);
      break;
    case "placeholder":
      fit(s, "label", s.label, 45);
      fit(s, "note", s.note, 90);
      break;
    case "timeline": {
      fit(s, "title", s.title, 50);
      const max = Math.floor(1500 / s.items.length / 17.5);
      s.items.forEach((it, i) => {
        fit(s, `items[${i}].label`, it.label, max);
        fit(s, `items[${i}].year`, it.year, 6);
      });
      inScene(s, s.items);
      break;
    }
    case "stat":
      fit(s, "label", s.label, 50);
      break;
    case "split":
      for (const [k, side] of [["left", s.left], ["right", s.right]] as const) {
        fit(s, `${k}.label`, side.label, 10);
        fit(s, `${k}.placeholder`, side.placeholder, 22);
      }
      break;
    case "titleCard":
      fit(s, "subtitle", s.subtitle, 45);
      break;
    case "map":
      s.points.forEach((pt, i) => fit(s, `points[${i}].name`, pt.name, 20));
      fit(s, "meridian.label", s.meridian?.label, 20);
      fit(s, "sweep.label", s.sweep?.label, 20);
      inScene(s, s.points);
      if (s.sweep) inScene(s, [{ at: s.sweep.at, from: s.sweep.from }, { at: s.sweep.until, from: s.sweep.to }]);
      if (s.sweep && s.sweep.from !== undefined && s.sweep.to !== undefined && s.sweep.to <= s.sweep.from) warn(`${t(s.from)} ${s.id}.sweep: until раньше at`);
      fit(s, "ring.label", s.ring?.label, 20);
      if (s.ring) inScene(s, [s.ring]);
      inScene(s, (s.routes ?? []).map((r) => ({ at: r.at, from: r.startFrame })));
      break;
    case "yearStrip":
      fit(s, "year", s.year, 12);
      fit(s, "title", s.title, 50);
      s.marks.forEach((m, i) => {
        fit(s, `marks[${i}].date`, m.date, 6);
        fit(s, `marks[${i}].label`, m.label, 16);
        if (m.month < 1 || m.month > 12) warn(`${t(s.from)} ${s.id}.marks[${i}].month вне 1–12`);
      });
      if (s.active !== undefined && !s.marks[s.active]) warn(`${t(s.from)} ${s.id}.active: нет отметки ${s.active}`);
      break;
    case "network": {
      fit(s, "title", s.title, 50);
      s.nodes.forEach((n, i) => {
        fit(s, `nodes[${i}].label`, n.label, 20);
        fit(s, `nodes[${i}].sub`, n.sub, 24);
      });
      const ids = new Set(s.nodes.map((n) => n.id));
      s.links.forEach((l) => [l.from, l.to].forEach((e) => ids.has(e) || warn(`${t(s.from)} ${s.id}: связь на неизвестный узел ${e}`)));
      break;
    }
    case "dotGrid":
      fit(s, "label", s.label, 50);
      fit(s, "fromLabel", s.fromLabel, 40);
      fit(s, "toLabel", s.toLabel, 40);
      if (s.total > 3000) warn(`${t(s.from)} ${s.id}.total ${s.total} > 3000 — точки станут пылью`);
      if ((s.keep ?? s.total) > s.total || (s.highlight ?? 0) > (s.keep ?? s.total)) warn(`${t(s.from)} ${s.id}: keep/highlight больше total`);
      break;
    case "quote":
      fit(s, "text", s.text, s.style === "engraving" ? 20 : 120);
      fit(s, "author", s.author, 50);
      fit(s, "note", s.note, s.style === "engraving" ? 50 : 90);
      break;
    case "terminal":
      fit(s, "title", s.title, 48);
      if (s.lines.length > 8) warn(`${t(s.from)} ${s.id}: ${s.lines.length} строк > 8 — не влезет`);
      s.lines.forEach((l, i) => fit(s, `lines[${i}]`, l, 48));
      break;
    case "callout":
      fit(s, "caption", s.caption, 70);
      fit(s, "label", s.label, 30);
      if (s.box.x < 0 || s.box.y < 0 || s.box.x + s.box.w > 100 || s.box.y + s.box.h > 100) warn(`${t(s.from)} ${s.id}.box выходит за снимок`);
      break;
    case "checklist":
      fit(s, "title", s.title, 50);
      fit(s, "note", s.note, 70);
      if (s.items.length > 6) warn(`${t(s.from)} ${s.id}: ${s.items.length} пунктов > 6 — не влезет`);
      s.items.forEach((it, i) => fit(s, `items[${i}]`, it, 44));
      break;
    case "nameGrid":
      fit(s, "title", s.title, 50);
      fit(s, "note", s.note, 70);
      if (s.names.length > 16) warn(`${t(s.from)} ${s.id}: ${s.names.length} названий > 16 — не влезет`);
      s.names.forEach((n, i) => fit(s, `names[${i}]`, n, s.names.length > 12 ? 16 : 22));
      (s.highlight ?? []).forEach((h) => s.names.includes(h) || warn(`${t(s.from)} ${s.id}.highlight: нет названия «${h}»`));
      break;
    case "priceRange":
      fit(s, "title", s.title, 50);
      fit(s, "note", s.note, 70);
      if (s.items.length > 4) warn(`${t(s.from)} ${s.id}: ${s.items.length} полос > 4 — не влезет`);
      s.items.forEach((it, i) => {
        fit(s, `items[${i}].label`, it.label, 14);
        if (it.from <= 0 || it.to < it.from) warn(`${t(s.from)} ${s.id}.items[${i}]: нужно 0 < from ≤ to`);
      });
      break;
    case "document":
      fit(s, "title", s.title, 24);
      fit(s, "stamp", s.stamp, 5);
      fit(s, "note", s.note, 70);
      if (s.fields.length > 5) warn(`${t(s.from)} ${s.id}: ${s.fields.length} полей > 5 — не влезет`);
      s.fields.forEach((f, i) => {
        fit(s, `fields[${i}].label`, f.label, 16);
        fit(s, `fields[${i}].value`, f.value, 24);
      });
      break;
  }
}
// плашки: SpeakerTag и подписка живут на одной высоте у левого края — не одновременно; подписка не на Split/заставке и не в конечной заставке YouTube
const ends = (o: { from: number; durationInFrames: number }) => o.from + o.durationInFrames;
for (const o of tl.overlays.filter((o) => inBlock(o.from))) {
  if (o.type === "speakerTag") {
    if (o.role.length > 30) warn(`${t(o.from)} ${o.id}.role длиннее 30 знаков`);
    for (const sc of tl.scenes) if (sc.type === "titleCard" && sc.from < ends(o) && o.from < sc.from + sc.duration) warn(`${t(o.from)} ${o.id} поверх заставки ${sc.id}`);
    continue;
  }
  const [l1, l2] = o.variant === "mid" ? [30, 30] : [28, 34];
  if (o.line1 && o.line1.length > l1) warn(`${t(o.from)} ${o.id}.line1 длиннее ${l1} знаков`);
  if (o.line2 && o.line2.length > l2) warn(`${t(o.from)} ${o.id}.line2 длиннее ${l2} знаков`);
  for (const x of tl.overlays) if (x !== o && x.from < ends(o) && o.from < ends(x)) warn(`${t(o.from)} ${o.id} одновременно с ${x.id}`);
  for (const sc of tl.scenes)
    if ((sc.type === "split" || sc.type === "titleCard") && sc.from < ends(o) && o.from < sc.from + sc.duration) warn(`${t(o.from)} ${o.id} поверх ${sc.id} ${sc.type} — плашка закроет подпись`);
  if (ends(o) > tl.durationInFrames - 20 * tl.fps) warn(`${t(o.from)} ${o.id} заходит в последние 20 с — там конечная заставка YouTube`);
  // колокольчик со звуком (~1,8 с) и кнопка должны успеть до fade плашки
  const bell = o.bellFrom ?? (o.variant === "mid" ? 40 : 100);
  const press = o.pressFrom ?? (o.variant === "mid" ? 0 : 70);
  if (bell < 0 || bell + 54 > o.durationInFrames) warn(`${t(o.from)} ${o.id}: колокольчик на ${(bell / tl.fps).toFixed(1)} с — звук обрежется, нужно ≥ 1,8 с до конца плашки`);
  if (o.variant === "end" && (press < 0 || press > bell)) warn(`${t(o.from)} ${o.id}: pressAt позже bellAt или до плашки — кнопка должна сработать до колокольчика`);
}

// заглушки — список того, что ещё найти или снять
const holes: string[] = [];
for (const s of scenes) {
  if (s.type === "placeholder") holes.push(`${t(s.from)} ${s.id} «${s.label}»${s.note ? ` — ${s.note}` : ""}`);
  if (s.type === "split") for (const side of [s.left, s.right]) if (!side.asset) holes.push(`${t(s.from)} ${s.id} split «${side.placeholder ?? side.label}»`);
}
if (holes.length) out.push(`заглушки (${holes.length}):`, ...holes.map((h) => `  ${h}`));

console.log(out.join("\n"));
