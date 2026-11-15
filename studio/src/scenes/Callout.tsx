import React, { useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, shadow, stroke, text } from "../theme";
import type { Asset, CalloutBox } from "../types";
import { assetCredit, Caption, Grain, Vignette } from "./common";

const toneFilter = {
  sepia: "sepia(0.55) contrast(1.08) brightness(0.92)",
  mono: "grayscale(1) contrast(1.1) brightness(0.9)",
  none: "contrast(1.04)",
};

// «Посмотри сюда»: кадр целиком → наезд на деталь (box — в % исходного снимка), вокруг затемнение, рамка акцентным цветом и подпись.
// Первые 25% — общий план, 25–65% — наезд, рамка с 55%
export const Callout: React.FC<{ asset: Asset; base: string; box: CalloutBox; label?: string; caption?: string; tone?: "sepia" | "mono" | "none" }> = ({
  asset,
  base,
  box,
  label,
  caption,
  tone = "none",
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames: D } = useVideoConfig();
  // размер снимка нужен для геометрии наезда
  const [size, setSize] = useState<[number, number] | null>(null);
  const [handle] = useState(() => delayRender("Callout: размер снимка"));
  const src = staticFile(`${base}/${asset.src}`);
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  const [iw, ih] = size ?? [W, H];
  const bx = (box.x / 100) * iw;
  const by = (box.y / 100) * ih;
  const bw = (box.w / 100) * iw;
  const bh = (box.h / 100) * ih;
  const s0 = Math.max(W / iw, H / ih);
  const s1 = Math.max(s0, Math.min((0.45 * H) / bh, (0.62 * W) / bw));
  const z = interpolate(frame, [D * 0.25, D * 0.65], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const drift = interpolate(frame, [0, D], [0, 0.04], clamp);
  const s = Math.exp(interpolate(z, [0, 1], [Math.log(s0 * (1 + drift)), Math.log(s1)]));
  const cx = interpolate(z, [0, 1], [iw / 2, bx + bw / 2]);
  const cy = interpolate(z, [0, 1], [ih / 2, by + bh / 2]);
  // снимок не отрывается от краёв кадра
  const left = Math.min(0, Math.max(W - iw * s, W / 2 - cx * s));
  const top = Math.min(0, Math.max(H - ih * s, H / 2 - cy * s));
  const rx = left + bx * s;
  const ry = top + by * s;
  const ring = interpolate(frame, [D * 0.55, D * 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pad = 18;
  const below = ry + bh * s + pad + 120 < H;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <Img
        src={src}
        onLoad={(e) => {
          setSize([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight]);
          continueRender(handle);
        }}
        style={{ position: "absolute", left, top, width: iw * s, height: ih * s, maxWidth: "none", filter: toneFilter[tone] }}
      />
      <Vignette />
      {/* затемнение вокруг детали — огромная тень от прозрачной рамки */}
      <div
        style={{
          position: "absolute",
          left: rx - pad,
          top: ry - pad,
          width: bw * s + 2 * pad,
          height: bh * s + 2 * pad,
          boxShadow: `0 0 0 4000px rgba(0,0,0,${0.55 * ring})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: rx - pad,
          top: ry - pad,
          width: bw * s + 2 * pad,
          height: bh * s + 2 * pad,
          border: `${stroke.marker}px solid ${colors.accent}`,
          boxShadow: `0 0 40px ${colors.glow}`,
          opacity: ring,
        }}
      />
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            textAlign: "center",
            top: below ? ry + bh * s + pad + 36 : undefined,
            bottom: below ? undefined : H - ry + pad + 36,
            ...text.mapPlace,
            color: colors.text,
            textShadow: shadow.caption,
            opacity: ring,
          }}
        >
          {label}
        </div>
      ) : null}
      <Grain />
      <Caption text={caption} credit={assetCredit(asset)} />
    </AbsoluteFill>
  );
};
