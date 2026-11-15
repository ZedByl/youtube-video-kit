// Звуки плашки подписки: синтез без чужих сэмплов → public/fx/cta-bell.wav, cta-click.wav.
// bell — мягкий удар маленького акцентного колокольчика, как гонг репетира: тик спуска + тон 784 Гц с обертонами колокола, затухание ~1,5 с.
// Играет на качании колокольчика в mid и end. click — нажатие кнопки хронографа: щелчок и тихий отпуск через 70 мс, только в end.
// Уровни заложены в файлы: колокольчик −20 dBFS, щелчок −26 dBFS — тише речи (−18 dB в среднем), громкость плашки — overlay.sound
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STUDIO } from "./lib";

const RATE = 48000;
const db = (x: number) => Math.pow(10, x / 20);

// детерминированный шум, чтобы файл не менялся от запуска к запуску
let seed = 1;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x3fffffff - 1;
};

// полосовой biquad (RBJ), постоянное усиление в пике
const bandpass = (xs: Float64Array, f: number, q: number) => {
  const w = (2 * Math.PI * f) / RATE;
  const a = Math.sin(w) / (2 * q);
  const [b0, b2, a0, a1, a2] = [a, -a, 1 + a, -2 * Math.cos(w), 1 - a];
  const out = new Float64Array(xs.length);
  let [x1, x2, y1, y2] = [0, 0, 0, 0];
  for (let i = 0; i < xs.length; i++) {
    const y = (b0 * xs[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    [x2, x1, y2, y1] = [x1, xs[i], y1, y];
    out[i] = y;
  }
  return out;
};

// короткий механический щелчок: шумовой импульс через резонанс корпуса
const click = (len: number, f: number, decay: number) => {
  const xs = new Float64Array(len);
  for (let i = 0; i < len; i++) xs[i] = noise() * Math.exp(-i / RATE / decay);
  return bandpass(xs, f, 6);
};

const normalize = (xs: Float64Array, peakDb: number) => {
  const peak = xs.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  return xs.map((x) => (x / peak) * db(peakDb));
};

const mix = (into: Float64Array, xs: Float64Array, at: number, gain = 1) => {
  for (let i = 0; i < xs.length && at + i < into.length; i++) into[at + i] += xs[i] * gain;
};

const bell = () => {
  const n = Math.round(RATE * 1.8);
  const xs = new Float64Array(n);
  // обертоны маленького колокола: [отношение, амплитуда, затухание в с]; пара у основного тона — медленные биения
  const partials = [
    [1, 1, 0.75],
    [1.0035, 0.45, 0.8],
    [2.0, 0.28, 0.45],
    [2.76, 0.2, 0.3],
    [4.07, 0.08, 0.16],
    [5.4, 0.05, 0.1],
  ];
  const f0 = 784;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    let v = 0;
    for (const [r, a, tau] of partials) v += a * Math.exp(-t / tau) * Math.sin(2 * Math.PI * f0 * r * t);
    const tail = Math.min(1, (n - i) / (RATE * 0.15));
    xs[i] = v * attack * attack * tail;
  }
  mix(xs, click(Math.round(RATE * 0.02), 3800, 0.003), 0, 0.5); // тик спуска в момент удара
  return normalize(xs, -20);
};

const press = () => {
  const xs = new Float64Array(Math.round(RATE * 0.25));
  mix(xs, click(Math.round(RATE * 0.03), 2400, 0.004), 0);
  mix(xs, click(Math.round(RATE * 0.03), 5200, 0.002), 0, 0.4);
  mix(xs, click(Math.round(RATE * 0.02), 3000, 0.003), Math.round(RATE * 0.07), 0.35); // отпуск кнопки
  return normalize(xs, -26);
};

// WAV 48 кГц, 16 бит, моно
const wav = (xs: Float64Array) => {
  const buf = Buffer.alloc(44 + xs.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + xs.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(xs.length * 2, 40);
  xs.forEach((x, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), 44 + i * 2));
  return buf;
};

const dir = join(STUDIO, "public/fx");
mkdirSync(dir, { recursive: true });
for (const [name, xs] of [
  ["cta-bell", bell()],
  ["cta-click", press()],
] as const) {
  writeFileSync(join(dir, `${name}.wav`), wav(xs));
  console.log(`public/fx/${name}.wav — ${(xs.length / RATE).toFixed(2)} с`);
}
