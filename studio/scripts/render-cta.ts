// Вставки «подписка» для любого ролика: npm run render:cta -- [mid|end] [--props '{"line1":"…"}' --name suffix]
// Композиции CTA-Mid / CTA-End (src/scenes/Subscribe.tsx) → PNG с альфой → ../assets/cta/cta-<variant>[-suffix].mov (ProRes 4444) и .webm (VP9 с альфой).
// ProRes — для Premiere / Resolve / Final Cut, WebM — лёгкий, для браузерных монтажек. Кадр 1920×1080, 30 fps, фон прозрачный.
// Звук плашки (колокольчик, у end — щелчок кнопки) вшит дорожкой: PCM в .mov, Opus в .webm; без звука — --props '{"sound":0}'
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { STUDIO } from "./lib";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const props = opt("props");
const suffix = opt("name");
const picked = (["mid", "end"] as const).filter((v) => args.includes(v));
const variants = picked.length ? picked : (["mid", "end"] as const);

const outDir = resolve(STUDIO, "../assets/cta");
mkdirSync(outDir, { recursive: true });
const mb = (f: string) => `${(statSync(f).size / 1e6).toFixed(1)} МБ`;

for (const v of variants) {
  const id = v === "mid" ? "CTA-Mid" : "CTA-End";
  const name = `cta-${v}${suffix ? `-${suffix}` : ""}`;
  const frames = join(STUDIO, "out", name);
  rmSync(frames, { recursive: true, force: true });
  console.log(`${id} → PNG…`);
  // секвенция PNG: глобальные h264/crf из remotion.config.ts к ней не применяются, альфа сохраняется
  const r = spawnSync("npx", ["remotion", "render", id, frames, "--sequence", "--image-format=png", "--log=error", ...(props ? [`--props=${props}`] : [])], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr.split("\n").slice(-15).join("\n"));
    process.exit(1);
  }
  const wav = `${frames}.wav`;
  const a = spawnSync("npx", ["remotion", "render", id, wav, "--codec=wav", "--log=error", ...(props ? [`--props=${props}`] : [])], { cwd: STUDIO, encoding: "utf8" });
  if (a.status !== 0) {
    console.error(a.stderr.split("\n").slice(-15).join("\n"));
    process.exit(1);
  }
  const input = ["-y", "-v", "error", "-framerate", "30", "-pattern_type", "glob", "-i", join(frames, "*.png"), "-i", wav, "-shortest"];
  const mov = join(outDir, `${name}.mov`);
  const webm = join(outDir, `${name}.webm`);
  execFileSync("ffmpeg", [...input, "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-alpha_bits", "16", "-vendor", "apl0", "-c:a", "pcm_s16le", mov]);
  execFileSync("ffmpeg", [...input, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24", "-auto-alt-ref", "0", "-c:a", "libopus", "-b:a", "96k", webm]);
  console.log(`  ${mov} (${mb(mov)})\n  ${webm} (${mb(webm)})`);
}
