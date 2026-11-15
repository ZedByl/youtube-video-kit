// timeline.json → subtitles-<lang>.srt (для загрузки в YouTube) + meta.md (главы и атрибуция для описания)
// + description-<lang>.txt и pinned-comment-<lang>.txt, если в эпизоде есть description.md.
// Язык и подписи (Chapters, IMAGE CREDITS…) — studio/channel.json → language, labels
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Timeline } from "../src/types";
import { channel, episodeId, OWN_LICENSE, paths, speakable } from "./lib";

const id = episodeId();
const { timeline: tlFile, episodeDir } = paths(id);
const tl: Timeline = JSON.parse(readFileSync(tlFile, "utf8"));
const lang = channel.language;
const L = channel.labels;
const MAX_LINE = 42; // символов в строке субтитра
const MAX_CUE = MAX_LINE * 2;

const srtTime = (f: number) => {
  const ms = Math.round((f / tl.fps) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`;
};

// Влезает ли титр в 2 строки по MAX_LINE (длинное слово может не дать разбить и 84 знака)
const fits = (s: string) => {
  if (s.length <= MAX_LINE) return true;
  if (s.length > MAX_CUE) return false;
  const words = s.split(" ");
  return words.some((_, i) => i > 0 && words.slice(0, i).join(" ").length <= MAX_LINE && words.slice(i).join(" ").length <= MAX_LINE);
};

// Режем реплику на титры ≤ 2 строк: по предложениям (порядковые «8.» не концы), внутри — по запятым и тире, затем по словам
const chunks = (text: string): string[] => {
  const out: string[] = [];
  for (const sentence of text.split(/(?<=[.!?…])(?<!\b\d{1,2}\.)\s+/)) {
    let cur = "";
    const push = (piece: string) => {
      if (fits(`${cur} ${piece}`.trim())) cur = `${cur} ${piece}`.trim();
      else {
        if (cur) out.push(cur);
        cur = piece;
      }
    };
    for (const clause of sentence.split(/(?<=[,;:])\s+|\s+(?=[–—])/)) {
      if (fits(clause)) push(clause);
      else {
        // длинную фразу — на равные куски, иначе жадная нарезка оставляет хвост из одного слова
        if (cur) out.push(cur);
        cur = "";
        const n = Math.ceil(clause.length / (MAX_CUE - 8));
        let piece = "";
        for (const w of clause.split(/\s+/)) {
          if (piece && ((piece + " " + w).length > clause.length / n + 4 || !fits(`${piece} ${w}`))) {
            out.push(piece);
            piece = w;
          } else piece = `${piece} ${w}`.trim();
        }
        cur = piece;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
};

const wrap = (chunk: string) => {
  if (chunk.length <= MAX_LINE) return chunk;
  const words = chunk.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    // перенос после знака препинания или перед тире читается легче, чем ровные по длине строки
    const punct = /[.,:;?!…]$/.test(words[i - 1]) || /^[–—]$/.test(words[i]);
    const diff = Math.abs(a - (chunk.length - a)) - (punct ? 12 : 0);
    if (diff < bestDiff && a <= MAX_LINE && chunk.length - a - 1 <= MAX_LINE) [best, bestDiff] = [i, diff];
  }
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
};

const MIN_CUE = Math.round(tl.fps * 1);
const cues: { from: number; to: number; text: string }[] = [];
for (const l of tl.lines) {
  const parts = chunks(speakable(l.text));
  const total = parts.reduce((s, p) => s + p.length, 0);
  // фразу короче секунды — в один титр с соседней из той же реплики, если влезает
  for (let i = 0; i < parts.length; i++) {
    if ((parts[i].length / total) * l.duration >= MIN_CUE) continue;
    const j = i + 1 < parts.length && fits(`${parts[i]} ${parts[i + 1]}`) ? i + 1 : i > 0 && fits(`${parts[i - 1]} ${parts[i]}`) ? i - 1 : -1;
    if (j < 0) continue;
    const a = Math.min(i, j);
    parts.splice(a, 2, `${parts[a]} ${parts[a + 1]}`);
    i = a - 1;
  }
  let f = l.from;
  for (const p of parts) {
    const d = Math.round((p.length / total) * l.duration);
    cues.push({ from: f, to: f + d, text: wrap(p) });
    f += d;
  }
}
// короткий титр не успеть прочесть: держим ≥ 1 с — до начала следующего,
// а если тот начинается вплотную и сам длинный, сдвигаем его начало (следующий остаётся ≥ 1,5 с)
cues.forEach((c, i) => {
  const next = cues[i + 1];
  const want = c.from + MIN_CUE;
  if (next && next.from < want) next.from = Math.max(next.from, Math.min(want, next.to - Math.round(tl.fps * 1.5)));
  c.to = Math.max(c.to, Math.min(want, next?.from ?? Infinity));
});
writeFileSync(
  join(episodeDir, `subtitles-${lang}.srt`),
  cues.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join("\n"),
);

// Главы: YouTube требует первую главу на 0:00
const mmss = (f: number) => {
  const s = Math.floor(f / tl.fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const chapters = tl.chapters.map((c, i) => `${i === 0 ? "0:00" : mmss(c.from)} ${c.title}`);

// Атрибуция: только реально использованные ассеты, кроме своих и заглушек
const used = new Set<string>();
for (const s of tl.scenes) {
  if ("asset" in s && s.asset) used.add(s.asset);
  if (s.type === "split") [s.left.asset, s.right.asset].forEach((a) => a && used.add(a));
}
for (const c of [...tl.music, ...tl.sfx]) used.add(c.asset);
const hasMap = tl.scenes.some((s) => s.type === "map");
// один файл под разными ключами пула — одна строка
const creditAssets = [...used]
  .map((k) => tl.assets[k])
  .filter((a) => a && !OWN_LICENSE.test(a.license))
  .filter((a, i, all) => all.findIndex((b) => (b.url ?? b.src) === (a.url ?? a.src)) === i);
const isPD = (l: string) => /^(public domain|pd\b)/i.test(l);
// Commons отдаёт неизвестного автора как «Unknown», «UnknownUnknown», «Unknown authorUnknown author»
const anonymous = (s: string) => /^(unknown( author)?)+$|^none named|^unbekannt$|^неизвест/i.test(s.trim());
const credits = creditAssets.map((a) => `- ${a.title}${a.author ? ` – ${a.author}` : ""} – ${a.license}${a.url ? ` – ${a.url}` : ""}`);

const meta = [
  `# Метаданные ${tl.id}: главы и атрибуция`,
  "",
  `Сгенерировано из timeline.json (${tl.generatedAt}). Скопировать в описание видео.`,
  "",
  `## ${L.chapters}`,
  "",
  ...chapters,
  "",
  `## ${L.credits}`,
  "",
  ...credits,
  ...(hasMap ? ["", L.mapCredit] : []),
  "",
].join("\n");
writeFileSync(join(episodeDir, "meta.md"), meta);
console.log(`subtitles-${lang}.srt: ${cues.length} титров; meta.md: ${chapters.length} глав, ${credits.length} атрибуций`);

// Описание для YouTube: ручные секции из description.md + главы + атрибуция по лицензиям; построчная — в закреплённый комментарий
const descFile = join(episodeDir, "description.md");
if (!existsSync(descFile)) process.exit(0);
const sections: Record<string, string> = {};
for (const part of readFileSync(descFile, "utf8").replace(/<!--[\s\S]*?-->/g, "").split(/^## /m).slice(1)) {
  const [name, ...body] = part.split("\n");
  sections[name.trim()] = body.join("\n").trim();
}

// «CC BY-SA 4.0» → https://creativecommons.org/licenses/by-sa/4.0/
const licenseUrl = (l: string) => {
  if (l === "CC0") return "https://creativecommons.org/publicdomain/zero/1.0/";
  const m = l.match(/^CC (BY(?:-SA|-ND|-NC)*) (\d\.\d)(?: (\w\w))?$/);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/${m[3] ? `${m[3]}/` : ""}` : undefined;
};
const byLicense = new Map<string, Set<string>>();
for (const a of creditAssets) {
  const label = isPD(a.license) ? L.publicDomain : a.license;
  if (!byLicense.has(label)) byLicense.set(label, new Set());
  const author = a.author ?? "";
  if (author && !(anonymous(author) && label === L.publicDomain)) byLicense.get(label)!.add(author);
}
const order = (l: string) => (l === L.publicDomain ? 2 : l === "CC0" ? 1 : 0);
const licenses = [...byLicense.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
const RULE = "━━━━━━━━━━━━━━━";

const description = [
  sections.intro,
  "",
  RULE,
  ...chapters,
  RULE,
  "",
  sections.sources,
  "",
  sections.hashtags,
  "",
  L.credits,
  "",
  ...licenses.map((l) => `${[...byLicense.get(l)!].join(" · ") || "—"} — ${l}`),
  ...(hasMap ? [L.mapCredit] : []),
  "",
  ...licenses.map(licenseUrl).filter(Boolean),
  "",
  L.creditsInComment,
  "",
].join("\n");

// закреплённый комментарий: построчная атрибуция без ссылок (комментарий с десятками URL YouTube может не опубликовать) —
// источник текстом, по которому файл находится (Commons: имя файла); подпись укорачивается, пока не влезет в 10 000
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")}…` : s);
const sourceRef = (url: string) => {
  const commons = url.match(/commons\.wikimedia\.org\/wiki\/File:(.+)$/);
  if (commons) return `Commons: ${decodeURIComponent(commons[1]).replace(/_/g, " ")}`;
  const pexels = url.match(/pexels\.com\/(video|photo)\/(?:[^/]*-)?(\d+)/);
  if (pexels) return `Pexels ${pexels[1]} ${pexels[2]}`;
  return url.replace(/^https?:\/\/(www\.)?/, "");
};
const pinnedCredits = (max: number) =>
  creditAssets.map((a) => {
    const src = a.url && !isPD(a.license) ? ` – ${sourceRef(a.url)}` : "";
    const license = isPD(a.license) ? L.publicDomain : a.license;
    return `- ${clip(a.title, max)}${a.author && !anonymous(a.author) ? ` – ${a.author}` : ""} – ${license}${src}`;
  });
const pinnedWith = (max: number) => [sections.pinned, "", L.creditsInCommentHeader, "", ...pinnedCredits(max), ""].join("\n");
const pinnedVariants = [80, 60, 45].map(pinnedWith);
const pinned = pinnedVariants.find((x) => x.length <= 10000) ?? pinnedVariants.at(-1)!;

writeFileSync(join(episodeDir, `description-${lang}.txt`), description);
writeFileSync(join(episodeDir, `pinned-comment-${lang}.txt`), pinned);
// лимиты YouTube: описание 5 000 символов, комментарий 10 000
const warn = (n: number, max: number) => (n > max ? ` — больше лимита ${max}!` : "");
console.log(`description-${lang}.txt: ${description.length} символов${warn(description.length, 5000)}; pinned-comment-${lang}.txt: ${pinned.length}${warn(pinned.length, 10000)}`);
