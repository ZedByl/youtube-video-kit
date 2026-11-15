// Поиск фото на Wikimedia Commons с проверкой лицензии и локальной оценкой gemma4.
//   npm run find-assets -- "Portrait of F. A. Lange, 19th century" --cat "Category:Ferdinand_Adolph_Lange" [--q "Lange Uhrmacher Porträt"]
//   npm run find-assets -- --get "File:Ferdinand_Adolph_Lange.jpg" --ep 001 --key fa-lange-portrait
// Кандидаты: bdata scrape категории и/или bdata search по Commons. Лицензия и превью — прямо из Commons API
// (через bdata он закрыт: robots.txt). Вывод — короткий текст «что на фото», Claude выбирает без просмотра картинок
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { paths } from "./lib";
import { askJson, ollamaUp } from "./ollama";

const UA = { "User-Agent": "VideoKitStudio/0.1 (documentary research; Wikimedia Commons API)" };
const API = "https://commons.wikimedia.org/w/api.php";
const MAX_CANDIDATES = 15;
const FREE = /^(public domain|pd\b|cc0|cc by(-sa)? \d)/i;

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const want = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

type Info = { title: string; license: string; author: string; date: string; desc: string; page: string; thumb: string; original: string };

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const bdata = (a: string[]) => {
  try {
    return execFileSync("bdata", a, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    console.log(`bdata ${a[0]} не сработал (${a[1]})`);
    return "";
  }
};

const commonsInfo = async (titles: string[], width: number): Promise<Info[]> => {
  const out: Info[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const q = new URLSearchParams({ action: "query", format: "json", prop: "imageinfo", iiprop: "extmetadata|url", iiurlwidth: String(width), titles: titles.slice(i, i + 50).join("|") });
    const data = (await (await fetch(`${API}?${q}`, { headers: UA })).json()) as { query?: { pages: Record<string, { title: string; imageinfo?: { extmetadata: Record<string, { value: string }>; url: string; thumburl: string; descriptionurl: string }[] }> } };
    for (const p of Object.values(data.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata;
      out.push({
        title: p.title,
        license: strip(m.LicenseShortName?.value) || "?",
        author: strip(m.Artist?.value).slice(0, 60) || "?",
        date: strip(m.DateTimeOriginal?.value).slice(0, 20),
        desc: strip(m.ImageDescription?.value).slice(0, 120),
        page: ii.descriptionurl,
        thumb: ii.thumburl,
        original: ii.url,
      });
    }
  }
  return out;
};

// --- скачивание выбранного файла + готовая запись для assets ---
const get = async (title: string, ep: string, key: string) => {
  const [info] = await commonsInfo([title], 2560);
  if (!info) throw new Error(`Нет файла ${title}`);
  const ext = (/\.(jpe?g|png|tiff?)$/i.exec(info.thumb)?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
  const src = `img/${key}.${ext === "tif" || ext === "tiff" ? "jpg" : ext}`;
  const file = join(paths(ep).publicDir, src);
  mkdirSync(dirname(file), { recursive: true });
  // Wikimedia отвечает 429 при частых запросах — ждём и повторяем
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(info.thumb, { headers: UA });
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      break;
    }
    if (attempt === 4) throw new Error(`Не скачалось ${info.thumb}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  const asset = { src, title: info.desc || info.title.replace(/^File:/, ""), author: info.author, license: info.license, url: info.page, credit: /^(photo|foto)/i.test(info.author) ? info.author.replace(/^photo:/i, "Foto:") : `Foto: ${info.author}` };
  console.log(`Сохранено public/episodes/${ep}/${src}\n"${key}": ${JSON.stringify(asset)}`);
};

const search = async () => {
  if (!want) {
    console.error('Укажите, что нужно: npm run find-assets -- "<описание>" --cat "Category:…" [--q "запрос"]');
    process.exit(1);
  }
  const titles = new Set<string>();
  const cat = opt("--cat");
  if (cat) {
    const md = bdata(["scrape", `https://commons.wikimedia.org/wiki/${encodeURIComponent(cat.replace(/ /g, "_"))}`, "-f", "markdown"]);
    for (const m of md.matchAll(/File:[^\s)\]"]+?\.(?:jpe?g|png|tiff?)/gi)) titles.add(decodeURIComponent(m[0]).replace(/_/g, " "));
  }
  const query = opt("--q");
  if (query) {
    // поиск самого Commons по файлам — точнее Google, который находит в основном статьи
    const q = new URLSearchParams({ action: "query", format: "json", list: "search", srsearch: query, srnamespace: "6", srlimit: "20" });
    const found = (await (await fetch(`${API}?${q}`, { headers: UA })).json()) as { query?: { search: { title: string }[] } };
    for (const r of found.query?.search ?? []) if (/\.(jpe?g|png|tiff?)$/i.test(r.title)) titles.add(r.title);
    const raw = bdata(["search", `site:commons.wikimedia.org ${query}`, "--engine", "google", "--json"]);
    const res = (raw.includes("{") ? JSON.parse(raw.slice(raw.indexOf("{"))) : {}) as { organic?: { link: string }[] };
    for (const r of res.organic ?? []) {
      const m = /commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/.exec(r.link);
      if (m) titles.add(decodeURIComponent(m[1]).replace(/_/g, " "));
    }
  }
  if (!titles.size) {
    console.log("Кандидатов нет: уточните --cat или --q");
    return;
  }
  const all = await commonsInfo([...titles].slice(0, 50), 400);
  const free = all.filter((i) => FREE.test(i.license)).slice(0, MAX_CANDIDATES);
  const rejected = all.length - free.length;
  if (!(await ollamaUp())) {
    console.log("ollama не запущен — список без оценки:");
    free.forEach((i) => console.log(`- ${i.license} · ${i.author} · ${i.title} — ${i.desc}\n  ${i.page}`));
    return;
  }
  const rated: (Info & { score: number; shows: string })[] = [];
  for (const i of free) {
    const img = Buffer.from(await (await fetch(i.thumb, { headers: UA })).arrayBuffer()).toString("base64");
    // gemma4 иногда отдаёт оборванный JSON — такого кандидата показываем без оценки, а не роняем поиск
    const r = await askJson<{ shows: string; score: number }>(
      `Needed image: ${want}\nCandidate file name: ${i.title}\nDescribe what the image actually shows and rate how well it fits the needed image, 0 (unusable) to 5 (perfect). JSON: {"shows":"max 12 words","score":N}`,
      [img],
    ).catch(() => ({ shows: "оценка не удалась", score: 2 }));
    rated.push({ ...i, ...r });
  }
  const fits = rated.filter((r) => r.score > 1).sort((a, b) => b.score - a.score);
  const good = fits.slice(0, 8);
  console.log(`Кандидатов ${all.length}: не та лицензия ${rejected}, мимо темы ${rated.length - fits.length}, подходят ${fits.length}${fits.length > 8 ? " (показаны 8)" : ""}`);
  for (const r of good) console.log(`- ${r.score} · ${r.license} · ${r.author}${r.date ? ` · ${r.date}` : ""} · ${r.title}\n  на фото: ${r.shows}${r.desc ? ` | описание: ${r.desc}` : ""}`);
};

const fileArg = opt("--get");
if (fileArg) {
  const ep = opt("--ep");
  const key = opt("--key");
  if (!ep || !key) {
    console.error('npm run find-assets -- --get "File:…" --ep 001 --key имя-ассета');
    process.exit(1);
  }
  get(fileArg, ep, key);
} else search();
