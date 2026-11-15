// out/<id>.mp4 → out/<id>-final.mp4: громкость к −14 LUFS / −1 dBTP (норма YouTube), видео без перекодирования.
// Двухпроходный loudnorm: первый проход меряет, второй применяет линейно
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { episodeId, STUDIO } from "./lib";

const id = episodeId();
const input = join(STUDIO, "out", `${id}.mp4`);
const output = join(STUDIO, "out", `${id}-final.mp4`);
if (!existsSync(input)) {
  console.error(`Нет ${input}. Сначала: npm run render -- E${id} out/${id}.mp4`);
  process.exit(1);
}
const target = "I=-14:TP=-1:LRA=11";

// ffmpeg печатает замер JSON в stderr
const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]).stderr.toString();
const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));

const filter = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", input, "-c:v", "copy", "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "320k", output]);
console.log(`${id}-final.mp4: было ${m.input_i} LUFS, стало ≈ −14 LUFS`);
