import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity, stroke, text } from "../theme";
import { Grain, Vignette } from "./common";

// Список по пунктам: пункты появляются по очереди за первые 70% сцены, у каждого дорисовывается галочка.
// mark warn — вместо галочки сигнальная точка red с «!» (признаки подделки, «на что смотреть»)
export const Checklist: React.FC<{ title?: string; items: string[]; mark?: "check" | "warn"; note?: string }> = ({
  title,
  items,
  mark = "check",
  note,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const appear = interpolate(frame, [0, 18], [0, 1], clamp);
  const step = (durationInFrames * 0.7) / items.length;
  const startOf = (i: number) => 14 + step * i;
  const tail = interpolate(frame, [startOf(items.length - 1) + 30, startOf(items.length - 1) + 50], [0, 1], clamp);
  const box = 56;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center" }}>
      {title ? (
        <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", ...text.timelineTitle, color: colors.text, opacity: appear }}>
          {title}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 34, marginTop: title ? 60 : 0 }}>
        {items.map((it, i) => {
          const t = interpolate(frame, [startOf(i), startOf(i) + 16], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const draw = interpolate(frame, [startOf(i) + 10, startOf(i) + 26], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
          // текущий пункт ярче, пройденные чуть гаснут
          const past = i < items.length - 1 ? interpolate(frame, [startOf(i + 1), startOf(i + 1) + 16], [1, 0.75], clamp) : 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 36, opacity: t * past, transform: `translateX(${(1 - t) * -30}px)` }}>
              <svg width={box} height={box} style={{ flex: "none" }}>
                {mark === "check" ? (
                  <>
                    <rect x={3} y={3} width={box - 6} height={box - 6} fill="none" stroke={colors.accentDim} strokeWidth={stroke.rule} />
                    <polyline
                      points={`${box * 0.2},${box * 0.52} ${box * 0.42},${box * 0.74} ${box * 0.82},${box * 0.26}`}
                      fill="none"
                      stroke={colors.accent}
                      strokeWidth={stroke.accent}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1 - draw}
                    />
                  </>
                ) : (
                  <>
                    <circle cx={box / 2} cy={box / 2} r={(box / 2 - 4) * draw} fill={colors.alert} />
                    <text x={box / 2} y={box / 2 + 11} textAnchor="middle" style={{ ...text.checkItem, fontSize: 34 }} fill={colors.text} opacity={draw}>
                      !
                    </text>
                  </>
                )}
              </svg>
              <div style={{ ...text.checkItem, color: colors.text }}>{it}</div>
            </div>
          );
        })}
      </div>
      {note ? (
        <div style={{ position: "absolute", bottom: 90, width: "100%", textAlign: "center", ...text.eyebrow, color: colors.accent, opacity: tail, textTransform: "uppercase" }}>
          {note}
        </div>
      ) : null}
      <Vignette strength={0.45} />
      <Grain />
    </AbsoluteFill>
  );
};
