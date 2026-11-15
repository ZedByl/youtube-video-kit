import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity, text } from "../theme";
import { Grain } from "./common";

// Ретро-экран начала 90-х: янтарный люминофор, строки печатаются по символу за первые 75% сцены, курсор мигает.
// Стилизация, а не документ: в строки — только факты из сценария
export const Terminal: React.FC<{ title?: string; lines: string[] }> = ({ title, lines }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const total = lines.reduce((n, l) => n + l.length, 0);
  const typed = Math.floor(interpolate(frame, [12, durationInFrames * 0.75], [0, total], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const on = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const cursor = Math.floor(frame / (fps * 0.5)) % 2 === 0;
  const flicker = 0.96 + 0.04 * Math.sin(frame * 1.7);

  let left = typed;
  const shown = lines.map((l) => {
    const s = l.slice(0, Math.max(0, left));
    left -= l.length;
    return s;
  });
  const unfinished = shown.findIndex((s, i) => s.length < lines[i].length);
  const current = unfinished === -1 ? lines.length - 1 : unfinished;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      {/* корпус монитора: экран со скруглением и свечением */}
      <div
        style={{
          width: 1500,
          height: 860,
          borderRadius: 48,
          background: `radial-gradient(ellipse at center, ${colors.accent}1f 0%, ${colors.accent}0a 60%, #000 100%)`,
          boxShadow: `inset 0 0 120px rgba(0,0,0,0.9), 0 0 0 18px ${colors.ink}, 0 0 0 20px ${colors.border}`,
          padding: "80px 100px",
          position: "relative",
          overflow: "hidden",
          opacity: on * flicker,
        }}
      >
        {title ? <div style={{ ...text.terminal, color: colors.accent, opacity: opacity.textFaint, marginBottom: 30 }}>{title}</div> : null}
        {shown.map((s, i) => (
          <div key={i} style={{ ...text.terminal, color: colors.accent, textShadow: `0 0 12px ${colors.accent}`, whiteSpace: "pre", minHeight: "1.45em" }}>
            {s}
            {i === current && cursor ? <span style={{ backgroundColor: colors.accent }}>&nbsp;</span> : null}
          </div>
        ))}
        {/* строчная развёртка */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 2px, rgba(0,0,0,0) 2px 5px)",
            pointerEvents: "none",
          }}
        />
      </div>
      <Grain />
    </AbsoluteFill>
  );
};
