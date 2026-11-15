import React, { useEffect, useRef } from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import type { TimedCue, Timeline } from "../types";

// Расстояние в кадрах от кадра f до ближайшей речи (0 — внутри реплики)
const distanceToSpeech = (f: number, speech: [number, number][]) => {
  let d = Infinity;
  for (const [a, b] of speech) {
    if (f >= a && f <= b) return 0;
    d = Math.min(d, Math.abs(f - a), Math.abs(f - b));
  }
  return d;
};

const cueVolume = (cue: TimedCue, local: number, fps: number, speech: [number, number][]) => {
  const base = cue.volume ?? 1;
  const fadeIn = Math.max(1, (cue.fadeIn ?? 0) * fps);
  const fadeOut = Math.max(1, (cue.fadeOut ?? 0) * fps);
  const envelope = Math.min(
    interpolate(local, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(local, [cue.duration - fadeOut, cue.duration], [1, 0], { extrapolateLeft: "clamp" }),
  );
  if (cue.duck === undefined) return base * envelope;
  // Автодакинг: музыка плавно уходит вниз за ~0.4 с до реплики и возвращается после
  const ramp = fps * 0.4;
  const k = interpolate(distanceToSpeech(cue.from + local, speech), [0, ramp], [0, 1], { extrapolateRight: "clamp" });
  return (cue.duck + (base - cue.duck) * k) * envelope;
};

// Звук, обрезанный раньше конца файла. В превью Studio Remotion отдаёт <audio> из общих тегов и при выходе из Sequence
// не ставит его на паузу — хвост файла продолжал играть (тиканье и эфир после стоп-кадра в 002). Паузим сами при размонтировании.
// loop Remotion оборачивает в свой <Loop> без ref, поэтому повтор делает Mix: по Sequence на круг, offset — начало круга в кадрах cue
const CueAudio: React.FC<{ cue: TimedCue; fps: number; speech: [number, number][]; offset?: number }> = ({ cue: c, fps, speech, offset = 0 }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    return () => el?.pause();
  }, []);
  return (
    <Audio
      ref={ref}
      src={staticFile(c.src)}
      {...(c.trimBefore ? { trimBefore: Math.round(c.trimBefore * fps) } : {})}
      volume={(f) => cueVolume(c, f + offset, fps, speech)}
    />
  );
};

export const Mix: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const { fps, speech } = timeline;
  return (
    <>
      {timeline.lines.filter((l) => l.file).map((l) => (
        <Sequence key={l.id} from={l.from} durationInFrames={l.duration} name={`🎙 ${l.id} ${l.speaker}`} layout="none">
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
      {[...timeline.music, ...timeline.sfx].map((c) => (
        <Sequence key={c.id} from={c.from} durationInFrames={c.duration} name={`♪ ${c.id}`} layout="none">
          {c.loop && c.fileFrames ? (
            Array.from({ length: Math.ceil(c.duration / c.fileFrames) }).map((_, i) => (
              <Sequence key={i} from={i * c.fileFrames!} durationInFrames={Math.min(c.fileFrames!, c.duration - i * c.fileFrames!)} layout="none">
                <CueAudio cue={c} fps={fps} speech={speech} offset={i * c.fileFrames!} />
              </Sequence>
            ))
          ) : (
            <CueAudio cue={c} fps={fps} speech={speech} />
          )}
        </Sequence>
      ))}
    </>
  );
};
