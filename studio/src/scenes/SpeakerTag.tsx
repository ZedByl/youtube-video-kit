import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, space, stroke, text } from "../theme";

// Плашка ведущего: ведущих в кадре нет, поэтому при первом появлении голоса подписываем, кто говорит
export const SpeakerTag: React.FC<{ speaker: string; role: string }> = ({ speaker, role }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const name = speaker.charAt(0) + speaker.slice(1).toLowerCase();
  return (
    <div
      style={{
        position: "absolute",
        left: space.frameInset,
        bottom: space.speakerBottom,
        opacity: inn * out,
        transform: `translateX(${(1 - inn) * -40}px)`,
        display: "flex",
        alignItems: "stretch",
        gap: space.tagGap,
      }}
    >
      <div style={{ width: stroke.marker, backgroundColor: colors.accent, transform: `scaleY(${inn})`, transformOrigin: "bottom" }} />
      <div style={{ padding: "8px 26px 10px 6px", background: `linear-gradient(90deg, ${colors.bgDeep}d9, ${colors.bgDeep}00)` }}>
        <div style={{ ...text.speakerName, color: colors.text }}>{name}</div>
        <div style={{ ...text.speakerRole, color: colors.accent, textTransform: "uppercase" }}>{role}</div>
      </div>
    </div>
  );
};
