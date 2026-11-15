import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity, text } from "../theme";
import { Grain, Vignette } from "./common";

// Одна точка — один человек или одна вещь. keep < total: лишние гаснут вразброс на 30–70% сцены, оставшиеся загораются акцентным цветом («2 500 → 72»).
// highlight: из оставшихся столько-то выделяются («1 200 человек, из них 7 выжили»)
export const DotGrid: React.FC<{
  total: number;
  keep?: number;
  highlight?: number;
  label: string;
  fromLabel?: string;
  toLabel?: string;
}> = ({ total, keep = total, highlight = 0, label, fromLabel, toLabel }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // сетка во всю ширину кадра между подписями
  const areaW = width - 420;
  const areaH = height - 440;
  const cols = Math.ceil(Math.sqrt((total * areaW) / areaH));
  const rows = Math.ceil(total / cols);
  const cell = Math.min(areaW / cols, areaH / rows);
  const r = cell * 0.3;
  const x0 = (width - cols * cell) / 2 + cell / 2;
  const y0 = 220 + (areaH - rows * cell) / 2 + cell / 2;

  // кто остаётся и кто выделен — детерминированно, вразброс по сетке
  const { kept, marked, order } = useMemo(() => {
    const idx = Array.from({ length: total }, (_, i) => i).sort((a, b) => random(`dot-${a}`) - random(`dot-${b}`));
    return {
      kept: new Set(idx.slice(0, keep)),
      marked: new Set(idx.slice(0, highlight)),
      order: Object.fromEntries(idx.map((d, i) => [d, i / total])),
    };
  }, [total, keep, highlight]);

  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const appear = interpolate(frame, [0, 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const a = durationInFrames * 0.3;
  const b = durationInFrames * 0.7;
  const change = interpolate(frame, [a, b], [0, 1], clamp);
  const tag = change < 0.5 ? fromLabel : toLabel;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", ...text.eyebrow, color: colors.text, opacity: opacity.textMuted * appear, textTransform: "uppercase" }}>
        {label}
      </div>
      <svg width={width} height={height} style={{ position: "absolute", opacity: appear }}>
        {Array.from({ length: total }).map((_, i) => {
          const x = x0 + (i % cols) * cell;
          const y = y0 + Math.floor(i / cols) * cell;
          // каждая точка меняется в свой момент внутри окна a..b
          const t0 = a + (b - a) * 0.85 * order[i];
          const t = interpolate(frame, [t0, t0 + (b - a) * 0.15], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
          if (keep < total && !kept.has(i)) {
            return <circle key={i} cx={x} cy={y} r={r} fill={colors.text} opacity={0.55 * (1 - t)} />;
          }
          const lit = keep < total || marked.has(i) ? t : 0;
          const big = marked.has(i) ? 1 + 0.35 * t : 1;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={r * big}
              fill={lit > 0.5 ? colors.accent : colors.text}
              opacity={0.55 + 0.45 * lit}
              style={marked.has(i) && t > 0 ? { filter: `drop-shadow(0 0 ${cell * 0.25}px ${colors.accent})` } : undefined}
            />
          );
        })}
      </svg>
      {tag ? (
        <div style={{ position: "absolute", bottom: 100, width: "100%", textAlign: "center", ...text.statTag, color: colors.accent, opacity: appear }}>{tag}</div>
      ) : null}
      <Vignette strength={0.45} />
      <Grain />
    </AbsoluteFill>
  );
};
