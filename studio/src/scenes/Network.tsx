import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, shadow, stroke, text } from "../theme";
import type { NetLink, NetNode } from "../types";
import { Grain, Vignette } from "./common";

// Кто с кем связан: карточки-узлы и линии между ними. Узлы появляются по очереди на первых 80% сцены,
// линия дорисовывается, когда видны оба конца. shown — сколько узлов уже стоят с первого кадра (продолжение схемы после склейки)
export const Network: React.FC<{ title?: string; nodes: NetNode[]; links: NetLink[]; shown?: number }> = ({ title, nodes, links, shown: from = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const ease = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) } as const;
  const fresh = Math.max(1, nodes.length - from);
  const startOf = (i: number) => (i < from ? -100 : ((durationInFrames * 0.8) / fresh) * (i - from) + 8);
  const shown = (i: number) => interpolate(frame, [startOf(i), startOf(i) + 18], [0, 1], ease);
  const index = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
  const pos = (n: NetNode) => [(n.x / 100) * width, (n.y / 100) * height] as const;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      {title ? (
        <div style={{ position: "absolute", top: 70, width: "100%", textAlign: "center", ...text.timelineTitle, color: colors.text }}>{title}</div>
      ) : null}
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {links.map((l, k) => {
          const a = nodes[index[l.from]];
          const b = nodes[index[l.to]];
          if (!a || !b) return null;
          const t0 = Math.max(startOf(index[l.from]), startOf(index[l.to])) + 10;
          const draw = interpolate(frame, [t0, t0 + 20], [0, 1], { ...ease, easing: Easing.inOut(Easing.cubic) });
          const [x1, y1] = pos(a);
          const [x2, y2] = pos(b);
          return (
            <line
              key={k}
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * draw}
              y2={y1 + (y2 - y1) * draw}
              stroke={colors.accent}
              strokeWidth={stroke.rule}
              strokeDasharray={l.dashed ? "10 12" : undefined}
              opacity={l.dashed ? 0.7 : 0.9}
            />
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const s = shown(i);
        const [x, y] = pos(n);
        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * s})`,
              opacity: s,
              padding: "22px 40px",
              backgroundColor: colors.bg,
              border: `${n.primary ? stroke.marker : stroke.hairline}px solid ${n.primary ? colors.accent : colors.accentDim}`,
              boxShadow: n.primary ? `0 0 60px ${colors.glow}` : undefined,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ ...text.mapPlace, color: n.primary ? colors.accent : colors.text, textShadow: shadow.caption }}>{n.label}</div>
            {n.sub ? <div style={{ ...text.speakerRole, color: colors.accent, textTransform: "uppercase", marginTop: 8 }}>{n.sub}</div> : null}
          </div>
        );
      })}
      <Vignette strength={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
