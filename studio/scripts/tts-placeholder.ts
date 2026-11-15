// Голоса-заглушки через macOS `say`: одна реплика = один wav в public/episodes/<id>/voice/.
// Перегенерируются только реплики, у которых изменился текст или голос (manifest.json).
// Только macOS (команда say). Боевой голос — tts:elevenlabs, формат файлов тот же.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { episodeId, paths, readEdit, speakable } from "./lib";

const id = episodeId();
const edit = readEdit(id);
const { voiceDir } = paths(id);
mkdirSync(voiceDir, { recursive: true });

const manifestFile = join(voiceDir, "manifest.json");
const manifest: Record<string, string> = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};

let made = 0;
for (const line of edit.lines) {
  const { voice, rate } = edit.voices[line.speaker].placeholder;
  const text = speakable(line.text);
  const hash = createHash("sha1").update(`${voice}|${rate}|${text}`).digest("hex").slice(0, 12);
  const wav = join(voiceDir, `${line.id}.wav`);
  if (manifest[line.id] === hash && existsSync(wav)) continue;

  const aiff = join(voiceDir, `${line.id}.aiff`);
  execFileSync("say", ["-v", voice, "-r", String(rate), "-o", aiff, text]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", aiff, "-ar", "48000", "-ac", "1", wav]);
  rmSync(aiff);
  manifest[line.id] = hash;
  made++;
  console.log(`🎙 ${line.id} ${line.speaker} (${voice})`);
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
console.log(made ? `Готово: ${made} реплик озвучено заново` : "Все реплики актуальны");
