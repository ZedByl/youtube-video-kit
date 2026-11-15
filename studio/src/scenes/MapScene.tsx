import React, { useMemo } from "react";
import { geoCircle, geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import geo from "../data/geo-europe.json";
import { channel, colors, fonts } from "../theme";
import type { MapMeridian, MapPoint, MapRing, MapRoute, MapSweep, MapView } from "../types";
import { Grain, useSceneProgress, Vignette } from "./common";

// Natural Earth (public domain): Европа 1:10m, остальной мир 1:50m — для дальних планов
const data = geo as unknown as { countries: FeatureCollection; states: FeatureCollection; rivers: FeatureCollection };

// active — страны (ADM0_A3) светлой заливкой; meridian — прямая долготы, прорисовывается сверху вниз за первые 40 % сцены.
// Точка с from (из at) появляется в этот кадр, иначе — по очереди с 0,5 с.
// sweep — полуденная линия бежит с fromLon на toLon (from→to кадры, по умолчанию 0,6 с → 80 % сцены): за ней акцентная полоса,
// счётчик «+N Min.» (4 мин на градус), точки, через которые она прошла, вспыхивают и становятся акцентными.
// ring — радиус приёма: с from (из at, иначе 0,6 с) круг km вокруг coord раскрывается за 1,5 с, от центра бегут волны, у верхнего края — label.
// Маршрут со startFrame (из at) рисуется с этого кадра, иначе по очереди с 0,8 с
export const MapScene: React.FC<{
  view: MapView;
  points: MapPoint[];
  routes?: MapRoute[];
  highlight?: string[];
  active?: string[];
  meridian?: MapMeridian;
  sweep?: MapSweep;
  ring?: MapRing;
}> = ({ view, points, routes = [], highlight = [], active = [], meridian, sweep, ring }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const p = useSceneProgress(Easing.inOut(Easing.cubic));

  const center: [number, number] = view.toCenter
    ? [interpolate(p, [0, 1], [view.center[0], view.toCenter[0]]), interpolate(p, [0, 1], [view.center[1], view.toCenter[1]])]
    : view.center;
  const scale = view.toScale ? Math.exp(interpolate(p, [0, 1], [Math.log(view.scale), Math.log(view.toScale)])) : view.scale;

  const projection = useMemo(
    () => geoMercator().center(center).scale(scale).translate([width / 2, height / 2]),
    [center[0], center[1], scale, width, height],
  );
  const path = geoPath(projection);
  const appear = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const { durationInFrames } = useVideoConfig();
  const mTop = meridian ? projection([meridian.lon, 72])! : [0, 0];
  const mBot = meridian ? projection([meridian.lon, 30])! : [0, 0];
  const mDraw = interpolate(frame, [fps * 0.4, Math.max(fps * 0.4 + 1, durationInFrames * 0.4)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const swK = sweep
    ? interpolate(frame, [sweep.from ?? fps * 0.6, Math.max((sweep.from ?? fps * 0.6) + 1, sweep.to ?? durationInFrames * 0.8)], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.sin),
      })
    : 0;
  const swLon = sweep ? sweep.fromLon + (sweep.toLon - sweep.fromLon) * swK : 0;
  const swIn = sweep ? interpolate(frame, [(sweep.from ?? fps * 0.6) - 12, sweep.from ?? fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const swTop = sweep ? projection([swLon, 72])! : [0, 0];
  const swBot = sweep ? projection([swLon, 30])! : [0, 0];
  const swStartTop = sweep ? projection([sweep.fromLon, 72])! : [0, 0];
  const swStartBot = sweep ? projection([sweep.fromLon, 30])! : [0, 0];
  const swMinutes = sweep ? Math.round(Math.abs(sweep.fromLon - swLon) * 4) : 0;
  const swDir = sweep ? Math.sign(sweep.fromLon - sweep.toLon) : 0; // 1 — линия идёт на запад
  // точка пройдена, если линия уже миновала её долготу
  const crossed = (lon: number) =>
    sweep !== undefined && swK > 0 && (lon - swLon) * swDir >= 0 && (lon - sweep.fromLon) * swDir <= 0;

  const rFrom = ring ? ring.from ?? fps * 0.6 : 0;
  const rK = ring ? interpolate(frame, [rFrom, rFrom + fps * 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 0;
  const rDeg = ring ? ring.km / 111.2 : 0;
  const rTop = ring ? projection([ring.coord[0], ring.coord[1] + rDeg])! : [0, 0];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      <svg width={width} height={height} style={{ opacity: appear }}>
        {data.countries.features.map((f, i) => (
          <path
            key={`c${i}`}
            d={path(f) ?? ""}
            fill={active.includes(f.properties?.ADM0_A3) ? colors.landActive : colors.land}
            stroke={colors.border}
            strokeWidth={1.2}
          />
        ))}
        {data.states.features.map((f, i) => {
          const on = highlight.includes(f.properties?.name);
          return (
            <path
              key={`s${i}`}
              d={path(f) ?? ""}
              fill={on ? colors.landHighlight : "none"}
              stroke={on ? colors.accent : colors.border}
              strokeWidth={on ? 2.5 : 0.8}
              strokeDasharray={on ? undefined : "4 4"}
            />
          );
        })}
        {data.rivers.features.map((f, i) => (
          <path key={`r${i}`} d={path(f) ?? ""} fill="none" stroke={colors.water} strokeWidth={2.2} />
        ))}
        {meridian ? (
          <line x1={mTop[0]} y1={mTop[1]} x2={mBot[0]} y2={mTop[1] + (mBot[1] - mTop[1]) * mDraw} stroke={colors.accent} strokeWidth={3} strokeDasharray="14 10" opacity={0.9} />
        ) : null}
        {sweep ? (
          <g opacity={swIn}>
            <polygon
              points={`${swStartTop[0]},${swStartTop[1]} ${swTop[0]},${swTop[1]} ${swBot[0]},${swBot[1]} ${swStartBot[0]},${swStartBot[1]}`}
              fill={colors.accent}
              opacity={0.13}
            />
            <line x1={swStartTop[0]} y1={swStartTop[1]} x2={swStartBot[0]} y2={swStartBot[1]} stroke={colors.accent} strokeWidth={2} strokeDasharray="6 10" opacity={0.6} />
            <line x1={swTop[0]} y1={swTop[1]} x2={swBot[0]} y2={swBot[1]} stroke={colors.accent} strokeWidth={14} opacity={0.18} />
            <line x1={swTop[0]} y1={swTop[1]} x2={swBot[0]} y2={swBot[1]} stroke={colors.accent} strokeWidth={4} />
          </g>
        ) : null}
        {ring && rK > 0 ? (
          <g>
            <path d={path(geoCircle().center(ring.coord).radius(Math.max(0.01, rDeg * rK))()) ?? ""} fill={colors.accent} fillOpacity={0.1} stroke={colors.accent} strokeWidth={3} strokeDasharray="12 9" />
            {[0, 1, 2].map((k) => {
              const w = ((frame - rFrom) / (fps * 1.8) + k / 3) % 1;
              return (
                <path key={k} d={path(geoCircle().center(ring.coord).radius(Math.max(0.01, rDeg * rK * w))()) ?? ""} fill="none" stroke={colors.text} strokeWidth={2} opacity={(1 - w) * 0.5} />
              );
            })}
          </g>
        ) : null}
        {routes.map((r, i) => {
          const a = projection(r.from)!;
          const b = projection(r.to)!;
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.25;
          const d = `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
          const r0 = r.startFrame ?? fps * (0.8 + i * 0.4);
          const draw = interpolate(frame, [r0, r0 + fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
          return <path key={`rt${i}`} d={d} fill="none" stroke={colors.accent} strokeWidth={3} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />;
        })}
        {points.map((pt, i) => {
          const [x, y] = projection(pt.coord)!;
          const t0 = pt.from ?? fps * (0.5 + i * 0.35);
          const s = interpolate(frame, [t0, t0 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
          const pulse = pt.primary ? ((frame - t0) % (fps * 1.6)) / (fps * 1.6) : 0;
          const side = pt.labelSide ?? "right";
          const dx = side === "left" ? -22 : side === "right" ? 22 : 0;
          const dy = side === "top" ? -26 : side === "bottom" ? 44 : 10;
          // при наезде второстепенные точки проявляются ближе к концу, чтобы подписи не слипались на общем плане
          const secondary = !pt.primary && pt.from === undefined && view.toScale ? interpolate(p, [0.45, 0.75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          const hit = crossed(pt.coord[0]);
          // вспышка: кольцо расходится, пока линия отходит от точки на 0–90 px
          const away = hit ? interpolate(Math.abs(x - swTop[0]), [0, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          const lit = pt.primary || hit;
          return (
            <g key={`p${i}`} opacity={s * secondary}>
              {pt.primary && frame > t0 ? (
                <circle cx={x} cy={y} r={10 + pulse * 40} fill="none" stroke={colors.accent} strokeWidth={2} opacity={1 - pulse} />
              ) : null}
              {hit && away < 1 ? <circle cx={x} cy={y} r={12 + away * 46} fill="none" stroke={colors.accent} strokeWidth={4} opacity={1 - away} /> : null}
              <circle cx={x} cy={y} r={(pt.primary ? 10 : hit ? 9 : 7) * s} fill={lit ? colors.accent : colors.text} />
              <text
                x={x + dx}
                y={y + dy}
                textAnchor={side === "left" ? "end" : side === "right" ? "start" : "middle"}
                fontFamily={pt.primary ? fonts.serif : fonts.sans}
                fontSize={pt.primary ? 46 : 30}
                fill={lit ? colors.accent : colors.text}
                style={{ paintOrder: "stroke", stroke: colors.bgDeep, strokeWidth: 6 }}
              >
                {pt.name}
              </text>
            </g>
          );
        })}
      </svg>
      {meridian?.label ? (
        <div
          style={{
            position: "absolute",
            left: mTop[0] + 18,
            top: 110,
            fontFamily: fonts.serif,
            fontSize: 44,
            color: colors.accent,
            opacity: interpolate(mDraw, [0.15, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            textShadow: `0 0 12px ${colors.bgDeep}`,
          }}
        >
          {meridian.label}
        </div>
      ) : null}
      {ring?.label ? (
        <div
          style={{
            position: "absolute",
            left: rTop[0] - 200,
            width: 400,
            top: rTop[1] - 62,
            textAlign: "center",
            fontFamily: fonts.serif,
            fontSize: 44,
            color: colors.accent,
            opacity: interpolate(rK, [0.6, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            textShadow: `0 0 12px ${colors.bgDeep}, 0 0 4px ${colors.bgDeep}`,
          }}
        >
          {ring.label}
        </div>
      ) : null}
      {sweep ? (
        <div
          style={{
            position: "absolute",
            left: swTop[0] + 22,
            top: 64,
            opacity: swIn,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 14px ${colors.bgDeep}, 0 0 4px ${colors.bgDeep}`,
          }}
        >
          <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: colors.text }}>{sweep.label ?? ""}</div>
          {sweep.minutes ? (
            <div style={{ fontFamily: fonts.serif, fontSize: 72, lineHeight: 1.05, color: colors.accent, opacity: swK > 0 ? 1 : 0 }}>+{swMinutes} min</div>
          ) : null}
        </div>
      ) : null}
      <Vignette strength={0.55} />
      <Grain />
      <div style={{ position: "absolute", right: 48, bottom: 32, fontFamily: fonts.sans, fontSize: 16, color: colors.text, opacity: 0.45 }}>
        {channel.labels.mapCredit}
      </div>
    </AbsoluteFill>
  );
};
