import React from "react";
import { AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity as op, shadow, space, text as type } from "../theme";

// Прогресс сцены 0→1 за всю длину Sequence
export const useSceneProgress = (easing: (t: number) => number = Easing.inOut(Easing.sin)) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
};

// Плёночное зерно: 4 готовые текстуры шума (public/fx), смена каждые 2 кадра со случайным сдвигом.
// SVG feTurbulence на каждый кадр замедлял рендер в разы. Включается токеном grain-default в design-system/tokens.json (0 — выключено)
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = op.grainDefault }) => {
  const frame = useCurrentFrame();
  if (!opacity) return null;
  const step = Math.floor(frame / 2);
  const tile = 1 + (step % 4);
  const dx = Math.floor(random(`gx-${step}`) * 384);
  const dy = Math.floor(random(`gy-${step}`) * 384);
  return (
    <AbsoluteFill
      style={{
        opacity: opacity * 2.2,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        backgroundImage: `url(${staticFile(`fx/grain-${tile}.png`)})`,
        backgroundPosition: `${dx}px ${dy}px`,
        backgroundRepeat: "repeat",
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = op.vignetteDefault }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

// Подпись к архивному кадру: что на фото + источник/лицензия (атрибуция CC прямо в кадре)
export const Caption: React.FC<{ text?: string; credit?: string }> = ({ text, credit }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (!text && !credit) return null;
  return (
    <div style={{ position: "absolute", left: space.frameInset, bottom: space.captionBottom, opacity, maxWidth: 1100 }}>
      {text ? (
        <div style={{ ...type.caption, color: colors.text, textShadow: shadow.caption }}>
          {text}
        </div>
      ) : null}
      {credit ? (
        <div
          style={{
            ...type.credit,
            color: colors.text,
            opacity: op.textMuted,
            marginTop: 6,
            textShadow: shadow.credit,
          }}
        >
          {credit}
        </div>
      ) : null}
    </div>
  );
};

export const assetCredit = (a: { credit?: string; author?: string; license: string } | undefined) => {
  if (!a) return undefined;
  const who = a.credit ?? a.author;
  return who ? `${who} · ${a.license}` : a.license;
};
