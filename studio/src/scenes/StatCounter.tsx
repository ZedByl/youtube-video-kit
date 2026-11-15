import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, opacity, text, formatNumber } from "../theme";
import { Grain, Vignette } from "./common";


// Счётчик «~2 500 → 72»: число сначала держится, потом скручивается к цели
export const StatCounter: React.FC<{
  from: number;
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
  fromLabel?: string;
  toLabel?: string;
}> = ({ from, to, prefix = "", suffix = "", label, fromLabel, toLabel }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = interpolate(frame, [fps * 0.8, Math.min(durationInFrames - fps, fps * 3.5)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const value = from + (to - from) * t;
  const appear = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const tag = t < 0.5 ? fromLabel : toLabel;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center", opacity: appear }}>
      <div style={{ ...text.eyebrow, color: colors.text, opacity: opacity.textMuted, textTransform: "uppercase" }}>{label}</div>
      <div style={{ ...text.statNumber, color: t >= 1 ? colors.text : colors.accent, fontVariantNumeric: "tabular-nums lining-nums" }}>
        {prefix}
        {formatNumber(value)}
        {suffix}
      </div>
      {tag ? <div style={{ ...text.statTag, color: colors.accent, opacity: 0.9 }}>{tag}</div> : null}
      <Vignette strength={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
