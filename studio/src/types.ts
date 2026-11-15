// Модель данных студии.
// edit.json и blocks/*.json пишет Claude (монтажные решения), timeline.json генерирует scripts/build-timeline.ts.

// Имя голоса из сценария: "HOST", "ANNA", "MAX"… Голоса описаны в edit.json → voices
export type Speaker = string;

export type Asset = {
  src: string; // путь внутри public/episodes/<id>/
  title: string;
  author?: string;
  license: string; // "CC0", "Public domain", "CC BY-SA 4.0", "own" (своя съёмка), "placeholder"…
  url?: string; // страница источника
  credit?: string; // короткая подпись для кадра, например "Photo: Library of Congress"
};

export type Line = {
  id: string;
  speaker: Speaker;
  text: string;
  pauseAfter?: number; // секунды тишины после реплики, по умолчанию settings.gap
  pauseBefore?: number; // доп. секунды перед репликой — дать доиграть заставке или сцене без речи
  block?: string; // номер блока сценария; проставляет readEdit
};

// Якорь: "L03" — начало реплики, "L03:end" — конец реплики, "L03+1.5" — сдвиг в секундах.
export type Anchor = string;

export type Transition = "fade" | "cut" | "dip";

export type SceneSpec =
  | { type: "black" }
  | { type: "archivePhoto"; asset: string; move?: KenBurns; caption?: string; tone?: "sepia" | "mono" | "none"; fit?: "cover" | "contain" }
  | { type: "split"; left: SplitSide; right: SplitSide }
  | { type: "bigDate"; text: string; sub?: string; morphTo?: string; morphAt?: number }
  | { type: "map"; view: MapView; points: MapPoint[]; routes?: MapRoute[]; highlight?: string[]; active?: string[]; meridian?: MapMeridian; sweep?: MapSweep; ring?: MapRing }
  | { type: "timeline"; title?: string; items: TimelineItem[] }
  | { type: "stat"; from: number; to: number; prefix?: string; suffix?: string; label: string; fromLabel?: string; toLabel?: string }
  | { type: "videoClip"; asset: string; trimBefore?: number; playbackRate?: number; zoom?: number; caption?: string }
  | { type: "titleCard"; subtitle?: string }
  | { type: "yearStrip"; year: string; title?: string; marks: YearMark[]; active?: number }
  | { type: "network"; title?: string; nodes: NetNode[]; links: NetLink[]; shown?: number }
  | { type: "dotGrid"; total: number; keep?: number; highlight?: number; label: string; fromLabel?: string; toLabel?: string }
  | { type: "quote"; text: string; author?: string; note?: string; style?: "quote" | "engraving" }
  | { type: "terminal"; title?: string; lines: string[] }
  | { type: "callout"; asset: string; box: CalloutBox; label?: string; caption?: string; tone?: "sepia" | "mono" | "none" }
  | { type: "checklist"; title?: string; items: string[]; mark?: "check" | "warn"; note?: string }
  | { type: "nameGrid"; title?: string; names: string[]; highlight?: string[]; note?: string }
  | { type: "priceRange"; title?: string; items: PriceItem[]; unit?: string; note?: string; shown?: number }
  | { type: "document"; title: string; fields: DocField[]; stamp?: string; note?: string }
  | { type: "placeholder"; label: string; note?: string; mood?: "ruins" | "macro" | "archive" };

// fromPosY/toPosY — панорама по высокому кадру (object-position Y в %, 0 — верх снимка); только для fit: cover
export type KenBurns = { fromScale?: number; toScale?: number; fromX?: number; toX?: number; fromY?: number; toY?: number; fromPosY?: number; toPosY?: number; end?: number };
export type SplitSide = { asset?: string; placeholder?: string; label: string };
export type MapView = { center: [number, number]; scale: number; toCenter?: [number, number]; toScale?: number };
// at — когда точка появляется (якорь); from — то же в кадрах от начала сцены, проставляет build-timeline
export type MapPoint = { name: string; coord: [number, number]; primary?: boolean; labelSide?: "left" | "right" | "top" | "bottom"; at?: Anchor; from?: number };
// at — когда маршрут начинает рисоваться (якорь); startFrame — то же в кадрах сцены, проставляет build-timeline (from/to здесь — координаты)
export type MapRoute = { from: [number, number]; to: [number, number]; label?: string; at?: Anchor; startFrame?: number };
// ring — радиус вокруг coord (зона охвата, радиус поражения, дальность сигнала); at/from — как у MapPoint
export type MapRing = { coord: [number, number]; km: number; label?: string; at?: Anchor; from?: number };
export type MapMeridian = { lon: number; label?: string }; // прямая линия долготы через всю карту
// линия долготы бежит с fromLon на toLon; at/until — якоря начала и конца, from/to — то же в кадрах сцены (build-timeline).
// minutes — счётчик «+N min» (4 мин на градус — солнечное время); точки, через которые прошла линия, вспыхивают акцентом
export type MapSweep = { fromLon: number; toLon: number; at?: Anchor; until?: Anchor; from?: number; to?: number; label?: string; minutes?: boolean };
export type TimelineItem = { year: string; label: string; at?: Anchor; from?: number }; // at/from — как у MapPoint
export type YearMark = { month: number; date: string; label: string }; // month 1–12
export type NetNode = { id: string; label: string; sub?: string; x: number; y: number; primary?: boolean }; // x/y в % кадра, центр карточки
export type NetLink = { from: string; to: string; dashed?: boolean };
export type PriceItem = { label: string; from: number; to: number; primary?: boolean };
export type DocField = { label: string; value?: string; mark?: boolean }; // mark — обвести поле
export type CalloutBox = { x: number; y: number; w: number; h: number }; // в % исходного снимка, от левого верхнего угла

