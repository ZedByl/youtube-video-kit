import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity, shadow, stroke, text } from "../theme";
import { Grain, Vignette } from "./common";

// Таблички с названиями, как на доске у входа: появляются по очереди за первые 55% сцены,
// потом выделенные (highlight) загораются акцентным цветом, остальные приглушаются. Логотипы не используем — только набор
export const NameGrid: React.FC<{ title?: string; names: string[]; highlight?: string[]; note?: string }> = ({ title, names, highlight = [], note }) => {
  const frame = useCurrentFrame();
  const { width, durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const cols = names.length <= 4 ? 2 : names.length <= 12 ? 3 : 4;
  const gap = 28;
  const cardW = Math.min(520, (width - 260 - gap * (cols - 1)) / cols);
  const step = (durationInFrames * 0.55) / names.length;
  const mark = interpolate(frame, [durationInFrames * 0.6, durationInFrames * 0.6 + 20], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const appear = interpolate(frame, [0, 18], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center" }}>
      {title ? (
        <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", ...text.timelineTitle, color: colors.text, opacity: appear }}>
          {title}
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap, marginTop: title ? 40 : 0 }}>
        {names.map((n, i) => {
          const t = interpolate(frame, [10 + step * i, 10 + step * i + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const hot = highlight.includes(n);
          const dim = highlight.length && !hot ? 1 - (1 - opacity.textFaint) * mark : 1;
          return (
            <div
              key={n}
              style={{
                height: 112,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                border: `${stroke.hairline}px solid ${hot && mark > 0.5 ? colors.accent : colors.border}`,
                background: `linear-gradient(180deg, ${colors.surface} 0%, ${colors.bg} 100%)`,
                boxShadow: hot ? `0 0 ${36 * mark}px ${colors.accent}55` : "none",
                opacity: t * dim,
                transform: `translateY(${(1 - t) * 16}px)`,
              }}
            >
              <div style={{ ...text.namePlate, color: hot ? (mark > 0.5 ? colors.accent : colors.text) : colors.text, textShadow: shadow.caption, padding: "0 16px" }}>{n}</div>
            </div>
          );
        })}
      </div>
      {note ? (
        <div style={{ position: "absolute", bottom: 90, width: "100%", textAlign: "center", ...text.eyebrow, color: colors.text, opacity: opacity.textMuted * appear, textTransform: "uppercase" }}>
          {note}
        </div>
      ) : null}
      <Vignette strength={0.45} />
      <Grain />
    </AbsoluteFill>
  );
};
