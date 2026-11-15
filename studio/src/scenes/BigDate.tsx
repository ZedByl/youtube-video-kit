import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, text as type } from "../theme";
import { Grain, Vignette } from "./common";

// Крупная дата. morphTo — смена даты по символам («7.12.1845» → «7.12.1990»): совпавшие символы стоят, отличающиеся перелистываются
export const BigDate: React.FC<{ text: string; sub?: string; morphTo?: string; morphAt?: number }> = ({
  text,
  sub,
  morphTo,
  morphAt = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const appear = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const morphFrame = Math.round(durationInFrames * morphAt);
  const flip = morphTo
    ? interpolate(frame, [morphFrame, morphFrame + Math.round(fps * 0.6)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      })
    : 0;
  const target = morphTo ?? text;
  const len = Math.max(text.length, target.length);
  const subOpacity = interpolate(frame, [15, 35], [0, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          whiteSpace: "pre",
          fontFamily: fonts.serif,
          fontWeight: 400,
          fontSize: 220,
          color: colors.accent,
          letterSpacing: interpolate(appear, [0, 1], [30, 6]),
          opacity: appear,
          fontVariantNumeric: "lining-nums",
        }}
      >
        {Array.from({ length: len }).map((_, i) => {
          const a = text[i] ?? "";
          const b = target[i] ?? "";
          if (a === b) return <span key={i}>{a}</span>;
          return (
            // обе цифры в одной ячейке grid: ширина — по более широкой, ничего не обрезается
            <span key={i} style={{ display: "inline-grid", overflow: "hidden", height: "1.2em", justifyItems: "center" }}>
              <span style={{ gridArea: "1 / 1", transform: `translateY(${-flip * 100}%)`, opacity: 1 - flip }}>{a}</span>
              <span style={{ gridArea: "1 / 1", transform: `translateY(${(1 - flip) * 100}%)`, opacity: flip, color: colors.text }}>{b}</span>
            </span>
          );
        })}
      </div>
      {sub ? (
        <div style={{ ...type.eyebrow, textTransform: "uppercase", color: colors.text, opacity: subOpacity, marginTop: 10 }}>
          {sub}
        </div>
      ) : null}
      <Vignette strength={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
