import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import type { TimelineItem } from "../types";
import { Grain, Vignette } from "./common";

// Таймлайн в стиле баннера: сплошная линия через вехи, после последней — пунктир «история идёт дальше».
// Вехи появляются по очереди, равномерно на первых 80% сцены; веха с from (из at) — в этот кадр, линия дотягивается до неё
export const TimelineScene: React.FC<{ title?: string; items: TimelineItem[] }> = ({ title, items }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const left = 200;
  const right = width - 200;
  const y = height * 0.55;
  const step = (right - left) / (items.length + 0.5);
  const revealSpan = durationInFrames * 0.8;
  const t0 = (i: number) => items[i].from ?? (revealSpan / items.length) * i + 6;
  const lastX = left + step * items.length;
  const synced = items.some((it) => it.from !== undefined);
  // веха без from может прийтись позже следующей с from — держим ключи строго возрастающими
  const keys: number[] = [];
  items.forEach((_, i) => keys.push(Math.max(t0(i) + 18, (keys[i - 1] ?? 0) + 1)));
  const lineDraw = synced
    ? interpolate(frame, [0, ...keys], [0, ...items.map((_, i) => (i + 1) / items.length)], {
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      })
    : interpolate(frame, [0, revealSpan], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      {title ? (
        <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", fontFamily: fonts.serif, fontSize: 60, color: colors.text }}>
          {title}
        </div>
      ) : null}
      <svg width={width} height={height} style={{ position: "absolute" }}>
        <line x1={left} y1={y} x2={left + (lastX - left) * lineDraw} y2={y} stroke={colors.accent} strokeWidth={3} />
        <line x1={lastX} y1={y} x2={right} y2={y} stroke={colors.accent} strokeWidth={3} strokeDasharray="10 12" opacity={lineDraw >= 0.999 ? 0.7 : 0} />
        {items.map((it, i) => {
          const x = left + step * (i + 1);
          const s = interpolate(frame, [t0(i), t0(i) + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <g key={i} opacity={s}>
              <circle cx={x} cy={y} r={14 * s} fill={colors.bgDeep} stroke={colors.accent} strokeWidth={4} />
              <circle cx={x} cy={y} r={5 * s} fill={colors.accent} />
              <text x={x} y={y - 48 - (1 - s) * 20} textAnchor="middle" fontFamily={fonts.serif} fontSize={72} fill={colors.accent}>
                {it.year}
              </text>
              <text x={x} y={y + 64 + (1 - s) * 20} textAnchor="middle" fontFamily={fonts.sans} fontSize={30} fill={colors.text} letterSpacing={1}>
                {it.label}
              </text>
            </g>
          );
        })}
      </svg>
      <Vignette strength={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