export type Scene = SceneSpec & {
  id: string;
  at: Anchor;
  transition?: Transition; // как сцена появляется
};

// Плашка подписки: mid — тихое напоминание в середине, end — CTA с кнопкой под финальной репликой.
// Тексты по умолчанию — studio/channel.json → subscribe; pressAt (end) — кнопка заливается, bellAt — колокольчик качается
export type SubscribeProps = {
  variant: "mid" | "end";
  line1?: string;
  line2?: string;
  button?: string;
  buttonDone?: string;
  panel?: "bg" | "deep" | "none"; // deep — на светлых кадрах, none — текст с тенью по кадру
  sound?: number; // громкость звука плашки (колокольчик, у end — щелчок кнопки), 1 по умолчанию, 0 — без звука
};
export type OverlaySpec =
  | { type: "speakerTag"; speaker: Speaker; role: string }
  | ({ type: "subscribe"; pressAt?: Anchor; bellAt?: Anchor } & SubscribeProps);
export type Overlay = OverlaySpec & { id: string; at: Anchor; duration: number };

export type AudioCue = {
  id: string;
  asset: string;
  at: Anchor;
  until?: Anchor; // по умолчанию до конца видео
  volume?: number; // базовая громкость
  duck?: number; // громкость под речью (только для музыки)
  loop?: boolean;
  trimBefore?: number; // секунды, отрезанные от начала файла
  fadeIn?: number; // секунды
  fadeOut?: number;
};

export type Chapter = { at: Anchor; title: string };

// Блок сценария: с какой реплики начинается
export type BlockInfo = { id: string; title: string; start: string };

// episodes/<id>/blocks/NN-slug.json — монтаж одного блока. Склеивается с edit.json в readEdit
export type EditBlock = {
  block: { id: string; title: string };
  status?: string;
  assets?: Record<string, Asset>;
  lines: Line[];
  scenes: Scene[];
  overlays?: Overlay[];
  music?: AudioCue[];
  sfx?: AudioCue[];
  chapters?: Chapter[];
};

// settings — voice_settings API: stability, similarity_boost, style, use_speaker_boost, speed; gain — громкость в dB
export type ElevenLabsVoice = { voiceId: string; model?: string; settings?: Record<string, number | boolean>; gain?: number };

export type Edit = {
  id: string;
  title: string;
  status: string;
  settings: { fps: number; width: number; height: number; leadIn: number; gap: number; tail: number; transitionFrames: number };
  // placeholder.voice — голос macOS `say` (say -v '?' — список), rate — слов в минуту
  voices: Record<Speaker, { placeholder: { voice: string; rate: number }; elevenlabs?: ElevenLabsVoice }>;
  blocks?: BlockInfo[]; // блоки, реплики которых лежат прямо в edit.json
  hero?: string[]; // ассеты-герои видео: до 3 показов (остальные — до 2), каждый раз в новой подаче
  assets: Record<string, Asset>;
  lines: Line[];
  scenes: Scene[];
  overlays: Overlay[];
  music: AudioCue[];
  sfx: AudioCue[];
  chapters: Chapter[];
};

// ---- timeline.json ----

// file — путь к озвучке в public/; пустой, если озвучки ещё нет (длительность оценена, звук не играет)
export type TimedLine = Line & { from: number; duration: number; file: string };
export type TimedScene = Scene & { from: number; duration: number; block?: string };
export type TimedBlock = { id: string; title: string; from: number; to: number };
// pressFrom/bellFrom — кадры от начала плашки
export type TimedOverlay = Overlay & { from: number; durationInFrames: number; pressFrom?: number; bellFrom?: number };
// fileFrames — длина файла в кадрах (для loop: Mix повторяет файл сам, см. CueAudio)
export type TimedCue = Omit<AudioCue, "at" | "until"> & { from: number; duration: number; src: string; fileFrames?: number };

export type Timeline = {
  id: string;
  title: string;
  generatedAt: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  transitionFrames: number;
  assets: Record<string, Asset>;
  lines: TimedLine[];
  scenes: TimedScene[];
  overlays: TimedOverlay[];
  music: TimedCue[];
  sfx: TimedCue[];
  chapters: { from: number; title: string }[];
  blocks: TimedBlock[];
  speech: [number, number][]; // интервалы речи в кадрах — для дакинга музыки
};
