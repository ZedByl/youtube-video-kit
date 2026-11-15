import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity, stroke, text, formatNumber } from "../theme";
import type { PriceItem } from "../types";
import { Grain, Vignette } from "./common";


// Диапазоны цен на логарифмической шкале: «70–500 €» и «30 000–45 000 €» в одном кадре, разница видна глазом.
// Полосы вырастают по очереди за первые 60% сцены; shown — сколько полос уже стоят с первого кадра (продолжение после склейки)
export const PriceRange: React.FC<{ title?: string; items: PriceItem[]; unit?: string; note?: string; shown?: number }> = ({
  title,
  items,
  unit = "€",
  note,
  shown: from = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // шкала от степени десяти ниже минимума до степени выше максимума
  const lo = Math.pow(10, Math.floor(Math.log10(Math.min(...items.map((i) => i.from)))));
  const hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...items.map((i) => i.to)))));
  const x0 = 520;
  const x1 = width - 200;
  const x = (v: number) => x0 + ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (x1 - x0);
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v *= 10) ticks.push(v);

  const rowH = 150;
  const top = height / 2 - (items.length * rowH) / 2 + 20;
  const axisY = top + items.length * rowH + 10;
  const fresh = Math.max(1, items.length - from);
  const startOf = (i: number) => (i < from ? -100 : 12 + ((durationInFrames * 0.6) / fresh) * (i - from));
  const appear = interpolate(frame, [0, 18], [0, 1], clamp);
  const tail = interpolate(frame, [durationInFrames * 0.65, durationInFrames * 0.65 + 20], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      {title ? (
        <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", ...text.timelineTitle, color: colors.text, opacity: appear }}>
          {title}
        </div>
      ) : null}
      <svg width={width} height={height} style={{ position: "absolute", opacity: appear }}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={top - 30} x2={x(v)} y2={axisY} stroke={colors.border} strokeWidth={stroke.hairline} strokeDasharray="4 10" />
            <text x={x(v)} y={axisY + 44} textAnchor="middle" style={text.documentLabel} fill={colors.text} opacity={opacity.textMuted}>
              {formatNumber(v)} {unit}
            </text>
          </g>
        ))}
        <line x1={x0} y1={axisY} x2={x1} y2={axisY} stroke={colors.text} strokeOpacity={opacity.textFaint} strokeWidth={stroke.rule} />
        {items.map((it, i) => {
          const t = interpolate(frame, [startOf(i), startOf(i) + 30], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
          const y = top + i * rowH + rowH / 2;
          const a = x(it.from);
          const b = a + (x(it.to) - a) * t;
          const c = it.primary ? colors.accent : colors.text;
          return (
            <g key={i} opacity={interpolate(frame, [startOf(i), startOf(i) + 10], [0, 1], clamp)}>
              <text x={x0 - 40} y={y + 16} textAnchor="end" style={text.priceValue} fill={colors.text}>
                {it.label}
              </text>
              <rect x={a} y={y - 18} width={Math.max(8, b - a)} height={36} rx={18} fill={c} opacity={it.primary ? 1 : 0.8} />
              {/* цена над полосой; в правой половине шкалы — выровнена по концу полосы, иначе уйдёт за кадр */}
              <text x={a > width / 2 ? x(it.to) : a} y={y - 38} textAnchor={a > width / 2 ? "end" : "start"} style={text.priceValue} fill={c} opacity={t}>
                {formatNumber(it.from)}–{formatNumber(it.to)} {unit}
              </text>
            </g>
          );
        })}
      </svg>
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
