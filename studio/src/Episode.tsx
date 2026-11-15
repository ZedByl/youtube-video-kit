import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Mix } from "./audio/Mix";
import { ArchivePhoto } from "./scenes/ArchivePhoto";
import { BigDate } from "./scenes/BigDate";
import { Callout } from "./scenes/Callout";
import { Checklist } from "./scenes/Checklist";
import { DocumentScene } from "./scenes/DocumentScene";
import { DotGrid } from "./scenes/DotGrid";
import { MapScene } from "./scenes/MapScene";
import { NameGrid } from "./scenes/NameGrid";
import { Network } from "./scenes/Network";
import { Placeholder } from "./scenes/Placeholder";
import { PriceRange } from "./scenes/PriceRange";
import { Quote } from "./scenes/Quote";
import { SpeakerTag } from "./scenes/SpeakerTag";
import { Split } from "./scenes/Split";
import { StatCounter } from "./scenes/StatCounter";
import { Subscribe } from "./scenes/Subscribe";
import { Terminal } from "./scenes/Terminal";
import { TimelineScene } from "./scenes/TimelineScene";
import { TitleCard } from "./scenes/TitleCard";
import { VideoClip } from "./scenes/VideoClip";
import { YearStrip } from "./scenes/YearStrip";
import { colors } from "./theme";
import type { Asset, SceneSpec, Timeline, Transition } from "./types";

// Новая сцена: компонент в src/scenes/, тип в src/types.ts → SceneSpec, case здесь, лимиты текста в scripts/check.ts, строка в SCENES.md
export const renderScene = (s: SceneSpec, assets: Record<string, Asset>, base: string) => {
  switch (s.type) {
    case "black":
      return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
    case "archivePhoto":
      return <ArchivePhoto asset={assets[s.asset]} base={base} move={s.move} caption={s.caption} tone={s.tone} fit={s.fit} />;
    case "split":
      return <Split left={s.left} right={s.right} assets={assets} base={base} />;
    case "bigDate":
      return <BigDate text={s.text} sub={s.sub} morphTo={s.morphTo} morphAt={s.morphAt} />;
    case "map":
      return <MapScene view={s.view} points={s.points} routes={s.routes} highlight={s.highlight} active={s.active} meridian={s.meridian} sweep={s.sweep} ring={s.ring} />;
    case "timeline":
      return <TimelineScene title={s.title} items={s.items} />;
    case "stat":
      return <StatCounter {...s} />;
    case "videoClip":
      return <VideoClip asset={assets[s.asset]} base={base} trimBefore={s.trimBefore} playbackRate={s.playbackRate} zoom={s.zoom} caption={s.caption} />;
    case "titleCard":
      return <TitleCard subtitle={s.subtitle} />;
    case "yearStrip":
      return <YearStrip year={s.year} title={s.title} marks={s.marks} active={s.active} />;
    case "network":
      return <Network title={s.title} nodes={s.nodes} links={s.links} shown={s.shown} />;
    case "dotGrid":
      return <DotGrid total={s.total} keep={s.keep} highlight={s.highlight} label={s.label} fromLabel={s.fromLabel} toLabel={s.toLabel} />;
    case "quote":
      return <Quote text={s.text} author={s.author} note={s.note} style={s.style} />;
    case "terminal":
      return <Terminal title={s.title} lines={s.lines} />;
    case "callout":
      return <Callout asset={assets[s.asset]} base={base} box={s.box} label={s.label} caption={s.caption} tone={s.tone} />;
    case "checklist":
      return <Checklist title={s.title} items={s.items} mark={s.mark} note={s.note} />;
    case "nameGrid":
      return <NameGrid title={s.title} names={s.names} highlight={s.highlight} note={s.note} />;
    case "priceRange":
      return <PriceRange title={s.title} items={s.items} unit={s.unit} note={s.note} shown={s.shown} />;
    case "document":
      return <DocumentScene title={s.title} fields={s.fields} stamp={s.stamp} note={s.note} />;
    case "placeholder":
      return <Placeholder label={s.label} note={s.note} mood={s.mood} />;
  }
};

// Вход сцены: fade — наплыв поверх предыдущей, dip — из чёрного, cut — склейка
const Enter: React.FC<{ transition: Transition; frames: number; children: React.ReactNode }> = ({ transition, frames, children }) => {
  const frame = useCurrentFrame();
  if (transition === "cut") return <AbsoluteFill>{children}</AbsoluteFill>;
  const opacity = interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (transition === "dip") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Episode: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const base = `episodes/${timeline.id}`;
  const tf = timeline.transitionFrames;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      {timeline.scenes.map((s, i) => {
        const next = timeline.scenes[i + 1];
        // сцена остаётся под следующей, пока та проявляется
        const tail = next && (next.transition ?? "fade") === "fade" ? tf : 0;
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.duration + tail} name={`${s.id} · ${s.type}`}>
            <Enter transition={i === 0 ? "dip" : (s.transition ?? "fade")} frames={tf}>
              {renderScene(s, timeline.assets, base)}
            </Enter>
          </Sequence>
        );
      })}
      {timeline.overlays.map((o) => (
        <Sequence key={o.id} from={o.from} durationInFrames={o.durationInFrames} name={`${o.id} · ${o.type}`}>
          {o.type === "speakerTag" ? <SpeakerTag speaker={o.speaker} role={o.role} /> : <Subscribe {...o} />}
        </Sequence>
      ))}
      <Mix timeline={timeline} />
    </AbsoluteFill>
  );
};
