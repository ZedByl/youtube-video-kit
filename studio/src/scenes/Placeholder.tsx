import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { channel, colors, fonts } from "../theme";
import { Grain, useSceneProgress, Vignette } from "./common";

const moodBg = {
  ruins: `radial-gradient(ellipse at 50% 70%, #2e3138 0%, #0e0f12 70%)`,
  macro: `radial-gradient(circle at 50% 50%, #2a3340 0%, #07090c 75%)`,
  archive: `radial-gradient(ellipse at 50% 50%, #2a2c31 0%, #0c0d0f 75%)`,
};

// Заглушка для кадра, которого ещё нет: видно в черновике, что именно надо найти или снять
export const Placeholder: React.FC<{ label: string; note?: string; mood?: "ruins" | "macro" | "archive" }> = ({
  label,
  note,
  mood = "archive",
}) => {
  const p = useSceneProgress();
  const scale = interpolate(p, [0, 1], [1, 1.06]);
  return (
    <AbsoluteFill style={{ background: moodBg[mood], overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 28px)`,
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 160 }}>
        <div style={{ fontFamily: fonts.sans, fontSize: 22, letterSpacing: 6, color: colors.accent, opacity: 0.8 }}>
          {channel.labels.placeholder}
        </div>
        <div style={{ fontFamily: fonts.serif, fontSize: 64, color: colors.text, marginTop: 18, lineHeight: 1.15 }}>{label}</div>
        {note ? (
          <div style={{ fontFamily: fonts.sans, fontSize: 24, color: colors.text, opacity: 0.55, marginTop: 22 }}>{note}</div>
        ) : null}
      </AbsoluteFill>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
