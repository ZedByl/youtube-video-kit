import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { channel, colors, opacity, space, text } from "../theme";
import { Grain, Vignette } from "./common";

// Цитата: слова проявляются по очереди за первую половину сцены, кавычки и автор — акцентным цветом.
// style engraving — короткая надпись, выбитая на металле (подпись на механизме, гравировка на крышке)
export const Quote: React.FC<{ text: string; author?: string; note?: string; style?: "quote" | "engraving" }> = ({
  text: body,
  author,
  note,
  style = "quote",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const words = body.split(" ");
  const span = Math.max(20, durationInFrames * 0.45);
  const wordIn = (i: number) => interpolate(frame, [8 + (span * i) / words.length, 8 + (span * i) / words.length + 14], [0, 1], clamp);
  const tail = interpolate(frame, [span + 10, span + 30], [0, 1], clamp);

  if (style === "engraving") {
    // свет скользит по акцентном цвете слева направо
    const sweep = interpolate(frame, [10, durationInFrames * 0.7], [-30, 130], { ...clamp, easing: Easing.inOut(Easing.sin) });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.surface,
          backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 2px, rgba(0,0,0,0) 2px 5px), radial-gradient(ellipse at center, ${colors.glow} 0%, ${colors.bgDeep} 75%)`,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            ...text.engraving,
            color: colors.accentDim,
            backgroundImage: `linear-gradient(100deg, ${colors.accentDim} ${sweep - 25}%, ${colors.text} ${sweep}%, ${colors.accentDim} ${sweep + 25}%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 -2px 0 rgba(0,0,0,0.6)) drop-shadow(0 2px 0 rgba(255,255,255,0.12))",
            opacity: interpolate(frame, [0, 24], [0, 1], clamp),
          }}
        >
          {body}
        </div>
        {note ? (
          <div style={{ ...text.eyebrow, color: colors.text, opacity: opacity.textMuted * tail, textTransform: "uppercase", marginTop: 40 }}>{note}</div>
        ) : null}
        <Vignette strength={0.55} />
        <Grain />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center", padding: `0 ${space.frameInset * 3}px` }}>
      <div style={{ ...text.quoteText, color: colors.text, textAlign: "center" }}>
        <span style={{ color: colors.accent, opacity: wordIn(0) }}>{channel.quotes[0]}</span>
        {words.map((w, i) => (
          <span key={i} style={{ opacity: wordIn(i) }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
        <span style={{ color: colors.accent, opacity: wordIn(words.length - 1) }}>{channel.quotes[1]}</span>
      </div>
      {author ? <div style={{ ...text.eyebrow, color: colors.accent, opacity: tail, textTransform: "uppercase", marginTop: 56 }}>— {author}</div> : null}
      {note ? <div style={{ ...text.note, color: colors.text, opacity: opacity.textFaint * tail, marginTop: 14 }}>{note}</div> : null}
      <Vignette strength={0.5} />
      <Grain />
    </AbsoluteFill>
  );
};
