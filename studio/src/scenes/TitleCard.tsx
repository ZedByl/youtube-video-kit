import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { channel, colors, space, stroke, text } from "../theme";
import { Grain, Vignette } from "./common";

// Заставка канала: акцентная линия прорисовывается из центра, над ней проявляется имя канала (studio/channel.json → name).
// Нейтральный шаблон — замените своим логотипом и анимацией. Рисуется ~2 с, дальше держится: дать доиграть ~4 с без речи (pauseBefore)
export const TitleCard: React.FC<{ subtitle?: string }> = ({ subtitle }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const line = interpolate(frame, [0, fps * 1.2], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const word = interpolate(frame, [fps * 0.8, fps * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - fps * 0.6, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", opacity: out }}>
      <div
        style={{
          ...text.titleWordmark,
          letterSpacing: interpolate(word, [0, 1], [40, 18]),
          color: colors.text,
          opacity: word,
          textTransform: "uppercase",
        }}
      >
        {channel.name}
      </div>
      <div style={{ width: 520 * line, height: stroke.accent, backgroundColor: colors.accent, marginTop: 36 }} />
      {subtitle ? (
        <div style={{ ...text.titleSubtitle, color: colors.accent, marginTop: space.stack * 2, opacity: word * 0.9, textTransform: "uppercase" }}>
          {subtitle}
        </div>
      ) : null}
      <Vignette strength={0.45} />
      <Grain />
    </AbsoluteFill>
  );
};
