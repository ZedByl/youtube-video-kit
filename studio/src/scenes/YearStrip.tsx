import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity as op, stroke, text } from "../theme";
import type { YearMark } from "../types";
import { Grain, Vignette } from "./common";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

// Один год как лента из 12 месяцев: события загораются на своих месяцах.
// Без active — все отметки по очереди (обзор). С active — прежние приглушены, active появляется, следующие скрыты:
// одна и та же лента возвращается как глава «история первая / вторая / третья»
export const YearStrip: React.FC<{ year: string; title?: string; marks: YearMark[]; active?: number }> = ({ year, title, marks, active }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const left = 160;
  const cell = (width - left * 2) / 12;
  const y = height * 0.56;
  const xOf = (month: number) => left + cell * (month - 0.5);
  const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) } as const;

  // когда появляется каждая отметка (кадр) и докуда тянется линия
  const revealSpan = durationInFrames * 0.8;
  const startOf = (i: number) => (active === undefined ? (revealSpan / marks.length) * i + 10 : i < active ? -100 : 14);
  const visible = (i: number) => active === undefined || i <= active;
  // отметки в соседних месяцах (ближе 2 мес.) налезают друг на друга — каждую вторую из таких дату поднять, подпись опустить
  const stagger = marks.reduce<number[]>((acc, mk, i) => [...acc, i > 0 && mk.month - marks[i - 1].month < 2 && !acc[i - 1] ? 1 : 0], []);
  const lastMonth = active === undefined ? marks[marks.length - 1].month : marks[active].month;
  const fromMonth = active === undefined || active === 0 ? 0.5 : marks[active - 1].month;
  const fromX = fromMonth === 0.5 ? left : xOf(fromMonth);
  const lineEnd = interpolate(frame, active === undefined ? [0, revealSpan] : [0, 22], [fromX, xOf(lastMonth)], {
    ...ease,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center" }}>
        <div style={{ ...text.bigDate, color: colors.accent, opacity: 0.9 }}>{year}</div>
        {title ? <div style={{ ...text.eyebrow, color: colors.text, opacity: op.textMuted, textTransform: "uppercase", marginTop: 4 }}>{title}</div> : null}
      </div>
      <svg width={width} height={height} style={{ position: "absolute" }}>
        <line x1={left} y1={y} x2={width - left} y2={y} stroke={colors.accentDim} strokeWidth={stroke.hairline} opacity={0.6} />
        <line x1={left} y1={y} x2={lineEnd} y2={y} stroke={colors.accent} strokeWidth={stroke.rule} />
        {MONTHS.map((m, i) => {
          const x = left + cell * (i + 0.5);
          const lit = xOf(i + 1) <= lineEnd + 1;
          return (
            <g key={m}>
              <line x1={x} y1={y - 10} x2={x} y2={y + 10} stroke={lit ? colors.accent : colors.accentDim} strokeWidth={stroke.hairline} />
              <text x={x} y={y + 58} textAnchor="middle" fontFamily={text.note.fontFamily} fontSize={text.note.fontSize} letterSpacing={3} fill={colors.text} opacity={lit ? 0.75 : 0.35}>
                {m.toUpperCase()}
              </text>
            </g>
          );
        })}
        {marks.map((mk, i) => {
          if (!visible(i)) return null;
          const s = interpolate(frame, [startOf(i), startOf(i) + 18], [0, 1], ease);
          const dim = active !== undefined && i < active ? 0.45 : 1;
          const x = xOf(mk.month);
          const pulse = active === i ? 1 + 0.25 * Math.sin(Math.min(1, frame / 40) * Math.PI) : 1;
          return (
            <g key={i} opacity={s * dim}>
              <circle cx={x} cy={y} r={28 * s * pulse} fill={colors.accent} opacity={active === i ? 0.18 : 0} />
              <circle cx={x} cy={y} r={14 * s} fill={colors.bgDeep} stroke={colors.accent} strokeWidth={stroke.marker} />
              <circle cx={x} cy={y} r={5 * s} fill={colors.accent} />
              <text x={x} y={y - 46 - stagger[i] * 66 - (1 - s) * 20} textAnchor="middle" fontFamily={text.timelineYear.fontFamily} fontSize={text.timelineYear.fontSize} fill={colors.accent}>
                {mk.date}
              </text>
              <text
                x={x}
                y={y + 128 + stagger[i] * 46 + (1 - s) * 20}
                textAnchor="middle"
                fontFamily={text.timelineLabel.fontFamily}
                fontSize={text.timelineLabel.fontSize}
                letterSpacing={text.timelineLabel.letterSpacing}
                fill={colors.text}
              >
                {mk.label}
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
