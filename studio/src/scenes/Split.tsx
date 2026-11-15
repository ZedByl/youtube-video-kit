import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { channel, colors, fonts, opacity as op, shadow, space, text } from "../theme";
import type { Asset, SplitSide } from "../types";
import { assetCredit, Grain, useSceneProgress, Vignette } from "./common";

// «Отсюда — туда»: два кадра рядом, подписи-годы, между ними стрелка
const Side: React.FC<{ side: SplitSide; asset?: Asset; base: string; delay: number }> = ({ side, asset, base, delay }) => {
  const frame = useCurrentFrame();
  const p = useSceneProgress();
  const appear = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "relative", flex: 1, overflow: "hidden", opacity: appear }}>
      {asset ? (
        <Img
          src={staticFile(`${base}/${asset.src}`)}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.55) contrast(1.08) brightness(0.85)", transform: `scale(${1.05 + p * 0.08})` }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle at 50% 50%, #2a3340 0%, #07090c 75%)",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: 60,
          }}
        >
          <div style={{ fontFamily: fonts.sans, fontSize: 18, letterSpacing: 5, color: colors.accent, opacity: 0.8 }}>{channel.labels.placeholder}</div>
          <div style={{ ...text.splitPlaceholder, color: colors.text, marginTop: space.stack }}>{side.placeholder}</div>
        </AbsoluteFill>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          width: "100%",
          textAlign: "center",
          fontFamily: fonts.serif,
          fontSize: 110,
          color: colors.accent,
          textShadow: shadow.hero,
        }}
      >
        {side.label}
      </div>
      {asset ? (
        <div style={{ position: "absolute", left: space.splitPad, top: space.splitPad, ...text.credit, color: colors.text, opacity: op.textMuted, textShadow: shadow.credit }}>
          {assetCredit(asset)}
        </div>
      ) : null}
    </div>
  );
};

export const Split: React.FC<{ left: SplitSide; right: SplitSide; assets: Record<string, Asset>; base: string }> = ({ left, right, assets, base }) => {
  const frame = useCurrentFrame();
  const arrow = interpolate(frame, [24, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ flexDirection: "row", backgroundColor: "#000", gap: space.splitGap }}>
      <Side side={left} asset={left.asset ? assets[left.asset] : undefined} base={base} delay={0} />
      <Side side={right} asset={right.asset ? assets[right.asset] : undefined} base={base} delay={12} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: colors.bg,
            border: `3px solid ${colors.accent}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: arrow,
            transform: `scale(${0.6 + arrow * 0.4})`,
          }}
        >
          {/* SVG вместо глифа «→»: у шрифта стрелка сидит ниже центра круга */}
          <svg width={64} height={64} viewBox="0 0 64 64" fill="none" stroke={colors.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 32 H54 M40 18 L54 32 L40 46" />
          </svg>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
