// Общее для render:block и qa: границы блока и пути его файлов в out/
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TimedBlock, Timeline } from "../src/types";
import { paths, STUDIO } from "./lib";

export const loadBlock = (id: string, blockId: string | undefined) => {
  const tl: Timeline = JSON.parse(readFileSync(paths(id).timeline, "utf8"));
  const block = tl.blocks.find((b) => b.id === blockId);
  if (!block) {
    console.error(`Укажите блок: npm run <script> -- ${id} <блок>. Есть: ${tl.blocks.map((b) => b.id).join(", ")}`);
    process.exit(1);
  }
  const out = join(STUDIO, "out");
  return {
    tl,
    block,
    video: join(out, `${id}-b${block.id}.mp4`),
    framesDir: join(out, `${id}-b${block.id}`),
    sheet: join(out, `${id}-b${block.id}-sheet.jpg`),
    report: join(out, `${id}-b${block.id}-qa.md`),
  };
};

// сцены, которые видны в блоке (в том числе начатая в предыдущем)
export const blockScenes = (tl: Timeline, b: TimedBlock) => tl.scenes.filter((s) => s.from < b.to && s.from + s.duration > b.from);
