import React from "react";
import { Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { channel, colors, opacity as op, shadow, space, stroke, text } from "../theme";
import type { SubscribeProps } from "../types";

// Плашка подписки. Тексты по умолчанию — studio/channel.json → subscribe, в overlay их можно переопределить.
// mid: колокольчик и две строки, ~5 с; end: + кнопка, которая сама заливается акцентным цветом, ~8 с.
// Плашка вырастает из акцентной линии, колокольчик качается: затухающее колебание ±11°, три полупериода.
// Звук — часть плашки, поэтому всегда совпадает с анимацией: удар колокольчика на качании, у end ещё щелчок кнопки на нажатии (scripts/cta-sfx.ts)

const DEFAULTS = {
  mid: { ...channel.subscribe.mid, width: 640, height: 104, press: 0, bell: 40 },
  end: { ...channel.subscribe.end, width: 820, height: 132, press: 70, bell: 100 },
};

const SWING = 40; // кадров на колебание
const SOUND = { bell: { src: "fx/cta-bell.wav", frames: 54 }, click: { src: "fx/cta-click.wav", frames: 8 } };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sine = Easing.inOut(Easing.sin);
const cubic = Easing.inOut(Easing.cubic);

// угол колокольчика: удар → три полупериода с затуханием
const swing = (f: number) => {
  if (f <= 0 || f >= SWING) return 0;
  const p = f / SWING;
  return 11 * Math.pow(1 - p, 1.3) * Math.sin(3 * Math.PI * p);
};

// контур колокольчика из примитивов знака: кольцо-ось, купол, кромка, язычок; viewBox 48×56, ось качания — центр кольца (24, 6)
const Bell: React.FC<{ size: number; angle: number }> = ({ size, angle }) => {
  const k = size / 48;
  const line = { stroke: colors.accent, strokeWidth: stroke.hairline, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg
      width={size}
      height={56 * k}
      viewBox="0 0 48 56"
      fill="none"
      style={{ display: "block", flex: "none", overflow: "visible", transform: `rotate(${angle}deg)`, transformOrigin: `${24 * k}px ${6 * k}px` }}
    >
      <circle cx="24" cy="6" r="4" {...line} />
      <circle cx="24" cy="6" r="1.3" fill={colors.accent} />
      <path d="M24 10V14" {...line} />
      <path d="M11 42C13 39 13 36 13 30C13 21 17.9 14 24 14C30.1 14 35 21 35 30C35 36 35 39 37 42" {...line} />
      <path d="M8 42H40" {...line} />
      <circle cx="24" cy="48.5" r="2.5" fill={colors.accent} />
    </svg>
  );
};

export const Subscribe: React.FC<SubscribeProps & { pressFrom?: number; bellFrom?: number }> = ({
  variant,
  line1,
  line2,
  button = channel.subscribe.button,
  buttonDone = channel.subscribe.buttonDone,
  panel = "bg",
  sound = 1,
  pressFrom,
  bellFrom,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const d = DEFAULTS[variant];
  const end = variant === "end";
  const press = pressFrom ?? d.press;
  const bell = bellFrom ?? d.bell;
  const ground = panel === "deep" ? colors.bgDeep : colors.bg;

  const rule = interpolate(frame, [0, end ? 20 : 18], [0, 1], { ...clamp, easing: sine });
  const lines = interpolate(frame, end ? [12, 36] : [10, 30], [0, 1], { ...clamp, easing: cubic });
  const bellIn = interpolate(frame, end ? [12, 30] : [24, 36], [0, 1], { ...clamp, easing: sine });
  const buttonIn = interpolate(frame, [30, 48], [0, 1], { ...clamp, easing: sine });
  const fill = interpolate(frame, [press, press + 30], [0, 1], { ...clamp, easing: sine });
  const dot = interpolate(frame, [bell + 8, bell + 20], [0, 1], { ...clamp, easing: sine });
  const out = interpolate(frame, [durationInFrames - (end ? 18 : 15), durationInFrames], [1, 0], clamp);
  const shade = panel === "none" ? shadow.caption : undefined;

  const label: React.CSSProperties = { ...text.ctaButton, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 4, textTransform: "uppercase" };

  return (
    <div
      style={{
        position: "absolute",
        left: space.frameInset,
        bottom: space.speakerBottom,
        height: d.height,
        maxWidth: d.width,
        boxSizing: "border-box",
        padding: end ? "0 24px" : "0 32px 0 24px",
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: out,
      }}
    >
      {panel !== "none" ? <div style={{ position: "absolute", inset: 0, backgroundColor: ground, opacity: op.ctaPanel * lines }} /> : null}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: stroke.hairline, width: `${rule * 100}%`, backgroundColor: colors.accent }} />

      <div style={{ position: "relative", flex: "none", opacity: bellIn, filter: shade ? "drop-shadow(0 2px 8px rgba(0,0,0,0.7))" : undefined }}>
        <Bell size={end ? 48 : 44} angle={swing(frame - bell)} />
        {end ? (
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: "absolute", top: 6, right: -10, display: "block", opacity: dot, transform: `scale(${0.6 + 0.4 * dot})` }}>
            <circle cx="7" cy="7" r="6" fill={ground} stroke={colors.accent} strokeWidth={stroke.hairline} />
            <circle cx="7" cy="7" r="2.5" fill={colors.accent} />
          </svg>
        ) : null}
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: end ? 10 : 8, opacity: lines, transform: `translateY(${(1 - lines) * 10}px)`, textShadow: shade }}>
        <div style={{ ...(end ? text.ctaTitle : text.caption), lineHeight: end ? "40px" : "38px", color: colors.text, whiteSpace: "nowrap" }}>{line1 ?? d.line1}</div>
        <div
          style={{
            ...(end ? { ...text.ctaButton, fontWeight: 500 } : text.ctaSub),
            lineHeight: end ? "20px" : "22px",
            color: colors.accent,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {line2 ?? d.line2}
        </div>
      </div>

      {sound > 0 ? (
        <Sequence from={bell} durationInFrames={SOUND.bell.frames} layout="none" name="♪ cta-bell">
          <Audio src={staticFile(SOUND.bell.src)} volume={sound} />
        </Sequence>
      ) : null}
      {end && sound > 0 ? (
        <Sequence from={press} durationInFrames={SOUND.click.frames} layout="none" name="♪ cta-click">
          <Audio src={staticFile(SOUND.click.src)} volume={sound} />
        </Sequence>
      ) : null}

      {end ? (
        <div
          style={{
            position: "relative",
            flex: "none",
            width: 180,
            height: 52,
            marginLeft: 4,
            boxSizing: "border-box",
            border: `${stroke.hairline}px solid ${colors.accent}`,
            opacity: buttonIn,
          }}
        >
          <div style={{ ...label, position: "absolute", inset: 0, color: colors.accent }}>{button}</div>
          {/* акцентный цвет заливает кнопку слева направо; текст под ней — цвет фона, на полной заливке меняется на buttonDone */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, overflow: "hidden", backgroundColor: colors.accent }}>
            <div style={{ ...label, width: 176, height: 48, color: ground }}>{fill >= 1 ? buttonDone : button}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
