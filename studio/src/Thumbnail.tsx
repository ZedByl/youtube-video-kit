import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Grain, Vignette } from "./scenes/common";
import { colors, fonts, text } from "./theme";

// Шаблон превью 1280×720: фото, одна цифра, короткая строка. Варианты A/B/C — разные props (episodes/NNN/thumbnails.json); scale(1.04) срезает кромки сканов
// С right — две половины «тогда ↔ сейчас»: слева архив в сепии, справа цвет, между ними акцентная линия
type Photo = { image: string; position?: string; label?: string };
export type ThumbnailProps = { image: string; position?: string; label?: string; right?: Photo; year?: string; line: string };

const OLD = "sepia(0.5) contrast(1.15) brightness(0.8)";
const SHADE = `${colors.bg}d9`; // фон с прозрачностью 85 % — затемнение под текстом

const Label: React.FC<{ children: string; x: number }> = ({ children, x }) => (
  <div style={{ ...text.eyebrow, position: "absolute", left: x, top: 44, fontSize: 26, letterSpacing: 8, textTransform: "uppercase", color: colors.text, backgroundColor: SHADE, padding: "8px 8px 8px 16px" }}>{children}</div>
);

export const Thumbnail: React.FC<ThumbnailProps> = ({ image, position, label, right, year, line }) => (
  <AbsoluteFill style={{ backgroundColor: colors.bg }}>
    {right ? (
      <>
        <Img src={staticFile(image)} style={{ position: "absolute", left: 0, top: 0, width: 640, height: 720, objectFit: "cover", objectPosition: position, filter: `${OLD} brightness(0.85)` }} />
        <Img src={staticFile(right.image)} style={{ position: "absolute", left: 640, top: 0, width: 640, height: 720, objectFit: "cover", objectPosition: right.position, filter: "contrast(1.08) saturate(1.1)" }} />
        <AbsoluteFill style={{ background: `linear-gradient(0deg, ${colors.bg} 0%, ${SHADE} 30%, ${colors.bg}00 62%)` }} />
        <div style={{ position: "absolute", left: 637, top: 0, width: 6, height: 720, backgroundColor: colors.accent }} />
        {label && <Label x={56}>{label}</Label>}
        {right.label && <Label x={696}>{right.label}</Label>}
      </>
    ) : (
      <>
        <Img src={staticFile(image)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position, filter: "contrast(1.05) brightness(0.9)", transform: "scale(1.04)" }} />
        <AbsoluteFill style={{ background: `linear-gradient(90deg, ${colors.bg} 0%, ${SHADE} 38%, ${colors.bg}00 70%)` }} />
      </>
    )}
    <Vignette strength={0.5} />
    <Grain />
    <div style={right ? { position: "absolute", left: 56, right: 56, bottom: 52 } : { position: "absolute", left: 64, top: 120 }}>
      {year && <div style={{ fontFamily: fonts.serif, fontSize: right ? 190 : 230, lineHeight: 1, color: colors.accent, textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>{year}</div>}
      <div style={{ fontFamily: fonts.serif, fontSize: right ? 72 : 64, color: colors.text, maxWidth: right ? 1168 : 560, lineHeight: 1.1, marginTop: 10, textShadow: "0 3px 18px rgba(0,0,0,0.7)" }}>{line}</div>
    </div>
    {!right && <div style={{ position: "absolute", left: 64, bottom: 40, width: 120, height: 6, backgroundColor: colors.accent }} />}
  </AbsoluteFill>
);
