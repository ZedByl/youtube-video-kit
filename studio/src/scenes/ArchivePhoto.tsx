import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import type { Asset, KenBurns } from "../types";
import { assetCredit, Caption, Grain, useSceneProgress, Vignette } from "./common";

const toneFilter = {
  sepia: "sepia(0.55) contrast(1.08) brightness(0.92)",
  mono: "grayscale(1) contrast(1.1) brightness(0.9)",
  none: "contrast(1.04)",
};

export const ArchivePhoto: React.FC<{
  asset: Asset;
  base: string;
  move?: KenBurns;
  caption?: string;
  tone?: "sepia" | "mono" | "none";
  fit?: "cover" | "contain";
}> = ({ asset, base, move = {}, caption, tone = "sepia", fit = "cover" }) => {
  const { fromScale = 1.04, toScale = 1.16, fromX = 0, toX = 0, fromY = 0, toY = 0, fromPosY = 50, toPosY = fromPosY, end = 1 } = move;
  // end — доля сцены, к которой движение заканчивается; дальше кадр стоит
  const p = Math.min(useSceneProgress() / end, 1);
  const scale = interpolate(p, [0, 1], [fromScale, toScale]);
  const x = interpolate(p, [0, 1], [fromX, toX]);
  const y = interpolate(p, [0, 1], [fromY, toY]);
  const posY = interpolate(p, [0, 1], [fromPosY, toPosY]);
  const src = staticFile(`${base}/${asset.src}`);
  const transform = `scale(${scale}) translate(${x}%, ${y}%)`;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {fit === "contain" ? (
        // Портретные и маленькие кадры: размытая подложка + целый кадр поверх
        <>
          <Img
            src={src}
            style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: `${toneFilter[tone]} blur(40px) brightness(0.45)`, transform: "scale(1.2)" }}
          />
          <AbsoluteFill style={{ transform }}>
            <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", filter: toneFilter[tone] }} />
          </AbsoluteFill>
        </>
      ) : (
        <AbsoluteFill style={{ transform }}>
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `50% ${posY}%`, filter: toneFilter[tone] }} />
        </AbsoluteFill>
      )}
      <Vignette />
      <Grain />
      <Caption text={caption} credit={assetCredit(asset)} />
    </AbsoluteFill>
  );
};
