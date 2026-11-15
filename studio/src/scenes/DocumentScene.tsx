import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, opacity, stroke, text } from "../theme";
import type { DocField } from "../types";
import { Grain, Vignette } from "./common";

// Бланк (паспорт, справка, сертификат): лист выезжает, поля заполняются машинописью,
// поля с mark обводятся от руки акцентным цветом и соединяются скобкой. Стилизация, а не скан: в поля — только факты из сценария
export const DocumentScene: React.FC<{ title: string; fields: DocField[]; stamp?: string; note?: string }> = ({ title, fields, stamp, note }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const slide = interpolate(frame, [0, 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const typeEnd = durationInFrames * 0.4;
  const step = (typeEnd - 20) / fields.length;
  const markT = interpolate(frame, [typeEnd, typeEnd + 24], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const stampT = interpolate(frame, [typeEnd + 30, typeEnd + 36], [0, 1], clamp);
  const tail = interpolate(frame, [typeEnd + 40, typeEnd + 60], [0, 1], clamp);

  const paperW = 1100;
  const rowH = 104;
  const innerW = paperW - 180; // без полей листа
  const marked = fields.map((f, i) => (f.mark ? i : -1)).filter((i) => i >= 0);
  const midY = (i: number) => i * rowH + rowH / 2 + 14;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: paperW,
          padding: "70px 90px 80px",
          backgroundColor: colors.text,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          position: "relative",
          transform: `translateY(${(1 - slide) * 120}px) rotate(${-1.2 + slide * 0.4}deg)`,
          opacity: slide,
        }}
      >
        <div style={{ ...text.documentTitle, color: colors.ink, textAlign: "center" }}>{title}</div>
        <div style={{ height: stroke.rule, backgroundColor: colors.ink, opacity: 0.6, margin: "26px 0 40px" }} />
        <div style={{ position: "relative" }}>
          {fields.map((f, i) => {
            const typed = f.value ? Math.floor(interpolate(frame, [20 + step * i, 20 + step * (i + 0.8)], [0, f.value.length], clamp)) : 0;
            return (
              <div key={i} style={{ height: rowH, display: "flex", alignItems: "flex-end", gap: 30, paddingBottom: 18 }}>
                <div style={{ ...text.documentLabel, color: colors.ink, opacity: opacity.textMuted, textTransform: "uppercase", width: 300, flex: "none" }}>
                  {f.label}
                </div>
                <div
                  style={{
                    ...text.documentValue,
                    color: colors.ink,
                    flex: 1,
                    borderBottom: `${stroke.hairline}px dotted ${colors.ink}`,
                    minHeight: 52,
                    whiteSpace: "pre",
                  }}
                >
                  {f.value?.slice(0, typed)}
                </div>
              </div>
            );
          })}
          {/* обводка отмеченных полей и скобка между ними — в координатах блока полей */}
          <svg width={innerW} height={fields.length * rowH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
            {marked.map((i) => {
              const cy = midY(i);
              return (
                <ellipse
                  key={i}
                  cx={innerW / 2}
                  cy={cy}
                  rx={innerW / 2 + 50}
                  ry={rowH / 2 - 10}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={stroke.accent}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - markT}
                  transform={`rotate(${i % 2 ? 0.8 : -0.8} ${innerW / 2} ${cy})`}
                />
              );
            })}
            {marked.length > 1 ? (
              <path
                d={`M ${innerW + 30} ${midY(marked[0])} C ${innerW + 70} ${midY(marked[0])}, ${innerW + 70} ${midY(marked[marked.length - 1])}, ${innerW + 30} ${midY(marked[marked.length - 1])}`}
                fill="none"
                stroke={colors.accent}
                strokeWidth={stroke.accent}
                strokeLinecap="round"
                opacity={markT}
              />
            ) : null}
          </svg>
        </div>
        {stamp ? (
          <div
            style={{
              position: "absolute",
              right: 60,
              top: 36,
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: `${stroke.accent}px double ${colors.bg}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...text.documentTitle,
              fontSize: 46,
              color: colors.bg,
              opacity: 0.75 * stampT,
              transform: `rotate(-14deg) scale(${1.4 - 0.4 * stampT})`,
            }}
          >
            {stamp}
          </div>
        ) : null}
      </div>
      {note ? (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            width: "100%",
            textAlign: "center",
            ...text.eyebrow,
            color: colors.text,
            opacity: opacity.textMuted * tail,
            textTransform: "uppercase",
          }}
        >
          {note}
        </div>
      ) : null}
      <Vignette strength={0.4} />
      <Grain />
    </AbsoluteFill>
  );
};
