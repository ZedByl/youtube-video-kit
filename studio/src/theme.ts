import type { CSSProperties } from "react";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import tokens from "../../design-system/tokens.json";
import channelConfig from "../channel.json";

// Все значения — из дизайн-системы (design-system/tokens.json). Здесь только перевод токенов в удобный для сцен вид;
// новые цвета и стили добавлять в tokens.json, а не числом в сцене. Шрифты меняются здесь (любой из @remotion/google-fonts)

// Настройки канала: имя для заставки, язык озвучки и субтитров, тексты плашки подписки (studio/channel.json)
export const channel = channelConfig;

const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
const byName = (list: { name: string; value: string }[]) =>
  Object.fromEntries(list.map((t) => [camel(t.name), t.value]));
const px = (v: string) => parseFloat(v);

type ColorName =
  | "bg" | "bgDeep" | "surface" | "glow" | "accent" | "accentDim" | "text" | "ink" | "alert"
  | "land" | "landActive" | "landHighlight" | "border" | "water";
export const colors = byName(tokens.color.tokens) as Record<ColorName, string>;

const subsets = ["latin", "latin-ext", "cyrillic"] as const;
export const fonts = {
  serif: loadLora("normal", { weights: ["400", "600", "700"], subsets: [...subsets] }).fontFamily,
  sans: loadInter("normal", { weights: ["400", "500", "600"], subsets: [...subsets] }).fontFamily,
  mono: loadJetBrainsMono("normal", { weights: ["400"], subsets: [...subsets] }).fontFamily,
};
loadLora("italic", { weights: ["400"], subsets: [...subsets] });

// Стили текста: text.caption, text.eyebrow, … — гарнитура, кегль, трекинг из tokens.json.
// Цвет, прозрачность и капс задаёт сцена
type StyleToken = { name: string; fontSize: string; fontWeight: number; lineHeight?: number; letterSpacing?: string; fontStyle?: string; family?: string };
export const text: Record<string, CSSProperties> = Object.fromEntries(
  tokens.type.groups.flatMap((g) =>
    (g.styles as StyleToken[]).map((s) => [
      camel(s.name),
      {
        fontFamily: fonts[(s.family ?? g.family) as keyof typeof fonts],
        fontSize: px(s.fontSize),
        fontWeight: s.fontWeight,
        ...(s.lineHeight ? { lineHeight: s.lineHeight } : {}),
        ...(s.letterSpacing ? { letterSpacing: px(s.letterSpacing) } : {}),
        ...(s.fontStyle ? { fontStyle: s.fontStyle as CSSProperties["fontStyle"] } : {}),
      },
    ]),
  ),
);

// Отступы, линии, прозрачности — числа в пикселях кадра; имена без префикса: space.frameInset, stroke.rule
const numbers = (list: { name: string; value: string }[], prefix: string) =>
  Object.fromEntries(list.map((t) => [camel(t.name.replace(prefix, "")), px(t.value)]));
export const space = numbers(tokens.spacing.tokens, "space-");
export const stroke = numbers(tokens.stroke.tokens, "stroke-");
export const opacity = numbers(tokens.opacity.tokens, "");
export const shadow = byName(tokens.shadow.tokens.map((t) => ({ ...t, name: t.name.replace("text-", "") })));

// Числа в кадре — в формате языка канала (1,000 / 1.000 / 1 000)
export const formatNumber = (n: number) => Math.round(n).toLocaleString(channel.locale);
