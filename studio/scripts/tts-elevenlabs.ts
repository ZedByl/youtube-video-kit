// Озвучка через ElevenLabs: одна реплика = один wav в public/episodes/<id>/voice/, как у заглушки.
// Перегенерируются только реплики, у которых изменился текст, голос или модель (manifest.json).
// Ответ API кэшируется в voice/elevenlabs/<id>.<hash>.mp3: повторный запуск и откат текста кредитов не тратят.
//   npm run tts:elevenlabs -- 001              озвучить изменённые реплики
//   npm run tts:elevenlabs -- 001 --dry        показать, что будет озвучено и сколько знаков
//   npm run tts:elevenlabs -- 001 --redo L301,L302   новый дубль (кэш этих реплик игнорируется)
//   npm run tts:elevenlabs -- 001 --block 0,1        только реплики этих блоков
// Ключ: ELEVENLABS_API_KEY в studio/.env. Голоса: edit.json → voices.<SPEAKER>.elevenlabs.
// gain — громкость голоса в dB, применяется при переводе в wav: кэш API не сбрасывается, кредиты не тратятся.
// Язык (language_code) — studio/channel.json → language.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { channel, episodeId, paths, readEdit, speakable, STUDIO } from "./lib";

const API = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_MODEL = "eleven_v4";
// mp3 192 kbps — с тарифа Creator, wav 44.1 кГц — с Pro
const FORMAT = process.env.ELEVENLABS_FORMAT ?? "mp3_44100_128";

const envFile = join(STUDIO, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const id = episodeId();
const args = process.argv.slice(3);
const dry = args.includes("--dry");
const list = (flag: string) => new Set(args.includes(flag) ? (args[args.indexOf(flag) + 1] ?? "").split(",").filter(Boolean) : []);
const redo = list("--redo");
const only = list("--block");

const edit = readEdit(id);
const { voiceDir } = paths(id);
const cacheDir = join(voiceDir, "elevenlabs");
mkdirSync(cacheDir, { recursive: true });

const missing = Object.entries(edit.voices).filter(([, v]) => !v.elevenlabs?.voiceId).map(([s]) => s);
if (missing.length) {
  console.error(`Нет voiceId ElevenLabs для: ${missing.join(", ")} (edit.json → voices.<SPEAKER>.elevenlabs.voiceId)`);
  process.exit(1);
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key && !dry) {
  console.error("Нет ELEVENLABS_API_KEY в studio/.env");
  process.exit(1);
}

const manifestFile = join(voiceDir, "manifest.json");
const manifest: Record<string, string> = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};

const tts = async (voiceId: string, body: object) => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/${voiceId}?output_format=${FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": key!, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    // 429 — лимит параллельных запросов или перегрузка: ждём и повторяем
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
};

const main = async () => {
  let made = 0;
  let chars = 0;
  for (const [i, line] of edit.lines.entries()) {
    const { voiceId, model = DEFAULT_MODEL, settings, gain = 0 } = edit.voices[line.speaker].elevenlabs!;
    const text = speakable(line.text);
    const hash = createHash("sha1").update(`elevenlabs|${voiceId}|${model}|${JSON.stringify(settings ?? {})}|${FORMAT}|${text}`).digest("hex").slice(0, 12);
    const wav = join(voiceDir, `${line.id}.wav`);
    if (only.size && !only.has(line.block ?? "")) continue;
    const stamp = gain ? `${hash}|${gain}dB` : hash;
    if (manifest[line.id] === stamp && existsSync(wav) && !redo.has(line.id)) continue;

    const mp3 = join(cacheDir, `${line.id}.${hash}.mp3`);
    const cached = existsSync(mp3) && !redo.has(line.id);
    if (!cached) chars += text.length;
    if (dry) {
      console.log(`${cached ? "♻️ " : "🎙"} ${line.id} ${line.speaker} (${text.length} зн.)`);
      continue;
    }

    if (!cached) {
      // соседние реплики — контекст для интонации, сами не озвучиваются и в хэш не входят
      const audio = await tts(voiceId, {
        text,
        model_id: model,
        voice_settings: settings,
        previous_text: edit.lines[i - 1] && speakable(edit.lines[i - 1].text),
        next_text: edit.lines[i + 1] && speakable(edit.lines[i + 1].text),
        ...(model.startsWith("eleven_multilingual") ? {} : { language_code: channel.language }),
      });
      writeFileSync(mp3, audio);
    }
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp3, ...(gain ? ["-af", `volume=${gain}dB`] : []), "-ar", "48000", "-ac", "1", wav]);
    manifest[line.id] = stamp;
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    made++;
    console.log(`${cached ? "♻️ " : "🎙"} ${line.id} ${line.speaker}`);
  }

  if (dry) console.log(`К озвучке через API: ${chars} знаков (1 знак ≈ 1 кредит)`);
  else console.log(made ? `Готово: ${made} реплик, через API ${chars} знаков` : "Все реплики актуальны");
};

main();
