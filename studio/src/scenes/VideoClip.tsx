import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import type { Asset } from "../types";
import { assetCredit, Caption, Grain, Vignette } from "./common";

// Макросъёмка или хроника. Звук клипа выключен: в миксе только голоса, музыка и SFX
// zoom — увеличение кадра: убирает чёрные поля у хроники 4:3, вшитой в 16:9 (картинку меряет ffmpeg cropdetect; фильм о Сомме 004 — 1.42)
export const VideoClip: React.FC<{ asset: Asset; base: string; trimBefore?: number; playbackRate?: number; zoom?: number; caption?: string }> = ({
  asset,
  base,
  trimBefore = 0,
  playbackRate = 1,
  zoom = 1,
  caption,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo
        src={staticFile(`${base}/${asset.src}`)}
        trimBefore={Math.round(trimBefore * fps)}
        playbackRate={playbackRate}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: zoom !== 1 ? `scale(${zoom})` : undefined }}
      />
      <Vignette strength={0.4} />
      <Grain />
      <Caption text={caption} credit={assetCredit(asset)} />
    </AbsoluteFill>
  );
};
